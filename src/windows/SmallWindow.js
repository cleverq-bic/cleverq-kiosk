'use strict'

const { BrowserWindow } = require('electron')

const defaultProps = {
  fullscreen: false,
  alwaysOnTop: true,
  frame: false
}

class SmallWindow extends BrowserWindow {
  constructor({ file, ...windowSettings }) {
    super({ ...defaultProps, ...windowSettings })
    this.loadFile(file)

    this.once('ready-to-show', () => {
      this.show()
    })
  }
}

module.exports = SmallWindow