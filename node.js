import BrowserP2PT from './p2pt'
import wrtc from 'wrtc'

export default class P2PT extends BrowserP2PT {
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
