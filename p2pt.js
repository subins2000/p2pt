/**
 * Peer 2 Peer with webTorrents
 * Copyright Subin Siby <mail@subinsb.com>, 2020
 */

const WebSocketTracker = require('bittorrent-tracker/lib/client/websocket-tracker')
const randombytes = require('randombytes')
const EventEmitter = require('events')
const sha1 = require('simple-sha1')
const debug = require('debug')('p2pt')

/**
 * This character would be prepended to easily identify JSON msgs
 */
const JSON_MESSAGE_IDENTIFIER = 'p'

/**
 * WebRTC data channel limit beyond which data is split into chunks
 * Chose 16KB considering Chromium
 */
const MAX_MESSAGE_LENGTH = 16000

class P2PT extends EventEmitter {
  /**
   *
   * @param array announceURLs List of announce tracker URLs
   * @param string identifierString Identifier used to discover peers in the network
   */
  constructor (announceURLs = [], identifierString = '') {
    super()

    this.announceURLs = announceURLs
    this.trackers = {}
    this.peers = {}
    this.msgChunks = {}

    if (identifierString) { this.setIdentifier(identifierString) }

    this._peerIdBuffer = randombytes(20)
    this._peerId = this._peerIdBuffer.toString('hex')
    this._peerIdBinary = this._peerIdBuffer.toString('binary')
  }

  /**
   * Set the identifier string used to discover peers in the network
   * @param string identifierString
   */
  setIdentifier (identifierString) {
    this.identifierString = identifierString
    this.infoHash = sha1.sync(identifierString).toLowerCase()
    this._infoHashBuffer = Buffer.from(this.infoHash, 'hex')
    this._infoHashBinary = this._infoHashBuffer.toString('binary')
  }

  /**
   * Connect to network and start discovering peers
   */
  start () {
    const $this = this

    this.on('peer', (peer) => {
      peer.on('connect', () => {
        $this.emit('peerconnect', peer)
      })

      peer.on('data', (data) => {
        $this.emit('data', peer, data)

        data = data.toString()

        debug('got a message : ' + data)

        if (data[0] === JSON_MESSAGE_IDENTIFIER) {
          try {
            data = JSON.parse(data.slice(1))

            // A respond function
            peer.respond = $this._peerRespond(peer, data.id)

            var chunkHandler = $this._chunkHandler(data)

            if (chunkHandler !== false) {
              $this.emit('msg', peer, chunkHandler)
            }
          } catch (e) {
            console.log(e)
          }
        }
      })

      peer.on('error', (err) => {
        $this.removePeer(peer.id)
        debug('Error in connection : ' + err)
      })

      peer.on('close', () => {
        $this.removePeer(peer.id)
        debug('Connection closed')
      })
    })

    this._fetchPeers()
  }

  /**
   * Remove a peer from the list
   * @param integer id Peer ID
   */
  removePeer (id) {
    this.emit('peerclose', id)
    delete this.peers[id]
  }

  /**
   * Send a msg and get response for it
   * @param Peer peer simple-peer object to send msg to
   * @param string msg Message to send
   * @param integer msgID ID of message if it's a response to a previous message
   */
  send (peer, msg, msgID = '') {
    const $this = this
    return new Promise((resolve, reject) => {
      if (!peer.connected) {
        reject(Error('closed'))
      }

      var data = {
        id: msgID !== '' ? msgID : Math.floor(Math.random() * 100000 + 100000),
        msg: msg
      }

      // TODO: Only listen callback if there's resolve i.e the caller expects a response and then only removeListener
      var responseCallback = (responseData) => {
        responseData = responseData.toString()
        if (responseData[0] === JSON_MESSAGE_IDENTIFIER) {
          try {
            responseData = JSON.parse(responseData.slice(1))

            if (responseData.id === data.id) {
              var chunkHandler = $this._chunkHandler(responseData)

              if (chunkHandler !== false) {
                peer.removeListener('data', responseCallback)
                $this._destroyChunks(data.id)

                resolve([peer, chunkHandler])
              }
            }
          } catch (e) {
            console.log(e)
          }
        }
      }

      peer.on('data', responseCallback)

      var chunks = 0
      var remaining = ''
      while (data.msg.length > 0) {
        data.c = chunks

        remaining = data.msg.slice(MAX_MESSAGE_LENGTH)
        data.msg = data.msg.slice(0, MAX_MESSAGE_LENGTH)

        if (!remaining) { data.last = true }

        peer.send(JSON_MESSAGE_IDENTIFIER + JSON.stringify(data))

        data.msg = remaining
        chunks++
      }
    })
  }

  /**
   * Request more peers
   */
  requestMorePeers () {
    const $this = this
    return new Promise((resolve) => {
      for (var key in $this.trackers) {
        $this.trackers[key].announce({
          numwant: 50
        })
      }
      resolve($this.peers)
    })
  }

  /**
   * A custom function binded on Peer object to easily respond back to message
   * @param Peer peer Peer to send msg to
   * @param integer msgID Message ID
   */
  _peerRespond (peer, msgID) {
    var $this = this
    return (msg) => {
      return $this.send(peer, msg, msgID)
    }
  }

  /**
   * Handle msg chunks. Returns false until the last chunk is received. Finally returns the entire msg
   * @param object data
   */
  _chunkHandler (data) {
    if (!this.msgChunks[data.id]) {
      this.msgChunks[data.id] = []
    }

    this.msgChunks[data.id][data.c] = data.msg

    if (data.last) {
      var completeMsg = this.msgChunks[data.id].join('')
      return completeMsg
    } else {
      return false
    }
  }

  /**
   * Remove all stored chunks of a particular message
   * @param integer msgID Message ID
   */
  _destroyChunks (msgID) {
    delete this.msgChunks[msgID]
  }

  /**
   * Default announce options
   * @param object opts Options
   */
  _defaultAnnounceOpts (opts = {}) {
    if (opts.numwant == null) opts.numwant = 50

    if (opts.uploaded == null) opts.uploaded = 0
    if (opts.downloaded == null) opts.downloaded = 0

    return opts
  }

  /**
   * Initialize trackers and fetch peers
   */
  _fetchPeers () {
    for (var key in this.announceURLs) {
      this.trackers[key] = new WebSocketTracker(this, this.announceURLs[key])
      this.trackers[key].announce({
        numwant: 50
      })
    }
  }
}

module.exports = P2PT
