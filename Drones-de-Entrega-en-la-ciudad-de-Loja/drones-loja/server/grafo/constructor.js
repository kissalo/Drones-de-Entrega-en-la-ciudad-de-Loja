// CONSTRUCTOR del grafo multicapa 3D (lista de adyacencia implícita en arreglos paralelos).
// La arista e = nodo*GRADO + k  guarda: destino, distancia 3D, desnivel, dirección y si está bloqueada.
// Todo vive en Typed Arrays de tamaño fijo → O(V) de memoria, V = FILAS*COLS*CAPAS.

//Asegura que el dron no choque con edificios y que no vuele 
//por debajo del terreno, recalcula la ruta de la zona afectada

import { COLS, GRADO, TAM_CELDA, ALTURAS_CAPA, MARGEN_SEGURIDAD_M } from '../config.js';
import { TOTAL, CELDAS, filaDe, colDe, capaDe, vecino } from './malla.js';

export function construirGrafo(terreno, octree) {
  const g = {
    total: TOTAL,
    terreno,
    x: new Float32Array(TOTAL), y: new Float32Array(TOTAL), z: new Float32Array(TOTAL),
    bloqueado: new Uint8Array(TOTAL),
    dest: new Int32Array(TOTAL * GRADO).fill(-1),
    dist: new Float32Array(TOTAL * GRADO),
    dz: new Float32Array(TOTAL * GRADO),
    ux: new Float32Array(TOTAL * GRADO),
    uy: new Float32Array(TOTAL * GRADO),
    aristaBloq: new Uint8Array(TOTAL * GRADO).fill(1),
  };
  for (let id = 0; id < TOTAL; id++) {
    const f = filaDe(id), c = colDe(id);
    g.x[id] = c * TAM_CELDA;
    g.y[id] = f * TAM_CELDA;
    g.z[id] = terreno[f * COLS + c] + ALTURAS_CAPA[capaDe(id)]; // la malla "sigue" el relieve
    g.bloqueado[id] = octree.contienePunto(g.x[id], g.y[id], g.z[id]) ? 1 : 0;
  }
  for (let id = 0; id < TOTAL; id++) for (let k = 0; k < GRADO; k++) calcularArista(g, octree, id, k);
  return g;
}

// Una arista queda bloqueada si toca un nodo bloqueado o si el SEGMENTO atraviesa un obstáculo
// (así no se "corta la esquina" de un edificio entre dos nodos libres).
function calcularArista(g, octree, u, k) {
  const e = u * GRADO + k;
  const v = vecino(u, k);
  g.dest[e] = v;
  if (v < 0) { g.aristaBloq[e] = 1; return; }
  const dx = g.x[v] - g.x[u], dy = g.y[v] - g.y[u], dz = g.z[v] - g.z[u];
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
  g.dist[e] = d; g.dz[e] = dz; g.ux[e] = dx / d; g.uy[e] = dy / d;
  let bloq = g.bloqueado[u] || g.bloqueado[v];
  const pasos = Math.max(1, Math.ceil(d / (TAM_CELDA / 4)));
  for (let i = 1; i < pasos && !bloq; i++) {
    const t = i / pasos;
    bloq = octree.contienePunto(g.x[u] + dx * t, g.y[u] + dy * t, g.z[u] + dz * t);
  }
  g.aristaBloq[e] = bloq ? 1 : 0;
}

// RF-05 / RF-08: un sensor detecta un obstáculo nuevo en vuelo. Entra al Octree y solo se
// recalcula la región afectada (no todo el grafo). Los obstáculos solo se agregan, nunca se quitan.
// o = {x, y, z, radio}  (metros locales; z = altitud absoluta)
export function agregarObstaculoDinamico(g, octree, o) {
  octree.insertar(
    { minx: o.x - o.radio, miny: o.y - o.radio, minz: o.z - o.radio,
      maxx: o.x + o.radio, maxy: o.y + o.radio, maxz: o.z + o.radio },
    MARGEN_SEGURIDAD_M,
  );
  const r = o.radio + MARGEN_SEGURIDAD_M;
  const f0 = Math.max(0, Math.floor((o.y - r) / TAM_CELDA) - 1);
  const f1 = Math.floor((o.y + r) / TAM_CELDA) + 1;
  const c0 = Math.max(0, Math.floor((o.x - r) / TAM_CELDA) - 1);
  const c1 = Math.floor((o.x + r) / TAM_CELDA) + 1;
  const nCapas = TOTAL / CELDAS;
  const ids = [];
  for (let l = 0; l < nCapas; l++)
    for (let f = f0; f <= f1; f++)
      for (let c = c0; c <= c1; c++) {
        if (c >= COLS || f >= CELDAS / COLS) continue;
        const id = l * CELDAS + f * COLS + c;
        if (!g.bloqueado[id] && octree.contienePunto(g.x[id], g.y[id], g.z[id])) g.bloqueado[id] = 1;
        ids.push(id);
      }
  for (const id of ids) for (let k = 0; k < GRADO; k++) calcularArista(g, octree, id, k);
  return ids.length;
}
