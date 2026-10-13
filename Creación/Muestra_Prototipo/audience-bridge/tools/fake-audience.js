// Simula N celulares moviendo sliders (para probar sin gente). Uso: npm run fake -- 8
const { io } = require('socket.io-client');
const N = Number(process.argv[2] || 6);
const URL = process.env.URL || 'http://localhost:3000';
for (let i = 0; i < N; i++) {
  const s = io(URL);
  const ph = [Math.random() * 6, Math.random() * 6, Math.random() * 6];
  const sp = [0.2 + Math.random() * 0.5, 0.2 + Math.random() * 0.5, 0.1 + Math.random() * 0.3];
  const names = ['movimiento', 'ruido', 'multitud'];
  s.on('connect', () => {
    let t = 0;
    setInterval(() => {
      t += 0.1;
      names.forEach((n, k) => s.emit('slider', { name: n, value: 0.5 + 0.5 * Math.sin(t * sp[k] + ph[k]) }));
    }, 100);
  });
}
console.log('Simulando ' + N + ' celulares en ' + URL);
