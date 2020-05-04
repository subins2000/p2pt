# P2PT

Simple library to establish P2P connections, communicate messages (even large content!) using WebTorrent WebSocket Trackers as the signalling server.

Used in [P2Wiki](//lab.subinsb.com/p2wiki/)

## Features

* Easy to use API
* Send long messages: Data splitted into chunks, sent, received and reassembled all by the library !
* Use WebSocket Trackers as signalling servers
* JSON messaging system
* Send & Respond to messages in a chain using Promise

## Apps Built With P2PT

* [P2Wiki](//github.com/subins2000/pwiki): Decentralized P2P proxy to access Wikipedia
* [P2Chat](//github.com/subins2000/p2chat): P2P noregister instant chat
* [Vett](//github.com/subins2000/vett): P2P Dots-and-Boxes game. [Play Here](//vett.space)

## Examples

```
const P2PT = require('p2pt')

// Find public WebTorrent tracker URLs here : https://github.com/ngosang/trackerslist/blob/master/trackers_all_ws.txt
var trackersAnnounceURLs = [
  "wss://tracker.openwebtorrent.com",
  "wss://tracker.sloppyta.co:443/announce",
  "wss://tracker.novage.com.ua:443/announce",
  "wss://tracker.btorrent.xyz:443/announce",
]

var p2pt = new P2PT(trackersAnnounceURLs, 'myApp')
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

Open the page with the above code in two separate browser windows, and open the console. You'll see the messages.
