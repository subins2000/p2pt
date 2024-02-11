/**
 * Peer 2 Peer WebRTC connections with WebTorrent Trackers as signalling server
 * Copyright Subin Siby <mail@subinsb.com>, 2020
 * Licensed under MIT
 */

import WebSocketTracker from 'bittorrent-tracker/lib/client/websocket-tracker.js'
import EventEmitter from 'events'
import Debug from 'debug'
import { randomBytes, arr2hex, hex2bin, hex2arr, hash, arr2text } from 'uint8-util'

const debug = Debug('p2pt')

/**
 * This character would be prepended to easily identify JSON msgs
 */
const JSON_MESSAGE_IDENTIFIER = '^'

/**
 * WebRTC data channel limit beyond which data is split into chunks
 * Chose 16KB considering Chromium
 * https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels#Concerns_with_large_messages
 */
const MAX_MESSAGE_LENGTH = 16000

export default class P2PT extends EventEmitter {
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
    this.responseWaiting = {}

    if (identifierString) { this.setIdentifier(identifierString) }

    this._peerIdBuffer = randomBytes(20)
    this._peerId = arr2hex(this._peerIdBuffer)
    this._peerIdBinary = hex2bin(this._peerId)

    debug('my peer id: ' + this._peerId)
  }

  /**
   * Set the identifier string used to discover peers in the network
   * @param string identifierString
   */
  async setIdentifier (identifierString) {
    this.identifierString = identifierString
    this.infoHash = hash(identifierString, 'hex')
    this._infoHashBuffer = hex2arr((await this.infoHash).toLowerCase())
    this._infoHashBinary = hex2bin((await this.infoHash).toLowerCase())
  }

  /**
   * Connect to network and start discovering peers
   */
  async start () {
    await this.infoHash
    this.on('peer', peer => {
      let newpeer = false
      if (!this.peers[peer.id]) {
        newpeer = true
        this.peers[peer.id] = {}
        this.responseWaiting[peer.id] = {}
      }

      peer.on('connect', () => {
        /**
         * Multiple data channels to one peer is possible
         * The `peer` object actually refers to a peer with a data channel. Even though it may have same `id` (peerID) property, the data channel will be different. Different trackers giving the same "peer" will give the `peer` object with different channels.
         * We will store all channels as backups in case any one of them fails
         * A peer is removed if all data channels become unavailable
         */
        this.peers[peer.id][peer.channelName] = peer

        if (newpeer) {
          this.emit('peerconnect', peer)
        }
      })

      peer.on('data', data => {
        this.emit('data', peer, data)

        if (ArrayBuffer.isView(data)) data = arr2text(data)

        debug('got a message from ' + peer.id)

        if (data[0] === JSON_MESSAGE_IDENTIFIER) {
          try {
            data = JSON.parse(data.slice(1))

            // A respond function
            peer.respond = this._peerRespond(peer, data.id)

            let msg = this._chunkHandler(data)

            // msg fully retrieved
            if (msg !== false) {
              if (data.o) {
                msg = JSON.parse(msg)
              }

              /**
               * If there's someone waiting for a response, call them
               */
              if (this.responseWaiting[peer.id][data.id]) {
                this.responseWaiting[peer.id][data.id]([peer, msg])
                delete this.responseWaiting[peer.id][data.id]
              } else {
                this.emit('msg', peer, msg)
              }
              this._destroyChunks(data.id)
            }
          } catch (e) {
            console.log(e)
          }
        }
      })

      peer.on('error', err => {
        this._removePeer(peer)
        debug('Error in connection : ' + err)
      })

      peer.on('close', () => {
        this._removePeer(peer)
        debug('Connection closed with ' + peer.id)
      })
    })

    // Tracker responded to the announce request
    this.on('update', response => {
      const tracker = this.trackers[this.announceURLs.indexOf(response.announce)]

      this.emit(
        'trackerconnect',
        tracker,
        this.getTrackerStats()
      )
    })

    // Errors in tracker connection
    this.on('warning', err => {
      this.emit(
        'trackerwarning',
        err,
        this.getTrackerStats()
      )
    })

    this._fetchPeers()
  }

  /**
   * Add a tracker
   * @param string announceURL Tracker Announce URL
   */
  addTracker (announceURL) {
    if (this.announceURLs.indexOf(announceURL) !== -1) {
      throw new Error('Tracker already added')
    }

    const key = this.announceURLs.push(announceURL)

    this.trackers[key] = new WebSocketTracker(this, announceURL)
    this.trackers[key].announce(this._defaultAnnounceOpts())
  }

  /**
   * Remove a tracker without destroying peers
   */
  removeTracker (announceURL) {
    const key = this.announceURLs.indexOf(announceURL)

    if (key === -1) {
      throw new Error('Tracker does not exist')
    }

    // hack to not destroy peers
    this.trackers[key].peers = []
    this.trackers[key].destroy()

    delete this.trackers[key]
    delete this.announceURLs[key]
  }

  /**
   * Remove a peer from the list if all channels are closed
   * @param integer id Peer ID
   */
  _removePeer (peer) {
    if (!this.peers[peer.id]) { return false }

    delete this.peers[peer.id][peer.channelName]

    // All data channels are gone. Peer lost
    if (Object.keys(this.peers[peer.id]).length === 0) {
      this.emit('peerclose', peer)

      delete this.responseWaiting[peer.id]
      delete this.peers[peer.id]
    }
  }

  /**
   * Send a msg and get response for it
   * @param Peer peer simple-peer object to send msg to
   * @param string msg Message to send
   * @param integer msgID ID of message if it's a response to a previous message
   */
  send (peer, msg, msgID = '') {
    return new Promise((resolve, reject) => {
      const data = {
        id: msgID !== '' ? msgID : Math.floor(Math.random() * 100000 + 100000),
        msg
      }

      if (typeof msg === 'object') {
        data.msg = JSON.stringify(msg)
        data.o = 1 // indicating object
      }

      try {
        /**
         * Maybe peer channel is closed, so use a different channel if available
         * Array should atleast have one channel, otherwise peer connection is closed
         */
        if (!peer.connected) {
          for (const index in this.peers[peer.id]) {
            peer = this.peers[peer.id][index]

            if (peer.connected) break
          }
        }

        if (!this.responseWaiting[peer.id]) {
          this.responseWaiting[peer.id] = {}
        }
        this.responseWaiting[peer.id][data.id] = resolve
      } catch (e) {
        return reject(Error('Connection to peer closed' + e))
      }

      let chunks = 0
      let remaining = ''
      while (data.msg.length > 0) {
        data.c = chunks

        remaining = data.msg.slice(MAX_MESSAGE_LENGTH)
        data.msg = data.msg.slice(0, MAX_MESSAGE_LENGTH)

        if (!remaining) { data.last = true }

        peer.send(JSON_MESSAGE_IDENTIFIER + JSON.stringify(data))

        data.msg = remaining
        chunks++
      }

      debug('sent a message to ' + peer.id)
    })
  }

  /**
   * Request more peers
   */
  requestMorePeers () {
    return new Promise(resolve => {
      for (const key in this.trackers) {
        this.trackers[key].announce(this._defaultAnnounceOpts())
      }
      resolve(this.peers)
    })
  }

  /**
   * Get basic stats about tracker connections
   */
  getTrackerStats () {
    let connectedCount = 0
    for (const key in this.trackers) {
      if (this.trackers[key].socket && this.trackers[key].socket.connected) {
        connectedCount++
      }
    }

    return {
      connected: connectedCount,
      total: this.announceURLs.length
    }
  }

  /**
   * Destroy object
   */
  destroy () {
    let key
    for (key in this.peers) {
      for (const key2 in this.peers[key]) {
        this.peers[key][key2].destroy()
      }
    }
    for (key in this.trackers) {
      this.trackers[key].destroy()
    }
  }

  /**
   * A custom function binded on Peer object to easily respond back to message
   * @param Peer peer Peer to send msg to
   * @param integer msgID Message ID
   */
  _peerRespond (peer, msgID) {
    return msg => {
      return this.send(peer, msg, msgID)
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
      const completeMsg = this.msgChunks[data.id].join('')
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
    for (const key in this.announceURLs) {
      this.trackers[key] = new WebSocketTracker(this, this.announceURLs[key])
      this.trackers[key].announce(this._defaultAnnounceOpts())
    }
  }
}
