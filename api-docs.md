# Documentation

* [Class: `P2PT extends EventEmitter`](#class-p2pt-extends-eventemitter)
  * [Event: `peerconnect`](#event-peerconnect)
  * [Event: `data`](#event-data)
  * [Event: `msg`](#event-msg)
  * [Event: `peerclose`](#event-peerclose)
  * [`new P2PT(announceURLs = [], identifierString = '')`](#new-p2ptannounceurls---identifierstring--)
  * [`setIdentifier(identifierString)`](#setidentifieridentifierstring)
  * [`start()`](#start)
  * [`requestMorePeers()`](#requestmorepeers)
  * [`removePeer(peerId)`](#removepeerpeerid)
  * [`send(peer, msg[, msgID = ''])`](#sendpeer-msg-msgid--)
  * [`destroy()`](#destroy)

## Class: `P2PT extends EventEmitter`
The P2PT class is defined and exposed by the `p2pt` module :
```javascript
const P2PT = require('p2pt')
```

This is the base class that needs to be instantiated to use this library. It provides the API to implement P2P connections, communicate messages (even large content!) using WebTorrent WebSocket Trackers as the signalling server.

### Event: `peerconnect`
This event is emitted when a new peer connects.

Arguments passed to Event Handler: `peer` Object

### Event: `data`
This event is emitted for every chunk of data received.

Arguments passed to Event Handler: `peer` Object, `data` Object

### Event: `msg`
This event is emitted once all the chunks are received for a message.

Arguments passed to Event Handler: `peer` Object, `msg` Object

### Event: `peerclose`
This event is emitted when a peer disconnects.

Arguments passed to Event Handler: `peer` Object

### `new P2PT(announceURLs = [], identifierString = '')`
Instantiates the class
* **Arguments:**
  * **announceURLs:** `Array`
    * **Description:** List of announce tracker URLs
    * **Default:** `[]`
  * **identifierString:** `String`
    * **Description:** Identifier used to discover peers in the network
    * **Default:** `''`

### `setIdentifier(identifierString)`
Sets the identifier string used to discover peers in the network
* **Arguments:**
  * **identifierString:** `String`
    * **Description:** Identifier used to discover peers in the network
* **Returns:** `void`

### `start()`
Connects to network and starts discovering peers
* **Arguments:** None
* **Returns:** `void`

### `requestMorePeers()`
Request More Peers
* **Arguments:** None
* **Returns:** `Promise`
  * **resolve(peers)**
    * **peers:** Object

### `removePeer(peerId)`
Remove a peer from the list
* **Arguments:**
  * **peerId:** `Number`
    * **Description:** Integer ID of the peer to be removed `peer.id`
* **Returns:** `void`

### `send(peer, msg[, msgID = ''])`

* **Arguments:**
  * **peer:** `Object`
    * **Description:** Stores information of a Peer
  * **msg:** `Object`
    * **Description:** Message to send
  * **msgID:** `Number`
    * **Description:** ID of message if it's a response to a previous message
    * **Default:** `''`
* **Returns:** `Promise`
  * **resolve([peer, msg])**
    * **peer:** `Object`
    * **msg:** `Object`

### `destroy()`
Destroy the P2PT Object
* **Arguments:** None
* **Returns:** `void`