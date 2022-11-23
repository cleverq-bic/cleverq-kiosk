let serial_nr = ''
if (process.platform === 'linux') {
  const piinfo = require('piinfo')
  serial_nr = piinfo.serial();
} else {
  const node_id = require('node-machine-id')
  serial_nr = node_id.machineIdSync({original: true})
}

document.getElementById('serial_nr').textContent = serial_nr