// Genera datos SINTÉTICOS de demostración (relieve ondulado + edificios al azar) para probar el sistema.
// Para el informe, reemplaza estos 3 archivos con datos reales de Loja (OpenStreetMap + modelo digital
// de elevación) en el MISMO formato; usa latLonAMetros() de server/config.js para convertir.
import fs from 'node:fs';
import { FILAS, COLS, TAM_CELDA, ANCHO_X, ALTO_Y } from '../server/config.js';

const dir = new URL('./', import.meta.url);
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rnd = mulberry32(2026);

// elevacion.csv — relieve irregular alrededor de los 2100 m
const T = [];
for (let f = 0; f < FILAS; f++) {
  const fila = [];
  for (let c = 0; c < COLS; c++)
    fila.push(+(2100 + 70 * Math.sin(c / 6.5) * Math.cos(f / 8) + 35 * Math.sin((c + f) / 4.2) + f * 0.8).toFixed(1));
  T.push(fila);
}
fs.writeFileSync(new URL('elevacion.csv', dir), T.map((r) => r.join(',')).join('\n') + '\n');

// cargadores.json
const cargadores = [{ id: 'C1', fila: 10, col: 10 }, { id: 'C2', fila: 20, col: 26 }, { id: 'C3', fila: 31, col: 12 }];
fs.writeFileSync(new URL('cargadores.json', dir), JSON.stringify(cargadores, null, 2) + '\n');

// edificios.ndjson — uno por línea; zmax = azotea absoluta = terreno + altura
const lineas = [];
const sobreCargador = (b) => cargadores.some((c) => {
  const cx = c.col * TAM_CELDA, cy = c.fila * TAM_CELDA;
  return cx > b.xmin - 40 && cx < b.xmax + 40 && cy > b.ymin - 40 && cy < b.ymax + 40;
});
for (let i = 0; i < 170; i++) {
  const w = 30 + rnd() * 60, d = 30 + rnd() * 60;
  const cx = ANCHO_X * (0.08 + 0.84 * rnd()), cy = ALTO_Y * (0.08 + 0.84 * rnd());
  const altura = i < 8 ? 110 + rnd() * 25 : 8 + rnd() * rnd() * 85;
  const f = Math.min(FILAS - 1, Math.round(cy / TAM_CELDA)), c = Math.min(COLS - 1, Math.round(cx / TAM_CELDA));
  const b = { xmin: +(cx - w / 2).toFixed(1), ymin: +(cy - d / 2).toFixed(1), xmax: +(cx + w / 2).toFixed(1),
              ymax: +(cy + d / 2).toFixed(1), zmax: +(T[f][c] + altura).toFixed(1), altura: +altura.toFixed(1) };
  if (!sobreCargador(b)) lineas.push(JSON.stringify(b));
}
fs.writeFileSync(new URL('edificios.ndjson', dir), lineas.join('\n') + '\n');
console.log(`Datos demo: ${FILAS}x${COLS} celdas, ${lineas.length} edificios, ${cargadores.length} cargadores`);
