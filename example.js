import P2PT from "./src/p2pt"

let logElem = document.getElementById('log');
const log = msg => {
  if (typeof msg == 'object') {
    logElem.innerHTML += (JSON && JSON.stringify ? JSON.stringify(msg, undefined, 2) : msg) + '<br />';
  } else {
    logElem.innerHTML += msg + '<br />';
  }
}

// Find public WebTorrent tracker URLs here : https://github.com/ngosang/trackerslist/blob/master/trackers_all_ws.txt
var trackersAnnounceURLs = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.webtorrent.dev',
  'wss://tracker.files.fm:7073/announce',
  'wss://tracker.btorrent.xyz/',
]

// This 'myApp' is called identifier and should be unique to your app
var p2pt = new P2PT(trackersAnnounceURLs, 'myApp')

// If a tracker connection was successful
p2pt.on('trackerconnect', (tracker, stats) => {
  log('Connected to tracker : ' + tracker.announceUrl)
  log('Tracker stats : ' + JSON.stringify(stats))
  log('')
})

// If a new peer, send message
p2pt.on('peerconnect', (peer) => {
  log('New Peer ! : ' + peer.id + '. Sending Hi')
  p2pt.send(peer, 'Hi').then(([peer, msg]) => {
    log('Got response : ' + msg)
    return peer.respond('Bye')
  }).then(([peer, msg]) => {
    log('Got response2 : ' + msg)
  })
})

// If message received from peer
p2pt.on('msg', (peer, msg) => {
  log(`Got message from ${peer.id} : ${msg}`)
  if (msg === 'Hi') {
    peer.respond('Hello !').then(([peer, msg]) => {
      peer.respond('Bye !')
    })
  }
})

log('P2PT started. My peer id : ' + p2pt._peerId)
p2pt.start()