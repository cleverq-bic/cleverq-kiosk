const { ipcRenderer } = require('electron')

document.getElementById('setupForm').addEventListener('submit', (e) => {
  e.preventDefault()

  const url = e.target[0]
  const ssl = e.target[1]
  const proxy_ip = e.target[2]
  const proxy_port = e.target[3]

  ipcRenderer.send('save-settings', {
    url: url.value,
    ssl: ssl.checked,
    proxy_ip: proxy_ip.value,
    proxy_port: proxy_port.value
  })
})

document.getElementById('resetButton').addEventListener('click', (e) => {
  e.preventDefault()

  ipcRenderer.send('reset-settings')
})

ipcRenderer.on('load-settings', (e, storedSettings) => {
  const setupForm = document.getElementById('setupForm')
  console.log('new', storedSettings)

  setupForm[0].value = storedSettings.url
  setupForm[1].checked = storedSettings.ssl
  setupForm[2].value = storedSettings.proxy_ip
  setupForm[3].value = storedSettings.proxy_port
})