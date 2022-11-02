"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
exports.P2PT = void 0;
var websocket_tracker_1 = require("bittorrent-tracker/lib/client/websocket-tracker");
var randombytes_1 = require("randombytes");
var events_1 = require("events");
var simple_sha1_1 = require("simple-sha1");
var msgID = '^';
var max_length = 16000;
var P2PT = /** @class */ (function (_super) {
    __extends(P2PT, _super);
    function P2PT(announce, identifier) {
        var _this = _super.call(this) || this;
        _this.announce = [
            'wss://tracker.files.fm:7073/announce',
            'wss://tracker.btorrent.xyz',
            'wss://spacetradersapi-chatbox.herokuapp.com:443/announce',
            'ws://tracker.files.fm:7072/announce'
        ];
        _this.trackers = {};
        _this.peers = {};
        _this.responseWaiting = {};
        _this.msgChunks = {};
        _this._identifier = '';
        _this._peerIdBuffer = (0, randombytes_1["default"])(20);
        _this._peerId = _this._peerIdBuffer.toString('hex');
        _this._peerIdBinary = _this._peerIdBuffer.toString('binary');
        _this.announce = announce || _this.announce;
        _this.identifier = identifier || _this.identifier;
        return _this;
    }
    Object.defineProperty(P2PT.prototype, "identifier", {
        set: function (val) {
            this._identifier = val;
            this.infoHash = simple_sha1_1["default"].sync(val).toLowerCase();
            this._infoHashBuffer = Buffer.from(this.infoHash, 'hex');
            this._infoHashBinary = this._infoHashBuffer.toString('binary');
        },
        enumerable: false,
        configurable: true
    });
    P2PT.prototype.start = function () {
        var _this = this;
        this.on('peer', function (peer) {
            var newPeer = false;
            if (!_this.peers[peer.id]) {
                newPeer = true;
                _this.peers[peer.id] = {};
                _this.responseWaiting[peer.id] = {};
            }
            peer.on('connect', function () {
                _this.peers[peer.id][peer.channelName] = peer;
                if (newPeer)
                    _this.emit('peerconnect', peer);
            });
            peer.on('data', function (data) {
                _this.emit('data', peer, data);
                data = data.toString();
                if (data[0] === msgID) {
                    try {
                        data = JSON.parse(data.slice(1));
                        peer.respond = _this._peerRespond(peer, data.id);
                        var msg = _this._chunkHandler(data);
                        if (msg !== false) {
                            if (data.o)
                                msg = JSON.parse(msg);
                            if (_this.responseWaiting[peer.id][data.id]) {
                                _this.responseWaiting[peer.id][data.id]([peer, msg]);
                                delete _this.responseWaiting[peer.id][data.id];
                            }
                            else {
                                _this.emit('msg', peer, msg);
                            }
                            _this._destroyChunks(data.id);
                        }
                    }
                    catch (e) {
                        console.error(e);
                    }
                }
            });
            peer.on('error', function (err) {
                _this._removePeer(peer);
                console.warn('Error in connection to peer:', err);
            });
            peer.on('close', function () {
                _this._removePeer(peer);
                console.log("Connection to ".concat(peer.id, " closed."));
            });
        });
        this.on('update', function (response) {
            var tracker = _this.trackers[_this.announce.indexOf(response.announce)];
            _this.emit('trackerconnect', tracker, _this.getTrackerStats());
        });
        this.on('warning', function (err) {
            _this.emit('trackerwarning', err, _this.getTrackerStats());
        });
        this._fetchPeers();
    };
    P2PT.prototype.addTracker = function (url) {
        if (this.announce.indexOf(url) !== -1)
            throw new Error('Tracker already added.');
        var idx = this.announce.push(url);
        this.trackers[idx] = new websocket_tracker_1["default"](this, url);
        this.trackers[idx].announce(this._defaultAnnounceOpts());
    };
    P2PT.prototype.removeTracker = function (url) {
        var idx = this.announce.indexOf(url);
        if (idx === -1)
            throw new Error('Tracker does not exist');
        this.trackers[idx].peers = [];
        this.trackers[idx].destroy();
        delete this.trackers[idx];
        delete this.announce[idx];
    };
    P2PT.prototype._removePeer = function (peer) {
        if (!this.peers[peer.id])
            return false;
        delete this.peers[peer.id][peer.channelName];
        if (Object.keys(this.peers[peer.id]).length === 0) {
            this.emit('peerclose', peer);
            delete this.responseWaiting[peer.id];
            delete this.peers[peer.id];
        }
    };
    P2PT.prototype.send = function (peer, msg, msgId) {
        var _this = this;
        if (msgId === void 0) { msgId = ''; }
        return new Promise(function (resolve, reject) {
            var data = {
                id: msgId || String(Math.floor(Math.random() * 100000 + 100000)),
                msg: typeof msg === 'object' ? JSON.stringify(msg) : msg,
                o: typeof msg === 'object' ? 1 : null
            };
            try {
                if (!peer.connected) {
                    for (var i in _this.peers[peer.id]) {
                        peer = _this.peers[peer.id][i];
                        if (peer.connected)
                            break;
                    }
                }
                if (!_this.responseWaiting[peer.id])
                    _this.responseWaiting[peer.id] = {};
                _this.responseWaiting[peer.id][data.id] = resolve;
            }
            catch (e) {
                return reject(Error('Connection to peer closed' + e));
            }
            var chunks = 0;
            var remaining = '';
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
    };
    P2PT.prototype.requestMorePeers = function () {
        var _this = this;
        return new Promise(function (resolve) {
            for (var key in _this.trackers) {
                _this.trackers[key].announce(_this._defaultAnnounceOpts());
            }
            resolve(_this.peers);
        });
    };
    P2PT.prototype.getTrackerStats = function () {
        var connectedCount = 0;
        for (var key in this.trackers) {
            if (this.trackers[key].socket && this.trackers[key].socket.connect) {
                connectedCount++;
            }
        }
        return {
            connected: connectedCount,
            total: this.announce.length
        };
    };
    P2PT.prototype.destroy = function () {
        var _this = this;
        for (var k in this.peers) {
            for (var j in this.peers[k]) {
                this.peers[k][j].destroy();
            }
        }
        Object.keys(this.trackers).forEach(function (k) { return _this.trackers[k].destroy(); });
    };
    P2PT.prototype._peerRespond = function (peer, msgId) {
        var _this = this;
        return function (msg) { return _this.send(peer, msg, msgId); };
    };
    P2PT.prototype._chunkHandler = function (data) {
        if (!this.msgChunks[data.id])
            this.msgChunks[data.id] = [];
        this.msgChunks[data.id][data.c] = data.msg;
        if (data.last)
            return this.msgChunks[data.id].join('');
        return false;
    };
    P2PT.prototype._destroyChunks = function (msgId) {
        delete this.msgChunks[msgId];
    };
    P2PT.prototype._defaultAnnounceOpts = function (opts) {
        if (opts === void 0) { opts = {}; }
        if (opts.numwant == null)
            opts.numwant = 50;
        if (opts.uploaded == null)
            opts.uploaded = 0;
        if (opts.downloaded == null)
            opts.downloaded = 0;
        return opts;
    };
    P2PT.prototype._fetchPeers = function () {
        for (var i in this.announce) {
            this.trackers[i] = new websocket_tracker_1["default"](this, this.announce[i]);
            this.trackers[i].announce(this._defaultAnnounceOpts());
        }
    };
    return P2PT;
}(events_1["default"]));
exports.P2PT = P2PT;
