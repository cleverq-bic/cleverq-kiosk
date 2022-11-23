const electron = require('electron')

let current_progress = 0
    step = 0.2

document.getElementById('version').textContent = 'Version: ' + electron.remote.app.getVersion();

const interval = setInterval(function() {
  current_progress += step;
  progress = Math.round(Math.atan(current_progress) / (Math.PI / 2.05) * 100 * 1000) / 1000
  document.getElementById('loading_progress').value = progress
  if (progress >= 100){
      clearInterval(interval)
      electron.ipcRenderer.send('loading-done', true)
  }else if(progress >= 70) {
      step = 10
  }
}, 200);