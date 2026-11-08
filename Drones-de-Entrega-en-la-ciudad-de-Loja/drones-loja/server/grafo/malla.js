// MALLA: cada nodo del espacio aéreo es un ENTERO.  id = capa*CELDAS + fila*COLS + col
// Así dist/prev/bloqueado son Typed Arrays (memoria contigua, sin objetos para el recolector)
// y los vecinos se calculan con aritmética: no hay que guardar 80 000 aristas como objetos.
import { FILAS, COLS, CAPAS } from '../config.js';

export const CELDAS = FILAS * COLS;
export const TOTAL = CELDAS * CAPAS;

export const idDe = (f, c, l) => l * CELDAS + f * COLS + c;
export const capaDe = (id) => (id / CELDAS) | 0;
export const filaDe = (id) => ((id % CELDAS) / COLS) | 0;
export const colDe = (id) => id % COLS;

// Los 10 vecinos: 8 horizontales (incluye diagonales) + subir + bajar.
const DF = Int8Array.of(-1, -1, -1, 0, 0, 1, 1, 1, 0, 0);
const DC = Int8Array.of(-1, 0, 1, -1, 1, -1, 0, 1, 0, 0);
const DL = Int8Array.of(0, 0, 0, 0, 0, 0, 0, 0, 1, -1);

export function vecino(id, k) {
  const f = filaDe(id) + DF[k], c = colDe(id) + DC[k], l = capaDe(id) + DL[k];
  if (f < 0 || f >= FILAS || c < 0 || c >= COLS || l < 0 || l >= CAPAS) return -1;
  return idDe(f, c, l);
}
