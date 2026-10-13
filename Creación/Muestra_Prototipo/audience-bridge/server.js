// Puente de audiencia de Orquideorama: celulares (socket.io) -> TouchDesigner (OSC/UDP)
// Misma API OSC que TDAudienceBridgeRx (/audience/v1/...), mas un mensaje nuevo para los sliders.
const express = require('express');
const http = require('http');
const dgram = require('dgram');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const PORT = Number(process.env.PORT || 3000);
const TD_HOST = process.env.TD_HOST || '127.0.0.1';
const TD_PORT = Number(process.env.TD_PORT || 7000);
const SLIDERS = ['movimiento', 'ruido', 'multitud'];

// URL publica del tunel (Dev Tunnels / ngrok / cualquier proxy). No se usa ninguna IP:
// se toma de la variable PUBLIC_URL o de config.json ({"publicUrl": "https://....devtunnels.ms"}).
function readPublicUrl() {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL;
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')).publicUrl || ''; }
  catch (e) { return ''; }
}

// ---------- OSC minimo (sin dependencias) ----------
const F = (v) => ({ f: Number(v) });                 // marca un argumento como float32
function oscStr(s) {
  const b = Buffer.from(s + '\0', 'utf8');
  return Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4)]);
}
function oscMessage(address, args) {
  let tags = ',';
  const parts = [];
  for (const a of args) {
    if (typeof a === 'string') { tags += 's'; parts.push(oscStr(a)); }
    else if (a && typeof a.f === 'number') { tags += 'f'; const b = Buffer.alloc(4); b.writeFloatBE(a.f); parts.push(b); }
    else { tags += 'i'; const b = Buffer.alloc(4); b.writeInt32BE(Math.trunc(a)); parts.push(b); }
  }
  return Buffer.concat([oscStr(address), oscStr(tags), ...parts]);
}
const udp = dgram.createSocket('udp4');
function sendOSC(address, args) {
  const m = oscMessage(address, args);
  udp.send(m, TD_PORT, TD_HOST, (err) => { if (err) console.error('OSC error:', err.message); });
}

// ---------- servidor web + socket.io ----------
const app = express();
app.set('trust proxy', true);   // detras de Dev Tunnels / proxy HTTPS
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true },                 // el celular puede abrir la pagina desde cualquier dominio del tunel
  transports: ['websocket', 'polling'],   // websocket primero; polling de respaldo
  pingInterval: 10000, pingTimeout: 20000,
});
app.use(express.static(__dirname + '/public'));
app.get('/', (req, res) => res.redirect('/mobile/'));
app.get('/ping', (req, res) => res.type('text').send('ok'));   // para comprobar que el tunel llega al puente

let nextId = 1;
const people = new Map();        // socket.id -> { id, values:{}, dirty:Set }
const started = Date.now();
let beat = 0;

io.on('connection', (socket) => {
  const p = { id: nextId++, values: {}, dirty: new Set() };
  people.set(socket.id, p);
  socket.emit('welcome', { id: p.id, sliders: SLIDERS });
  sendOSC('/audience/v1/participant/join', [p.id]);
  console.log('+ participante', p.id, '(' + people.size + ' conectados)');

  socket.on('slider', (msg) => {
    if (!msg || !SLIDERS.includes(msg.name)) return;
    let v = Number(msg.value);
    if (!Number.isFinite(v)) return;
    v = Math.min(1, Math.max(0, v));
    p.values[msg.name] = v;
    p.dirty.add(msg.name);
  });

  socket.on('disconnect', () => {
    people.delete(socket.id);
    sendOSC('/audience/v1/participant/leave', [p.id]);
    console.log('- participante', p.id, '(' + people.size + ' conectados)');
  });
});

// Envia solo lo que cambio, 20 veces por segundo como maximo (aunque haya muchos celulares)
setInterval(() => {
  for (const p of people.values()) {
    for (const name of p.dirty) sendOSC('/audience/v1/participant/slider', [p.id, name, F(p.values[name])]);
    p.dirty.clear();
  }
}, 50);

// Latido del sistema, para que TouchDesigner sepa que el puente esta vivo
setInterval(() => {
  beat++;
  sendOSC('/audience/v1/system/status', [1]);
  sendOSC('/audience/v1/system/heartbeat', [beat]);
  sendOSC('/audience/v1/system/connections', [people.size]);
  sendOSC('/audience/v1/system/uptime', [F((Date.now() - started) / 1000)]);
}, 1000);

server.listen(PORT, () => {
  const pub = readPublicUrl().replace(/\/+$/, '');
  console.log('\n=== Puente de audiencia Orquideorama ===');
  console.log('OSC -> ' + TD_HOST + ':' + TD_PORT + '   |   puerto web: ' + PORT);
  if (pub) console.log('Celulares (pagina publica):  ' + pub + '/mobile/');
  else console.log('Falta la URL del tunel: escribela en config.json ("publicUrl") o con la variable PUBLIC_URL.');
  console.log('Prueba local:                http://localhost:' + PORT + '/mobile/');
  console.log('Recuerda: el puerto ' + PORT + ' del tunel debe tener acceso publico (anonimo).\n');
});
