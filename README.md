# P2PT

Simple library to establish P2P connections, communicate messages (even large content!) using WebTorrent WebSocket Trackers as the signalling server.

Used in [P2Wiki](//lab.subinsb.com/p2wiki/)

## Features

* Easy to use API
* Send long messages: Data splitted into chunks, sent, received and reassembled all by the library !
* Use WebSocket Trackers as signalling servers
* JSON messaging system
* Send & Respond to messages in a chain using Promise

## How Does It Work ?

The [amazing WebTorrent](https://webtorrent.io/) library created a new kind of Torrent Trackers called "WebSocket Trackers" also known as "WebTorrent Trackers". Some torrent clients can use these new trackers to share files.

Browser torrent clients (example: [BTorrent](https://btorrent.xyz/)) only have the capability to communicate to these WebTorrent trackers and other browser peers (known as **web peers**). Because, JavaScript in browser can't directly make TCP/IP connections and communicate. [Read more about how WebTorrent works here](https://github.com/webtorrent/webtorrent/).

WebRTC is the method by which browsers can communicate to other browsers peer to peer (P2P). WebTorrent makes use of WebRTC for sharing Torrents on web.

But, to establish P2P connections, a signalling server is needed. Signalling servers can be made in any way. But, you'll have to host it yourself. In WebTorrent, it's the **WebSocket trackers** that are the **signalling servers**. What if we use those trackers to establish P2P connections for our apps ?! That is what P2PT does ! :)

How do we find peers for torrent to download ? We use a magnet link. That magnet link has a unique identifier for our torrent called the [Info Hash](https://en.wikipedia.org/wiki/Magnet_URI_scheme#URN,_containing_hash_(xt)). This ID will be unique for all torrents.

Similarly, to build our apps, we use a identifier. This identifier is converted to a valid Info Hash and sent to our **WebTorrent trackers** who will give us a list of **web peers**. These web peers would be the other users also using our app :

```
var p2pt = new P2PT(trackersAnnounceURLs, 'myApp')
```

And that is how P2PT works.

## Examples

### Apps Built With P2PT

* [P2Wiki](//github.com/subins2000/p2wiki): Decentralized P2P proxy to access Wikipedia
* [P2Chat](//github.com/subins2000/p2chat): P2P noregister instant chat
* [Vett](//github.com/subins2000/vett): P2P Dots-and-Boxes game. [Play Here](//vett.space)

### Code

```
const P2PT = require('p2pt')

// Find public WebTorrent tracker URLs here : https://github.com/ngosang/trackerslist/blob/master/trackers_all_ws.txt
var trackersAnnounceURLs = [
  "wss://tracker.openwebtorrent.com",
  "wss://tracker.sloppyta.co:443/announce",
  "wss://tracker.novage.com.ua:443/announce",
  "wss://tracker.btorrent.xyz:443/announce",
]

// This 'myApp' is called identifier and should be unique to your app
var p2pt = new P2PT(trackersAnnounceURLs, 'myApp')

// If a new peer, send message
p2pt.on('peerconnect', (peer) => {
  console.log('New Peer !')
  peer.send('Hi').then(([peer, msg]) => {
    console.log(msg)
    return peer.respond('Bye')
  }).then(([peer, msg]) => {
    console.log(msg)
  })
})

// If message received from peer
p2pt.on('msg', (peer, msg) => {
  console.log(`Got message from ${peer.id} : ${msg}`)
  if (msg === 'Hi') {
    peer.respond('Hello !')
  } else if (msg === 'Bye') {
    peer.respond('Bye !')
  }
})

p2pt.start()
```

Open the page with the above code in two separate browser windows, and open the console. You'll see the messages.
