/// <reference types="node" />
/// <reference types="node" />
import WebSocketTracker from 'bittorrent-tracker/lib/client/websocket-tracker';
import EventEmitter from 'events';
import { Instance } from 'simple-peer';
interface MsgData {
    id: string;
    msg: string;
    o: 1 | null;
    c: number;
    last: boolean;
}
interface AnnounceOpts {
    numwant: number;
    uploaded: number;
    downloaded: number;
}
interface Peer extends Instance {
    id: string;
    channelName: string;
    connected: boolean;
    respond: (msg: unknown) => Promise<unknown>;
    destroy: () => void;
    send: (msg: string) => void;
}
declare class P2PT extends EventEmitter {
    announce: string[];
    trackers: {
        [key: string]: WebSocketTracker;
    };
    peers: {
        [key: string]: {
            [key: string]: Peer;
        };
    };
    responseWaiting: {
        [key: string]: {
            [key: string]: (value: unknown) => void;
        };
    };
    msgChunks: {
        [key: string]: string[];
    };
    _identifier: string;
    infoHash: string;
    _infoHashBuffer: Buffer;
    _infoHashBinary: string;
    _peerIdBuffer: Buffer;
    _peerId: string;
    _peerIdBinary: string;
    set identifier(val: string);
    constructor(announce: string[], identifier: string);
    start(): void;
    addTracker(url: string): void;
    removeTracker(url: string): void;
    _removePeer(peer: Peer): boolean;
    send(peer: Peer, msg: unknown, msgId?: string): Promise<unknown>;
    requestMorePeers(): Promise<unknown>;
    getTrackerStats(): {
        connected: number;
        total: number;
    };
    destroy(): void;
    _peerRespond(peer: Peer, msgId: string): (msg: unknown) => Promise<unknown>;
    _chunkHandler(data: Partial<MsgData>): string | false;
    _destroyChunks(msgId: string): void;
    _defaultAnnounceOpts(opts?: Partial<AnnounceOpts>): Partial<AnnounceOpts>;
    _fetchPeers(): void;
}
export { P2PT, Peer };
