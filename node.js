const BrowserP2PT = require('./p2pt')
const wrtc = require('wrtc')

class P2PT extends BrowserP2PT {
  /**
   *
   * @param array announceURLs List of announce tracker URLs
   * @param string identifierString Identifier used to discover peers in the network
   */
  constructor (announceURLs = [], identifierString = '') {
    super(announceURLs, identifierString)

    this._wrtc = wrtc
  }
}

module.exports = P2PT
