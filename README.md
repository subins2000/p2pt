# P2PT

Simple library to establish P2P connections, communicate messages using WebTorrent Trackers (WebSocket) as the signalling server. Make any kind of WebRTC app using WebTorrent trackers as general-purpose WebRTC signalling servers.

Works in both browser & node environment.

* [Apps made wih P2PT](#examples)
* [API Docs](https://github.com/subins2000/p2pt/blob/master/api-docs.md)

## Features

* Easy to use API
* Send long messages: Data splitted into chunks, sent, received and reassembled all by the library !
* Use WebSocket Trackers as signalling servers
* JSON messaging system
* Send & Respond to messages in a chain using Promise

## MITM warnings

- **ensure** you use trusted trackerAnnounceURLs/keep the communication encrypted by some other means, notorius entities could put deceptive trackerAnnounceURL's and read the data that goes through via an mitm attack

- alternatively, create multiple P2PT connections to the same person via the same identifier but different trackerAnnounceURLs, then ensure that connections are sending the same message, then optimize this connection by exchanging a public key on both sides, ensuring the same public key has been sent via all connections, and then creating an encrypted connection over one of the connections. (TODO, create an option that does this de-facto, and easily)

## How Does It Work ?

The [amazing WebTorrent](https://webtorrent.io/) library created a new kind of Torrent Trackers called "WebSocket Trackers" also known as "WebTorrent Trackers". Some torrent clients can use these new trackers to share files.

Browser torrent clients (example: [BTorrent](https://btorrent.xyz/)) only have the capability to communicate to these WebTorrent trackers and other browser peers (known as **web peers**). Because, JavaScript in browser can't directly make TCP/IP connections and communicate. [Read more about how WebTorrent works here](https://github.com/webtorrent/webtorrent/).

WebRTC is the method by which browsers can communicate to other browsers peer to peer (P2P). WebTorrent makes use of WebRTC for sharing Torrents on web.

But, to establish P2P connections, a signalling server is needed. Signalling servers can be made in any way. But, you'll have to host it yourself. In WebTorrent, it's the **WebSocket trackers** that are the **signalling servers**. What if we use those trackers to establish P2P connections for our apps ?! That is what P2PT does ! :)

How do we find peers for torrent to download ? We use a magnet link. That magnet link has a unique identifier for our torrent called the [Info Hash](https://en.wikipedia.org/wiki/Magnet_URI_scheme#URN,_containing_hash_(xt)). This ID will be unique for all torrents.

Similarly, to build our apps, we use a identifier. This identifier is converted to a valid Info Hash and sent to our **WebTorrent trackers** who will give us a list of **web peers**. These web peers would be the other users also using our app :

```
// Find public WebTorrent tracker URLs here : https://github.com/ngosang/trackerslist/blob/master/trackers_all_ws.txt
var trackersAnnounceURLs = [
  "wss://tracker.openwebtorrent.com",
  "wss://tracker.sloppyta.co:443/announce",
  "wss://tracker.novage.com.ua:443/announce",
  "wss://tracker.btorrent.xyz:443/announce",
]

var p2pt = new P2PT(trackersAnnounceURLs, '<peer-identifier>')

// some available events, to see all events/an in depth documentation see https://github.com/subins2000/p2pt/blob/master/api-docs.md

p2pt.on('trackerconnect', (tracker, stats) => ...)
p2pt.on('peerconnect', peer => ...)
p2pt.on('msg', (peer, msg) => ...)
```

And that is how P2PT works.

## Examples

### Apps Built With P2PT

* [P2Wiki](//github.com/subins2000/p2wiki): Decentralized P2P proxy to access Wikipedia
* [P2Chat](//github.com/subins2000/p2chat): P2P noregister instant chat
* [Vett](//github.com/subins2000/vett): P2P Dots-and-Boxes game. [Play Here](//vett.space)
* [WebDrop](//github.com/subins2000/WebDrop): Easily share file across devices (both LAN & over Internet)
* [Board-IO](//github.com/elvistony/board-io "A Simple Drawing Board thats P2P"): A Simple Drawing Board that's live over P2P. [Try It Out!](https://elvistony.github.io/board-io)

Add yours here ! Send a PR !

### Simple Example

Open [this webpage](https://codepen.io/subins2000/pen/MWKwRYJ) in two separate browser windows. You'll see the messages. It's a codepen, you can fiddle with the code there.
