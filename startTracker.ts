import { Server } from 'bittorrent-tracker';

const server = new Server({
  udp: false,
  http: true,
  ws: true,
  stats: false
});

server.on('error', err => console.log(err.message));
server.on('warning', err => console.log(err.message));
server.on('listening', () => console.log(`listening on http port: ${server.http.address().port}`));
server.on('start', addr => console.log(`got start message from ${addr}`));
server.on('complete', addr => console.log(addr));
server.on('update', addr => console.log(`update from ${addr}`));
server.on('finish', addr => console.log(addr));
server.on('stop', addr => console.log(addr));

server.listen(process.env.PORT || '5000', '0.0.0.0');
