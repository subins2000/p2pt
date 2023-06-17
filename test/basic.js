import test from 'tape'
import P2PT from '../p2pt.js'

const announceURLs = [
  'ws://localhost:5000',
  'wss://tracker.btorrent.xyz',
  'wss://tracker.webtorrent.dev'
]

const announceURLs1 = [
  'ws://localhost:5001'
]

test('character message', function (t) {
  const p2pt1 = new P2PT(announceURLs, 'p2pt')
  const p2pt2 = new P2PT(announceURLs, 'p2pt')

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
  const p2pt1 = new P2PT(announceURLs, 'p2pt')
  const p2pt2 = new P2PT(announceURLs, 'p2pt')

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
  const p2pt1 = new P2PT(announceURLs, 'p2pt')
  const p2pt2 = new P2PT(['ws://127.0.0.1:404'], 'p2pt')

  p2pt1.on('trackerconnect', (tracker, status) => {
    t.equal(tracker.announceUrl, announceURLs[0])

    t.equal(status.connected, 1)
    t.equal(status.total, 1)

    p2pt1.destroy()
    p2pt2.start()
  })

  p2pt2.on('trackerwarning', (error, status) => {
    t.match(error.message, /error(.*?)ws:\/\/127\.0\.0\.1:404/gi)

    t.equal(status.connected, 0)
    t.equal(status.total, 1)

    p2pt2.destroy()

    t.end()
  })

  p2pt1.start()
})

test('tracker addition', function (t) {
  const p2pt1 = new P2PT(announceURLs, 'p2pt')
  const p2pt2 = new P2PT(announceURLs1, 'p2pt')

  p2pt1.on('peerconnect', (peer) => {
    t.pass('Connect event emitted')

    p2pt1.destroy()
    p2pt2.destroy()
    t.end()
  })

  p2pt1.start()
  p2pt2.start()

  // let 1st p2pt1 know of tracker p2pt2 is using
  p2pt1.addTracker(announceURLs1[0])
})

test('tracker removal', function (t) {
  const p2pt1 = new P2PT(announceURLs, 'p2pt')
  const p2pt2 = new P2PT(announceURLs, 'p2pt')

  p2pt1.on('msg', (peer, msg) => {
    if (msg === 'hello') {
      t.pass('Connection remained after tracker removal')

      p2pt1.destroy()
      p2pt2.destroy()
      t.end()
    }
  })

  p2pt2.on('peerconnect', peer => {
    p2pt2.removeTracker(announceURLs[0])

    setTimeout(() => {
      p2pt2.send(peer, 'hello')
    }, 1000)
  })

  p2pt1.start()
  p2pt2.start()
})

test('peer connections', function (t) {
  const announce = announceURLs.concat(announceURLs1)

  const p2pt1 = new P2PT(announce, 'p2pt')
  const p2pt2 = new P2PT(announce, 'p2pt')

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
    setTimeout(() => {
      p2pt1.send(peer, 'hello3')
      console.log(msg)
    }, 100)
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
