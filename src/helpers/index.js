const { Notification } = require('electron')
const exec = require('child_process').exec
const fs = require('fs')

const read_and_safe_settings_json = (file, ip, username, usertoken, ssl) => {
  return new Promise((resolve, reject) => {
    fs.readFile(file, 'utf8', function (err, data) {
      if (err) {
        console.log(err)
        reject({
          message: 'Could not open settings.json',
          data: err
        })
      };
      var obj = JSON.parse(data)
    
      if (obj.ip !== ip || obj.username !== username || obj.usertoken !== usertoken) {
        obj.ip = (ssl === true ? 'https://' : 'http://') + ip
        obj.username = username
        obj.usertoken = usertoken
      
        fs.writeFileSync(file, JSON.stringify(obj, null, 2))
        resolve('saved')
      } else {
        resolve('no_change')
      }
    })
  })
}

const restart_kiosk = () => {
  console.log('The kiosk is rebooting..')
  notify('cleverQ Kiosk', 'Reboot initiated.', `The kiosk is rebooting in 10 seconds.`)
  exec('sudo shutdown -r now', function(error, stdout, stderr){ console.log(stdout) })
}

const run_touchscreen = () => {
  console.log('Run touchscreen..')
  notify('cleverQ Kiosk', 'Service-Terminal mode!', `The service-terminal mode is starting..`)
  exec('/home/pi/run_touchscreen.sh', function(error, stdout, stderr){ console.log(stdout) })
}

const run_display = () => {
  console.log('Run touchscreen..')
  notify('cleverQ Kiosk', 'Display mode!', `The display mode is starting..`)
  exec('pm2 stop all', function(error, stdout, stderr){ console.log(stdout) })
}

const turn_off_monitor = () => {
  console.log('The display is turning off..')
  exec('sudo vcgencmd display_power 0', function(error, stdout, stderr){ console.log(stdout) })
}

const turn_on_monitor = () => {
  console.log('The display is turning on.')
  exec('sudo vcgencmd display_power 1', function(error, stdout, stderr){ console.log(stdout) })
}

const portrait = () => {
  console.log('The display goes to portrait mode.')
  exec('xrandr -o left', function(error, stdout, stderr){ console.log(stdout); })
  exec("xinput set-prop 6 'Coordinate Transformation Matrix' 0 -1 1 1 0 0 0 0 1", function(error, stdout, stderr){ console.log(stdout) })
  exec("xte 'mousemove 960 540'", function(error, stdout, stderr){ console.log(stdout) })
}

const landscape = () => {
  console.log('The display goes to landscape mode.')
  exec('xrandr -o normal', function(error, stdout, stderr){ console.log(stdout); })
  exec("xinput set-prop 6 'Coordinate Transformation Matrix' 1 0 0 0 1 0 0 0 1", function(error, stdout, stderr){ console.log(stdout) })
  exec("xte 'mousemove 960 540'", function(error, stdout, stderr){ console.log(stdout) })
}

const notify = (title, subtitle, body) => {
  // Notifications
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: title,
      subtitle: subtitle,
      body: body
    })

    notification.on('show', () => console.log(`Notification: title: ${title}, subtitle: ${subtitle}, body: ${body}`))
    notification.show()
  } else {
    console.log(`Hm, are notifications supported on this system?`)
  }
}

const sendStatusToWindow = (message) => {
  notify('cleverQ Kiosk', 'Update check', message)
  console.log(message)
}

module.exports = {
  read_and_safe_settings_json,
  notify,
  restart_kiosk,
  run_touchscreen,
  run_display,
  turn_off_monitor,
  turn_on_monitor,
  portrait,
  landscape,
  sendStatusToWindow
}