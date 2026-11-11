// Carga de archivos por STREAMS: se leen por trozos (una línea a la vez) y cada dato se coloca
// directamente en su estructura final. La memoria extra para leer el archivo es O(1),
// no O(tamaño del archivo) como con fs.readFileSync.

//Nos indican la ubicacion de las estaciones de carga e indica los puntos obligatorios de carga 
//para que el dron no se muera en el aire

import fs from 'node:fs';
import readline from 'node:readline';
import { FILAS, COLS, MARGEN_SEGURIDAD_M } from '../config.js';

function lineas(ruta) {
  return readline.createInterface({
    input: fs.createReadStream(ruta, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
}

// elevacion.csv: FILAS líneas con COLS valores (m s. n. m.), una línea por fila de la malla.
export async function cargarElevacion(ruta) {
  const terreno = new Float32Array(FILAS * COLS);
  let f = 0;
  for await (const l of lineas(ruta)) {
    if (!l.trim()) continue;
    const p = l.split(',');
    if (f >= FILAS || p.length !== COLS) throw new Error(`elevacion.csv: tamaño distinto de ${FILAS}x${COLS}`);
    for (let c = 0; c < COLS; c++) terreno[f * COLS + c] = Number(p[c]);
    f++;
  }
  if (f !== FILAS) throw new Error(`elevacion.csv: faltan filas (${f}/${FILAS})`);
  return terreno;
}

// edificios.ndjson: un JSON por línea {xmin,ymin,xmax,ymax,zmax,altura}
// (metros locales; zmax = altitud absoluta de la azotea). Cada uno entra al Octree con margen.
export async function cargarEdificios(ruta, octree) {
  let n = 0;
  for await (const l of lineas(ruta)) {
    if (!l.trim()) continue;
    const e = JSON.parse(l);
    octree.insertar(
      { minx: e.xmin, miny: e.ymin, minz: 0, maxx: e.xmax, maxy: e.ymax, maxz: e.zmax },
      MARGEN_SEGURIDAD_M,
    );
    n++;
  }
  return n;
}

// cargadores.json es pequeño: [{id, fila, col}]
export async function cargarCargadores(ruta) {
  return JSON.parse(await fs.promises.readFile(ruta, 'utf8'));
}
