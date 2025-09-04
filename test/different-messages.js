import test from './utils.js'

// Import the correct P2PT module based on environment
const P2PT = typeof window !== 'undefined' 
  ? (await import('../src/p2pt.js')).default
  : (await import('../src/node.js')).default

const announceURLs = [
  'ws://localhost:5000'
  // 'wss://tracker.btorrent.xyz:443/'
]

const announceURLsSet2 = [
  'ws://localhost:5000/'
]

const randomString = (length) => {
  return [...Array(length)]
    .map(() => (~~(Math.random() * 36)).toString(36))
    .join('')
}

test('large message', function (t) {
  const p2pt1 = new P2PT(announceURLs, 'p2pt')
  const p2pt2 = new P2PT(announceURLsSet2, 'p2pt')

  const KB100 = randomString(100000) // 100KB
  const KB1000 = randomString(1000000) // 1MB

  p2pt1.on('peerconnect', (peer) => {
    p2pt1.send(peer, KB100).then(([peer, msg]) => {
      t.equal(msg, KB1000)

      p2pt1.destroy()
      p2pt2.destroy()
      t.end()
    })
  })

  p2pt2.on('msg', (peer, msg) => {
    t.equal(msg, KB100)
    peer.respond(KB1000)
  })

  p2pt1.start()
  p2pt2.start()
})

test('json', function (t) {
  const p2pt1 = new P2PT(announceURLs, 'p2pt')
  const p2pt2 = new P2PT(announceURLsSet2, 'p2pt')

  const KB100 = {
    hello: randomString(100000) // 100KB
  }
  const KB1000 = {
    hello: randomString(1000000) // 1MB
  }

  p2pt1.on('peerconnect', (peer) => {
    p2pt1.send(peer, KB100).then(([peer, msg]) => {
      t.equal(msg.hello, KB1000.hello)

      p2pt1.destroy()
      p2pt2.destroy()
      t.end()
    })
  })

  p2pt2.on('msg', (peer, msg) => {
    t.equal(msg.hello, KB100.hello)
    peer.respond(KB1000)
  })

  p2pt1.start()
  p2pt2.start()
})
