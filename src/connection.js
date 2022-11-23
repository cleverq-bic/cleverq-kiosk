const connect = (app, mainWindow, no_load_required) => {
  const path = require('path')
  const { ipcMain } = require('electron')
  const { URL } = require('url');
  const ActionCable = require('es6-actioncable')
  const WebSocket = require('ws')
  const tunnel = require("tunnel")
  const Settings = require('./store/Settings')
  const ErrorWindow = require('./windows/MainWindow')
  const { 
    read_and_safe_settings_json,
    notify, 
    restart_kiosk, 
    run_display,
    run_touchscreen,
    turn_off_monitor, 
    turn_on_monitor, 
    portrait, 
    landscape } = require('./helpers/index')

  // initial start
  let initialStart = true

  // Init error window
  let errorWindow = null
  
  // Creates a store
  const settings = new Settings({ name: 'settings '})

  let proxy_enabled = settings.get('storedSettings.proxy_ip') && settings.get('storedSettings.proxy_ip').length ? true : false

  const tunnelingAgent = tunnel.httpsOverHttp({
    proxy: {
      host: settings.get('storedSettings.proxy_ip'),
      port: settings.get('storedSettings.proxy_port')
    },
    rejectUnauthorized: false
  });

  // Proxy agent when using a proxy server
  const agent = proxy_enabled ? tunnelingAgent : null

  // Get the settings from the store
  const { url, token, ssl } = settings.getSettings().storedSettings

  const createErrorWindow = (content) => {
    errorWindow = new ErrorWindow({
      height: 1024,
      width: 768,
      file: content
    })
  }

  // Gets and sets serialnumbers from the device
  let hardware_id = null
  let serial_nr = null
  let revision = null

  if (process.platform === 'linux') {
    const piinfo = require('piinfo')
    hardware_id = piinfo.hardware();
    serial_nr = piinfo.serial();
    revision = piinfo.revision();
  } else {
    const node_id = require('node-machine-id')
    hardware_id = 'demo'
    serial_nr = node_id.machineIdSync({original: true})
    revision = 'osx'
  }

  const CABLE_URL = `${ssl === true ? 'wss' : 'ws'}://${url}/cable`
  const consumer = ActionCable.default.createConsumer(CABLE_URL, { createWebsocket: () => {
    return new WebSocket(CABLE_URL, ["actioncable-v1-json", "actioncable-unsupported"], {agent: agent})
  }})

  let reconnect_timer = null

  consumer.subscriptions.create(
    { 
      channel: 'KiosksChannel', 
      setup_token: '31lG1CLl_a1n5ozDmWBNUQ', 
      token: token, 
      name: serial_nr, 
      hardware_id: hardware_id, 
      serial_nr: serial_nr, 
      revision: revision
    }, 
    {
      connected: () => {
        console.log('The kiosk is successfully connected.')
        if (errorWindow) {
          errorWindow.destroy()
          errorWindow = null
        }
        // TODO need to check if this is working as intended
        if (((settings.get('storedSettings.arrived_url') && settings.get('storedSettings.arrived_url').length)) && initialStart) {
          mainWindow.loadURL(settings.get('storedSettings.arrived_url'))
        } else {
          //mainWindow.loadFile(path.join('src/renderer', 'initial.html'))
        }
        initialStart = false
      },
      disconnected: () => {
        console.log('The connection was disconnected.')
        clearInterval(reconnect_timer)
        reconnect_timer = setInterval(() => {
          if (consumer.connectionMonitor.reconnectAttempts > 4) {
            if (!errorWindow) {
              createErrorWindow(path.join('src/renderer', 'error.html'))
            }
          }
        }, 1000);     
      },
      rejected: () => {
        console.log('The connection was rejected, please check the token / url.')
      },
      sendAction: function(data) {
        this.perform('speak', data)
      },
      received: (data) => {
        console.log('mal gucken =========>', data)
        switch (data.notification) {
          case 'registered':
            settings.completeSetup(data.token)
            mainWindow.webContents.send('registered', true)
            notify('cleverQ Kiosk', 'Kiosk registered!', `Please complete the setup in the admin section.`)
            break
          case 'unregistered':
            settings.completeSetup('')
            setTimeout(() => {
              mainWindow.webContents.send('added_to_list', true)
            }, 2000);
            notify('cleverQ Kiosk', 'Kiosk unregistered!', `Please complete the setup in the admin section.`)
            break
          case 'send_url':
            if (data.alignment === 'portrait') {
              if (process.platform === 'linux') {
                portrait()
              } else {
                mainWindow.setSize(768, 1024)
              }
            } else {
              if (process.platform === 'linux') {
                landscape()
              } else {
                mainWindow.setSize(1920, 1080)
              }
            }
            if (data.kiosk_type === 'service_terminal' || data.kiosk_type === 'touchscreen') {
              let url_string = `${ssl === true ? 'https' : 'http'}://${url}/frontend${data.url}`
              let real_url = new URL(url_string)
              let username = real_url.searchParams.get('user_username')
              let usertoken = real_url.searchParams.get('user_token')
              read_and_safe_settings_json(process.platform === 'linux' ? path.join('/home/pi', 'settings.json') : path.join('src', 'settings.json'), url, username, usertoken, ssl )
                .then((result) => {
                  if (result === 'saved') {
                    console.log('New data saved.')
                    if (process.platform === 'linux') {
                      run_touchscreen()
                    }
                  } else if (result === 'no_change') {
                    console.log('No new data, nothing to save.')
                  }
                }).catch((error) => {
                  console.log(error.message + ': ' + error.data)
                })
            } else {
              if (process.platform === 'linux') {
                run_display()
              }
            }
            settings.saveArrivedUrl(`${ssl === true ? 'https' : 'http'}://${url}/frontend${data.url}`)
            settings.saveAlignment(data.alignment)
            settings.saveKioskId(data.kiosk_id)
            if (!no_load_required) {
              // TODO check if this is will fix the reboot problem
              //mainWindow.loadURL(settings.get('storedSettings.arrived_url'))
              mainWindow.loadURL(`${ssl === true ? 'https' : 'http'}://${url}/frontend${data.url}`)
            }
            break
          case 'added_to_list':
            setTimeout(() => {
              mainWindow.webContents.send('added_to_list', true)
            }, 2000);
            break
          case 'restart':
            mainWindow.webContents.send('setup_done', true)
            notify('cleverQ Kiosk', 'Kiosk restarting!', `The kiosk is restarting in 10 seconds.`)
            setTimeout(() => {
              if (process.platform === 'linux') {
                restart_kiosk()
              } else {
                app.relaunch()
                app.quit()
              }
            }, 10000);
            break
          case 'turn_off_monitor':
            if (process.platform === 'linux') {
              turn_off_monitor()
            } else {
              console.log('Monitor wäre dunkel.')
            }
            break
          case 'turn_on_monitor':
            if (process.platform === 'linux') {
              turn_on_monitor()
            } else {
              console.log('Monitor wäre hell.')
            }
            break
          default:
            break
        }

        // Handles the reset button.
        ipcMain.on('reset-settings', (e) => {
          // Resets the settings
          settings.resetSettings()
          notify('cleverQ Kiosk', 'Settings reseted!', `All settings are cleaned up!`)
          consumer.subscriptions.subscriptions[0].sendAction({ command: 'delete_kiosk', serial_nr: serial_nr });
          setTimeout(() => {
            if (process.platform === 'linux') {
              restart_kiosk()
            } else {
              app.relaunch()
              app.quit()
            }
          }, 3000);
        })
      }
  })
}

module.exports = {
  connect
}