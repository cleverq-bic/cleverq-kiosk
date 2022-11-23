const path = require('path')
const { app, globalShortcut, powerSaveBlocker, ipcMain } = require('electron')
const id = powerSaveBlocker.start('prevent-display-sleep')
const MainWindow = require('./windows/MainWindow')
const SmallWindow = require('./windows/SmallWindow')
const Settings = require('./store/Settings')
const { sendStatusToWindow, portrait, landscape, turn_on_monitor, turn_off_monitor, restart_kiosk } = require('./helpers/index')
const { connect } = require('./connection')
const https = require('https')
const axios = require('axios-https-proxy-fix')
const ElectronOnline = require('electron-online')
const connection = new ElectronOnline()
const isDev = require('electron-is-dev')

// Ignore insecure https on localhost
app.commandLine.appendSwitch('ignore-certificate-errors', 'true')
app.commandLine.appendSwitch('allow-insecure-localhost', 'true')
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

let mainWindow = null
let setupWindow = null
let updateWindow = null
let display_on = false
let initial_start = true

// Disables security warning in developer console
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = true

// Creates a store
const settings = new Settings({ name: 'settings '})

// Axios polling instance

let proxy_enabled = settings.get('storedSettings.proxy_ip') && settings.get('storedSettings.proxy_ip').length ? true : false
let options = null

if (proxy_enabled) {
  options = {
    proxy: {
      host: settings.get('storedSettings.proxy_ip'),
      port: settings.get('storedSettings.proxy_port')
    }
  }
} else {
  options = null
}

const instance = axios.create({
  baseURL: `${settings.get('storedSettings.ssl') ? 'https://' : 'http://'}${settings.get('storedSettings.url')}/api/external/v2/sites`,
  timeout: 3000,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
    }),

  options,
  'Content-Type': 'application/json'
})

const update_instance = axios.create({
  baseURL: `${settings.get('storedSettings.ssl') ? 'https://' : 'http://'}${settings.get('storedSettings.url')}/api/kiosk/sites`,
  timeout: 3000,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  }),
  options,
  headers: {
    "Authorization": `Bearer token=${settings.get('storedSettings.token')}`,
  },
  'Content-Type': 'application/json'
})

const createMainWindow = (content) => {
  mainWindow = new MainWindow({
    height: 1024,
    width: 768,
    file: content
  })
}

app.on('ready', () => {
  auto_updater().then((result) => {
    if (result.status === 'no-update') {
      createMainWindow(path.join('src/renderer', 'loadingscreen.html'))
      if (settings.get('storedSettings.alignment') === 'portrait') {
        portrait()
      } else {
        landscape()
      }

      // Events
      mainWindow.on('closed', () => {
        mainWindow = null
      })

      // Keyboard shortcuts
      globalShortcut.register('CommandOrControl+W', () => {
        app.quit()
      })

      globalShortcut.register('CommandOrControl+P', () => {
        auto_updater()
      })

      globalShortcut.register('CommandOrControl+D', () => {
        // Open developer console
        mainWindow.webContents.openDevTools();
      })

      globalShortcut.register('CommandOrControl+F', () => {
        // Open developer console
        mainWindow.loadURL(settings.get('storedSettings.arrived_url'));
      })

      globalShortcut.register('CommandOrControl+U', () => {
        if (!setupWindow) {
          setupWindow = new SmallWindow({
            height: 349,
            width: 400,
            file: path.join('src/renderer', 'setup.html')
          })

          setTimeout(() => {
            setupWindow.webContents.send('load-settings', settings.storedSettings)
          }, 1000);
        }
      })
    
      // Events from renderer process
      ipcMain.on('loading-done', () => {
        update_status_handler(3)
        let no_load_required = false
        if (settings.get('storedSettings.arrived_url')) {
          no_load_required = true
          const pathArray = settings.get('storedSettings.arrived_url').split('/');
          setInterval(() => {
            poll_monitor_status(pathArray[5])
          }, 60000);
        } else {
          mainWindow.loadFile(path.join('src/renderer', 'initial.html'))
          setTimeout(() => {
            mainWindow.webContents.send('load-settings', settings.storedSettings)
          }, 1000);
        }
        connect(app, mainWindow, no_load_required)
      })

      mainWindow.webContents.on("did-fail-load", () => {
        console.log("did-fail-load");
      });
    
      ipcMain.on('save-settings', (e, formData) => {
        //const saveSettings = settings.saveSettings(formData).settings
        settings.saveSettings(formData)
        //setupWindow.send('settings', saveSettings)
        
        // Starts the kiosk on save.
        app.relaunch()
        app.quit()
        
        // Hides the setup window.
        // setupWindow.close()
      })
    } else {
      if (result.status === 'error') {
        sendStatusToWindow('Failed to update kiosk...')
      }
    }
  })
})

