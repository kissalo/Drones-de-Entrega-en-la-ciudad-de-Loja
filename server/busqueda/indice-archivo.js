// ÍNDICE DE ARCHIVO: para cada registro guarda (clave → posición en bytes y longitud de su línea), ordenado por clave.
//  - Se construye con UNA sola pasada de lectura por bloques (O(n) tiempo, O(n) memoria).
//  - Vive en Typed Arrays (Float64Array / Uint32Array): ~20 bytes por registro, sin objetos por registro.
//  - Si el archivo ya está ordenado por la clave (como deja el Avance 1), el índice queda ordenado sin trabajo extra.
//    Si no, se ordena con el MergeSort propio del proyecto (no con .sort()).
//  - Se puede guardar en disco (.idx) y volver a cargar sin releer el archivo de datos.
import fs from 'node:fs';
import { recorrerLineas, claveDeLinea } from './lector-lineas.js';
import { mergeSort } from '../ordenamiento/merge-sort.js';

const MAGIA = 'IDX1';

// campoClave debe ser un campo numérico y único en cada registro (por ejemplo 'codigo').
export function construirIndice(rutaDatos, campoClave = 'codigo') {
  const claves = [], offsets = [], largos = [];
  let ordenado = true, anterior = -Infinity;
  const { lecturasDisco } = recorrerLineas(rutaDatos, (data, ini, fin, offset) => {
    const clave = claveDeLinea(data, ini, fin, campoClave);
    if (typeof clave !== 'number' || Number.isNaN(clave)) throw new Error(`Registro sin clave numérica "${campoClave}" en el byte ${offset}`);
    if (clave <= anterior) ordenado = false;     // el archivo no está ordenado (o hay claves repetidas)
    anterior = clave;
    claves.push(clave); offsets.push(offset); largos.push(fin - ini);
  });

  let c = claves, o = offsets, l = largos;
  if (!ordenado) {                                // ordenar las ENTRADAS del índice por clave, no el archivo
    const entradas = claves.map((clave, i) => ({ clave, offset: offsets[i], largo: largos[i] }));
    const ord = mergeSort(entradas, (a, b) => a.clave - b.clave);
    c = ord.map((e) => e.clave); o = ord.map((e) => e.offset); l = ord.map((e) => e.largo);
  }
  return {
    n: c.length, campoClave, archivoOrdenado: ordenado, lecturasDisco,
    claves: Float64Array.from(c), offsets: Float64Array.from(o), largos: Uint32Array.from(l),
  };
}

// Formato binario: 'IDX1' | n (uint32) | claves (n×float64) | offsets (n×float64) | largos (n×uint32)
export function guardarIndice(indice, rutaIdx) {
  const cab = Buffer.alloc(8);
  cab.write(MAGIA, 0, 'ascii'); cab.writeUInt32LE(indice.n, 4);
  const vista = (ta) => Buffer.from(ta.buffer, ta.byteOffset, ta.byteLength);
  fs.writeFileSync(rutaIdx, Buffer.concat([cab, vista(indice.claves), vista(indice.offsets), vista(indice.largos)]));
}

export function cargarIndice(rutaIdx, campoClave = 'codigo') {
  const b = fs.readFileSync(rutaIdx);
  if (b.toString('ascii', 0, 4) !== MAGIA) throw new Error('Archivo de índice inválido');
  const n = b.readUInt32LE(4);
  const copia = (ini, bytes) => b.buffer.slice(b.byteOffset + ini, b.byteOffset + ini + bytes);   // copia alineada
  return {
    n, campoClave, archivoOrdenado: true, lecturasDisco: 1,
    claves: new Float64Array(copia(8, n * 8)),
    offsets: new Float64Array(copia(8 + n * 8, n * 8)),
    largos: new Uint32Array(copia(8 + n * 16, n * 4)),
  };
}
