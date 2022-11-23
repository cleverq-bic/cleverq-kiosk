'use strict'

const { BrowserWindow } = require('electron')

const defaultProps = {
  fullscreen: process.platform === 'linux' ? true : false,
  alwaysOnTop: process.platform === 'linux' ? true : false,
  titleBarStyle: process.platform === 'linux' ? 'hidden' : null
}

class MainWindow extends BrowserWindow {
  constructor({ file, ...windowSettings }) {
    super({ ...defaultProps, ...windowSettings })
    this.loadFile(file)
    //this.webContents.openDevTools()
    this.setPosition(0,0)
    
    this.once('ready-to-show', () => {
      
      this.show()
    })
  }
}

module.exports = MainWindow