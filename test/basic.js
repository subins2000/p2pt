const test = require('tape')

let P2PT
if (process.env.BROWSER_TEST) {
  P2PT = require('../p2pt')
} else {
  P2PT = require('../node')
}

const announceURLs = [
  'ws://localhost:5000'
  // 'wss://tracker.btorrent.xyz:443/announce'
]

const announceURLs1 = [
  'ws://localhost:5001'
]

test('character message', function (t) {
  var p2pt1 = new P2PT(announceURLs, 'p2pt')
  var p2pt2 = new P2PT(announceURLs, 'p2pt')

  p2pt1.on('peerconnect', (peer) => {
    p2pt1.send(peer, 'hello')
  })

  p2pt2.on('msg', (peer, msg) => {
    t.equal(msg, 'hello')

    p2pt1.destroy()
    p2pt2.destroy()
    t.end()
  })

  p2pt1.start()
  p2pt2.start()
})

test('chained messages', function (t) {
  var p2pt1 = new P2PT(announceURLs, 'p2pt')
  var p2pt2 = new P2PT(announceURLs, 'p2pt')

  p2pt1.on('peerconnect', (peer) => {
    p2pt1
      .send(peer, 'hello')
      .then(([peer, msg]) => {
        t.equal(msg, 'hi')
        return peer.respond('how are you ?')
      })
      .then(([peer, msg]) => {
        t.equal(msg, 'fine')
        return peer.respond('byeee')
      })
      .then(([peer, msg]) => {
        t.equal(msg, 'bye!')

        p2pt1.destroy()
        p2pt2.destroy()

        t.end()
      })
  })

  p2pt2.on('msg', (peer, msg) => {
    if (msg === 'hello') {
      t.equal(msg, 'hello')
      peer
        .respond('hi')
        .then(([peer, msg]) => {
          t.equal(msg, 'how are you ?')
          return peer.respond('fine')
        })
        .then(([peer, msg]) => {
          t.equal(msg, 'byeee')
          return peer.respond('bye!')
        })
    }
  })

  p2pt1.start()
  p2pt2.start()
})

test('tracker connections', function (t) {
  var p2pt1 = new P2PT(announceURLs, 'p2pt')
  var p2pt2 = new P2PT(['ws://127.0.0.1:404'], 'p2pt')

  p2pt1.on('trackerconnect', (tracker, status) => {
    t.equal(tracker.announceUrl, announceURLs[0])

    t.equal(status.connected, 1)
    t.equal(status.total, 1)

    p2pt1.destroy()
    p2pt2.start()
  })

  p2pt2.on('trackerwarning', (error, status) => {
    t.match(error.message, new RegExp('connection error to ws://127.0.0.1:404'))

    t.equal(status.connected, 0)
    t.equal(status.total, 1)

    p2pt2.destroy()

    t.end()
  })

  p2pt1.start()
})

test('peer connections', function (t) {
  const announce = announceURLs.concat(announceURLs1)

  var p2pt1 = new P2PT(announce, 'p2pt')
  var p2pt2 = new P2PT(announce, 'p2pt')

  p2pt1.on('peerconnect', (peer) => {
    t.pass('Connect event emitted')

    p2pt1.send(peer, 'hello')
  })

  p2pt1.on('peerclose', (peer) => {
    t.pass('Close event emitted')
  })

  p2pt1.on('msg', (peer, msg) => {
    // Different trackers will give same peer with same ID, but different data channels
    // this test will check if the second data channel is used if first is closed
    p2pt1.send(peer, 'hello3')
  })

  p2pt2.on('peerconnect', (peer) => {
    t.pass('Connect event emitted')
  })

  let msgReceiveCount = 0

  p2pt2.on('msg', (peer, msg) => {
    // t.pass('Connect event emitted')

    if (msgReceiveCount === 0) {
      setTimeout(() => {
        p2pt2.send(peer, 'hello2')

        // Forcefully close connection
        peer.destroy()
      }, 100)
    } else {
      t.equal(msg, 'hello3')

      p2pt1.destroy()
      p2pt2.destroy()

      t.end()
    }

    msgReceiveCount++
  })

  p2pt2.on('peerclose', (peer) => {
    t.pass('Close event emitted')
  })

  p2pt1.start()
  p2pt2.start()
})
