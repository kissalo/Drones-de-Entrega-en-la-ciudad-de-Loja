// Genera un archivo NDJSON de N edificios con una CLAVE numérica única "codigo" (con saltos, no consecutiva),
// para probar la búsqueda en archivo indexado. Los archivos grandes se guardan en data/generado/ (NO los subas a Git).
// Uso:  node pruebas/generar-archivo-indexado.js 50000 [--desordenado]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generarEdificios } from './datos-sinteticos.js';

export const DIR_GENERADO = fileURLToPath(new URL('../data/generado/', import.meta.url));

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Devuelve { ruta, n, claves } donde claves (Float64Array) está ORDENADA, aunque el archivo se escriba desordenado.
export function generarArchivoRegistros(n, { desordenado = false, dir = DIR_GENERADO, semilla = 2026 } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const ruta = path.join(dir, `edificios-${n}${desordenado ? '-desordenado' : ''}.ndjson`);
  const rnd = mulberry32(semilla + 1);
  const edificios = generarEdificios(n, semilla);
  const claves = new Float64Array(n);
  let codigo = 1000;
  const registros = edificios.map((e, i) => { codigo += 1 + Math.floor(rnd() * 9); claves[i] = codigo; return { codigo, ...e }; });
  if (desordenado) for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = registros[i]; registros[i] = registros[j]; registros[j] = t; }
  const fd = fs.openSync(ruta, 'w');
  try {
    for (let i = 0; i < n; i += 5000) {
      let bloque = '';
      for (let k = i; k < Math.min(n, i + 5000); k++) bloque += JSON.stringify(registros[k]) + '\n';
      fs.writeSync(fd, bloque);
    }
  } finally { fs.closeSync(fd); }
  return { ruta, n, claves };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const n = Number(process.argv[2] || 1000);
  const r = generarArchivoRegistros(n, { desordenado: process.argv.includes('--desordenado') });
  console.log(`Generado: ${r.ruta} (${n} registros, ${(fs.statSync(r.ruta).size / 1048576).toFixed(2)} MB)`);
}
