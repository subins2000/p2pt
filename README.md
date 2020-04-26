# P2PT

Simple library to establish P2P connections, communicate messages (even large content!) using WebTorrent WebSocket Trackers as the signalling server.

Used in [P2Wiki](//lab.subinsb.com/p2wiki/)

## Features

* Easy to use API
* Send long messages: Data splitted into chunks, sent, received and reassembled all by the library !
* Use WebSocket Trackers as signalling servers
* JSON messaging system
* Send & Respond to messages in a chain using Promise

## Examples

```
const P2PT = require('p2pt')

var p2pt = new P2PT(announceURL, 'myApp')
p2pt.start()

p2pt.on('peerconnect', (peer) => {
  console.log('New Peer !')
  peer.send('Hi !').then(([peer, msg]) => {
    console.log(msg)
    return peer.respond('Hello !')
  }).then(([peer, msg]) => {
    console.log(msg)
  })
})
```