app.on('window-all-closed', () => {
  // workaround for osx platform
  powerSaveBlocker.stop(id)
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // workaround for osx platform
  if (mainWindow === null) {
    createMainWindow()
  }
})

const auto_updater = () => {
  return new Promise((resolve) => {
    const updater = require("electron-updater")
    const autoUpdater = updater.autoUpdater

    // Update logging
    autoUpdater.logger = require('electron-log')
    autoUpdater.logger.transports.file.level = 'info'

    if (!isDev) {
      autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'marcok81',
        repo: 'cleverq-kiosk-update-test',
        token: "4051b919add798a1c8a1a88c4b88f4da6b9668bb"
      })

      autoUpdater.autoDownload = true

      autoUpdater.on('checking-for-update', function (info) {
        sendStatusToWindow('Checking for update...')
      })

      autoUpdater.on('update-available', function (info) {
        // Creates the update window
        console.log('Version: ', info.version)
        console.log('Release date: ', info.releaseDate)

        sendStatusToWindow('An update is available...')
        updateWindow = new SmallWindow({
          height: 140,
          width: 400,
          file: path.join('src/renderer', 'update.html'),
        })
        update_status_handler(1)
        resolve({status: 'update'})
      })

      autoUpdater.on('update-not-available', function (info) {
        sendStatusToWindow('The kiosk is already at the newest version...')
        resolve({status: 'no-update'})
      })

      autoUpdater.on('error', function (err) {
        update_status_handler(0)
        resolve({status: 'error'})
      })

      autoUpdater.on('download-progress', function (progressObj) {
        let log_message = "Download speed: " + progressObj.bytesPerSecond;
        log_message = log_message + ' - Downloaded ' + parseInt(progressObj.percent) + '%'
        console.log(log_message)
        log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')'
        updateWindow.webContents.send('download-progress-percent', parseInt(progressObj.percent))
        updateWindow.webContents.send('download-speed', parseInt(progressObj.bytesPerSecond / 1000) + ' kb/s')
      });

      autoUpdater.on('update-downloaded', function (info) {
        // sendStatusToWindow('Update downloaded; will install in 5 seconds')
        update_status_handler(2)
        setTimeout(function () {
          autoUpdater.quitAndInstall()
        }, 10000)
      })

      connection.on('online', () => {
        if (initial_start) {
          sendStatusToWindow('Online...')
          if (!isDev) {
            autoUpdater.checkForUpdates()
          }
          initial_start = false
        }
      })

      connection.on('offline', () => {
        if (initial_start) {
          sendStatusToWindow('Offline...')
          setTimeout(() => {
            resolve({status: 'no-update'})
            initial_start = false
          }, 30000)
        }
      })
    } else {
      resolve({status: 'no-update'})
    }
  })
}

const poll_monitor_status = (site_id) => {
  instance.get(`/${site_id}/monitor_status`).then((response) => {
    if (response.data.display_on === true) {
      if (process.platform === 'linux') {
        if (display_on === false) {
          display_on = true
          turn_on_monitor()
        }
      } else {
        if (display_on === false) {
          display_on = true
          mainWindow.loadURL(settings.get('storedSettings.arrived_url'))
        }
      }
    } else {
      if (process.platform === 'linux') {
        if (display_on === true) {
          display_on = false
          turn_off_monitor()
        }   
      } else {
        if (display_on === true) {
          display_on = false
          mainWindow.loadFile(path.join('src/renderer', 'blackscreen.html'))
        }
      }
    }
  }).catch((error) => {
    console.log(error)
  })
}

const update_status_handler = (update_status) => {
  if (settings.get('storedSettings.arrived_url') && settings.get('storedSettings.arrived_url').length) {
    const pathArray = settings.get('storedSettings.arrived_url').split('/');
    update_instance.post(`/${pathArray[5]}/kiosks/${settings.get('storedSettings.kiosk_id')}/update_status`,{
      update_status: update_status,
      version: app.getVersion()
    }).then((response) => {
      console.log('Updated status.')
    }).catch((error) => {
      console.log(error)
    })
  }
}