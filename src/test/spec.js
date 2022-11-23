const path = require('path')
const { Application } = require('spectron')
const electronPath = require('electron')
const assert = require('assert')

describe('Application launch', function () {

  beforeEach(function () {
    this.app = new Application({
      path: electronPath,
      args: [path.join(__dirname, '../..')]
    })
    return this.app.start()
  })

  afterEach(function () {
    if (this.app && this.app.isRunning) {
      return this.app.stop()
    }
  })

  // Unit tests
  it('shows main window', function () {
    return this.app.client.waitUntilWindowLoaded()
      .getWindowCount().then((count) => {
        assert.equal(count, 1)
      }).browserWindow.isVisible().then(visible => {
        assert.equal(visible, true)
      }).browserWindow.getBounds().then(bounds => {
        assert.equal(bounds.width > 0, true)
        assert.equal(bounds.height > 0, true)
      })
  })
})