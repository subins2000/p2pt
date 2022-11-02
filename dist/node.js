import WebSocketTracker from "bittorrent-tracker/lib/client/websocket-tracker";
import randombytes from "randombytes";
import EventEmitter from "events";
import sha1 from "simple-sha1";
const msgID = "^";
const max_length = 16e3;
class P2PT extends EventEmitter {
  constructor(announce, identifier) {
    super();
    this.announce = [
      "wss://tracker.files.fm:7073/announce",
      "wss://tracker.btorrent.xyz",
      "wss://spacetradersapi-chatbox.herokuapp.com:443/announce",
      "ws://tracker.files.fm:7072/announce"
    ];
    this.trackers = {};
    this.peers = {};
    this.responseWaiting = {};
    this.msgChunks = {};
    this._identifier = "";
    this._peerIdBuffer = randombytes(20);
    this._peerId = this._peerIdBuffer.toString("hex");
    this._peerIdBinary = this._peerIdBuffer.toString("binary");
    this.announce = announce || this.announce;
    this.identifier = identifier || this.identifier;
  }
  set identifier(val) {
    this._identifier = val;
    this.infoHash = sha1.sync(val).toLowerCase();
    this._infoHashBuffer = Buffer.from(this.infoHash, "hex");
    this._infoHashBinary = this._infoHashBuffer.toString("binary");
  }
  start() {
    this.on("peer", (peer) => {
      let newPeer = false;
      if (!this.peers[peer.id]) {
        newPeer = true;
        this.peers[peer.id] = {};
        this.responseWaiting[peer.id] = {};
      }
      peer.on("connect", () => {
        this.peers[peer.id][peer.channelName] = peer;
        if (newPeer)
          this.emit("peerconnect", peer);
      });
      peer.on("data", (data) => {
        this.emit("data", peer, data);
        data = data.toString();
        if (data[0] === msgID) {
          try {
            data = JSON.parse(data.slice(1));
            peer.respond = this._peerRespond(peer, data.id);
            let msg = this._chunkHandler(data);
            if (msg !== false) {
              if (data.o)
                msg = JSON.parse(msg);
              if (this.responseWaiting[peer.id][data.id]) {
                this.responseWaiting[peer.id][data.id]([peer, msg]);
                delete this.responseWaiting[peer.id][data.id];
              } else {
                this.emit("msg", peer, msg);
              }
              this._destroyChunks(data.id);
            }
          } catch (e) {
            console.error(e);
          }
        }
      });
      peer.on("error", (err) => {
        this._removePeer(peer);
        console.warn("Error in connection to peer:", err);
      });
      peer.on("close", () => {
        this._removePeer(peer);
        console.log(`Connection to ${peer.id} closed.`);
      });
    });
    this.on("update", (response) => {
      const tracker = this.trackers[this.announce.indexOf(response.announce)];
      this.emit("trackerconnect", tracker, this.getTrackerStats());
    });
    this.on("warning", (err) => {
      this.emit("trackerwarning", err, this.getTrackerStats());
    });
    this._fetchPeers();
  }
  addTracker(url) {
    if (this.announce.indexOf(url) !== -1)
      throw new Error("Tracker already added.");
    const idx = this.announce.push(url);
    this.trackers[idx] = new WebSocketTracker(this, url);
    this.trackers[idx].announce(this._defaultAnnounceOpts());
  }
  removeTracker(url) {
    const idx = this.announce.indexOf(url);
    if (idx === -1)
      throw new Error("Tracker does not exist");
    this.trackers[idx].peers = [];
    this.trackers[idx].destroy();
    delete this.trackers[idx];
    delete this.announce[idx];
  }
  _removePeer(peer) {
    if (!this.peers[peer.id])
      return false;
    delete this.peers[peer.id][peer.channelName];
    if (Object.keys(this.peers[peer.id]).length === 0) {
      this.emit("peerclose", peer);
      delete this.responseWaiting[peer.id];
      delete this.peers[peer.id];
    }
  }
  send(peer, msg, msgId = "") {
    return new Promise((resolve, reject) => {
      const data = {
        id: msgId || String(Math.floor(Math.random() * 1e5 + 1e5)),
        msg: typeof msg === "object" ? JSON.stringify(msg) : msg,
        o: typeof msg === "object" ? 1 : null
      };
      try {
        if (!peer.connected) {
          for (const i in this.peers[peer.id]) {
            peer = this.peers[peer.id][i];
            if (peer.connected)
              break;
          }
        }
        if (!this.responseWaiting[peer.id])
          this.responseWaiting[peer.id] = {};
        this.responseWaiting[peer.id][data.id] = resolve;
      } catch (e) {
        return reject(Error("Connection to peer closed" + e));
      }
      let chunks = 0;
      let remaining = "";
      while (data.msg.length > 0) {
        data.c = chunks;
        remaining = data.msg.slice(max_length);
        data.msg = data.msg.slice(0, max_length);
        if (!remaining)
          data.last = true;
        peer.send(msgID + JSON.stringify(data));
        data.msg = remaining;
        chunks++;
      }
    });
  }
  requestMorePeers() {
    return new Promise((resolve) => {
      for (const key in this.trackers) {
        this.trackers[key].announce(this._defaultAnnounceOpts());
      }
      resolve(this.peers);
    });
  }
  getTrackerStats() {
    let connectedCount = 0;
    for (const key in this.trackers) {
      if (this.trackers[key].socket && this.trackers[key].socket.connect) {
        connectedCount++;
      }
    }
    return {
      connected: connectedCount,
      total: this.announce.length
    };
  }
  destroy() {
    for (const k in this.peers) {
      for (const j in this.peers[k]) {
        this.peers[k][j].destroy();
      }
    }
    Object.keys(this.trackers).forEach((k) => this.trackers[k].destroy());
  }
  _peerRespond(peer, msgId) {
    return (msg) => this.send(peer, msg, msgId);
  }
  _chunkHandler(data) {
    if (!this.msgChunks[data.id])
      this.msgChunks[data.id] = [];
    this.msgChunks[data.id][data.c] = data.msg;
    if (data.last)
      return this.msgChunks[data.id].join("");
    return false;
  }
  _destroyChunks(msgId) {
    delete this.msgChunks[msgId];
  }
  _defaultAnnounceOpts(opts = {}) {
    if (opts.numwant == null)
      opts.numwant = 50;
    if (opts.uploaded == null)
      opts.uploaded = 0;
    if (opts.downloaded == null)
      opts.downloaded = 0;
    return opts;
  }
  _fetchPeers() {
    for (const i in this.announce) {
      this.trackers[i] = new WebSocketTracker(this, this.announce[i]);
      this.trackers[i].announce(this._defaultAnnounceOpts());
    }
  }
}
export { P2PT };
