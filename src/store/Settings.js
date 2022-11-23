const path = require('path')
const Store = require('electron-store')

class Settings extends Store {
  constructor(settings) {
    super(settings)

    this.storedSettings = {
      url: this.get('storedSettings.url') || 'cqm.cleverq.de',
      token: this.get('storedSettings.token') || '',
      ssl: this.get('storedSettings.ssl') === true ? true : this.get('storedSettings.ssl') === undefined ? true : false,
      arrived_url: this.get('storedSettings.arrived_url'),
      alignment: this.get('storedSettings.alignment'),
      kiosk_id: this.get('storedSettings.kiosk_id'),
      proxy_ip: this.get('storedSettings.proxy_ip') || '',
      proxy_port: this.get('storedSettings.proxy_port') || ''
    }
  }

  saveSettings(data) {
    this.set('storedSettings.url', data.url)
    this.set('storedSettings.ssl', data.ssl)
    this.set('storedSettings.proxy_ip', data.proxy_ip)
    this.set('storedSettings.proxy_port', data.proxy_port)


    // returning 'this' allows method chaining
    return this
  }

  completeSetup(token) {
    this.set('storedSettings.token', token)
  }

  saveArrivedUrl(url) {
    this.set('storedSettings.arrived_url', url)
  }

  saveAlignment(alignment) {
    this.set('storedSettings.alignment', alignment)
  }

  saveKioskId(kiosk_id) {
    if (kiosk_id) {
      this.set('storedSettings.kiosk_id', kiosk_id)
    }
  }

  getSettings() {
    this.storedSettings = {
      url: this.get('storedSettings.url'),
      token: this.get('storedSettings.token') || '',
      ssl: this.get('storedSettings.ssl') === true ? true : this.get('storedSettings.ssl') === undefined ? true : false,
      arrived_url: this.get('storedSettings.arrived_url'),
      alignment: this.get('storedSettings.alignment'),
      kiosk_id: this.get('storedSettings.kiosk_id'),
      proxy_ip: this.get('storedSettings.proxy_ip') || '',
      proxy_port: this.get('storedSettings.proxy_port') || ''
    }

    return this
  }

  resetSettings() {
    this.delete('storedSettings')
    this.set('storedSettings.url', 'cqm.cleverq.de')
    this.set('storedSettings.ssl', true)
    this.set('storedSettings.kiosk_id', null)
    this.set('storedSettings.proxy_ip', '')
    this.set('storedSettings.proxy_port', '')
  }
}

module.exports = Settings