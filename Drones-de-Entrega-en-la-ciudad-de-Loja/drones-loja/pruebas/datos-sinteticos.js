// Genera N edificios sintéticos con el MISMO formato de data/edificios.ndjson, para medir tiempos con
// datasets grandes (el archivo real solo tiene ~167 registros). Es determinista: misma semilla, mismos datos.
import { ANCHO_X, ALTO_Y } from '../server/config.js';

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function generarEdificios(n, semilla = 2026) {
  const rnd = mulberry32(semilla);
  const lista = new Array(n);
  for (let i = 0; i < n; i++) {
    const w = 30 + rnd() * 60, d = 30 + rnd() * 60;
    const cx = ANCHO_X * (0.08 + 0.84 * rnd()), cy = ALTO_Y * (0.08 + 0.84 * rnd());
    const altura = +(8 + rnd() * rnd() * 85).toFixed(1);
    lista[i] = { id: i + 1, xmin: +(cx - w / 2).toFixed(1), ymin: +(cy - d / 2).toFixed(1),
      xmax: +(cx + w / 2).toFixed(1), ymax: +(cy + d / 2).toFixed(1), zmax: +(2100 + altura).toFixed(1), altura };
  }
  return lista;
}
