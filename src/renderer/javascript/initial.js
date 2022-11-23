const electron = require('electron')
const ip = require('ip')

let serial_nr = ''

if (process.platform === 'linux') {
  const piinfo = require('piinfo')
  serial_nr = piinfo.serial();
} else {
  const node_id = require('node-machine-id')
  serial_nr = node_id.machineIdSync({original: true})
}

document.getElementById('version').textContent = 'Version: ' + electron.remote.app.getVersion();
document.getElementById('ip_address').textContent = ip.address()
document.getElementById('serial_nr').textContent = serial_nr

electron.ipcRenderer.on('registered', (e) => {
  document.getElementById('status_text').innerText = 'This device is successfully registered.'
  document.getElementById('progress').value = 50
})

electron.ipcRenderer.on('added_to_list', (e) => {
  document.getElementById('loading').style.display = 'none'
  document.getElementById('added_to_list').innerText = 'The device is ready for setup.'
})

electron.ipcRenderer.on('setup_done', (e) => {
  document.getElementById('setup_done').innerText = 'Configuration complete! This device will restart in: '
  document.getElementById('progress').value = 100
  countdown()
})

electron.ipcRenderer.on('load-settings', (e, storedSettings) => {
  document.getElementById('link').textContent = storedSettings.url
})

function countdown() {
  var timeleft = 10;
  var timer = setInterval(function(){
  timeleft--;
  document.getElementById("countdown").textContent = timeleft;
  if(timeleft <= 0)
      clearInterval(timer);
  },1000);
}