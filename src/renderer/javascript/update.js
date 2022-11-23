const { ipcRenderer } = require('electron')

ipcRenderer.on('download-progress-percent', (e, percent) => {
  document.getElementById('download_progress').value = percent
})

ipcRenderer.on('download-speed', (e, speed) => {
  document.getElementById('download_speed').innerHTML = speed
})