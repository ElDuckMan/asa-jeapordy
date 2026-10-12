'use strict';
/*
 * ASA Jeopardy — server
 * All game rules live in public/js/engine.js (shared with the in-browser preview).
 * This file only wires socket.io connections into the engine.
 */
const express = require('express');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { Server } = require('socket.io');
const { createEngine, EVENTS } = require('./public/js/engine.js');

const PORT = process.env.PORT || 3000;
const HOST_PIN = String(process.env.HOST_PIN || '1234');
if (!process.env.HOST_PIN) console.warn('[warn] HOST_PIN is not set; using default "1234". Set HOST_PIN in your environment.');

const app = express();
app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.get('/healthz', (_req, res) => res.type('text').send('ok'));

const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 2e6, pingInterval: 10000, pingTimeout: 8000 });

const sha = s => crypto.createHash('sha256').update(String(s ?? '')).digest();
const engine = createEngine({
  randomId: n => crypto.randomBytes(n).toString('hex'),
  randomInt: n => crypto.randomInt(n),
  checkPin: pin => crypto.timingSafeEqual(sha(pin), sha(HOST_PIN)),
  log: (ev, e) => console.error('[engine]', ev, e)
});

io.on('connection', socket => {
  const ip = String(socket.handshake.headers['x-forwarded-for'] || socket.handshake.address || '').split(',')[0].trim();
  const handle = engine.connect({ id: socket.id, ip, send: (ev, payload) => socket.emit(ev, payload) });
  for (const ev of EVENTS) socket.on(ev, (d, ack) => handle.handle(ev, d, ack));
  socket.on('disconnect', () => handle.disconnect());
});

/* Drop rooms idle for 12 hours. */
setInterval(() => engine.sweep(12 * 3600 * 1000), 30 * 60 * 1000).unref();

server.listen(PORT, () => console.log(`ASA Jeopardy running on http://localhost:${PORT}`));
