// LECTURA POR BLOQUES de un archivo NDJSON (un JSON por línea), contando cada lectura a disco.
// Se lee con fs.readSync en bloques de TAM_BLOQUE bytes y las líneas se separan "a mano" (sin .indexOf ni .split):
// así se puede saber exactamente cuántas veces se accede al disco y en qué posición en bytes empieza cada línea.
import fs from 'node:fs';

export const TAM_BLOQUE = 64 * 1024;   // 64 KB por lectura
const SALTO = 10, RETORNO = 13;

// Recorre el archivo y llama a alLinea(data, ini, fin, offsetAbsoluto) por cada línea NO vacía.
// Si alLinea devuelve true, la lectura se detiene (sirve para la búsqueda secuencial).
// Devuelve { lecturasDisco, lineas }.
export function recorrerLineas(ruta, alLinea) {
  const fd = fs.openSync(ruta, 'r');
  const buf = Buffer.allocUnsafe(TAM_BLOQUE);
  let lecturasDisco = 0, lineas = 0;
  let pendiente = Buffer.alloc(0);   // fragmento de una línea que quedó cortada al final del bloque
  let posDatos = 0;                  // posición absoluta (en bytes) del primer byte de 'data'
  let detener = false;
  try {
    for (;;) {
      const n = fs.readSync(fd, buf, 0, TAM_BLOQUE, null);
      if (n === 0) break;
      lecturasDisco++;
      const data = pendiente.length ? Buffer.concat([pendiente, buf.subarray(0, n)]) : buf.subarray(0, n);
      let ini = 0;
      for (let i = 0; i < data.length && !detener; i++) {
        if (data[i] !== SALTO) continue;
        let fin = i;
        if (fin > ini && data[fin - 1] === RETORNO) fin--;
        if (fin > ini) { lineas++; if (alLinea(data, ini, fin, posDatos + ini)) detener = true; }
        ini = i + 1;
      }
      if (detener) return { lecturasDisco, lineas };
      pendiente = Buffer.from(data.subarray(ini));   // copia: 'buf' se reutiliza en la siguiente lectura
      posDatos += ini;
    }
    // última línea sin salto de línea final
    let fin = pendiente.length;
    if (fin > 0 && pendiente[fin - 1] === RETORNO) fin--;
    if (fin > 0) { lineas++; alLinea(pendiente, 0, fin, posDatos); }
    return { lecturasDisco, lineas };
  } finally {
    fs.closeSync(fd);
  }
}

// Extrae el valor numérico de la clave de una línea. Camino rápido: la línea empieza con {"campo":<número>
// (no se decodifica toda la línea). Si el formato es otro, se usa JSON.parse como camino general.
export function claveDeLinea(data, ini, fin, campoClave) {
  const prefijo = prefijoDe(campoClave);
  let coincide = fin - ini > prefijo.length;
  for (let k = 0; coincide && k < prefijo.length; k++) if (data[ini + k] !== prefijo[k]) coincide = false;
  if (coincide) {
    let i = ini + prefijo.length, v = 0, digitos = 0;
    while (i < fin) { const d = data[i] - 48; if (d < 0 || d > 9) break; v = v * 10 + d; i++; digitos++; }
    if (digitos > 0 && (i === fin || data[i] === 44 || data[i] === 125)) return v;   // sigue ',' o '}'
  }
  return JSON.parse(data.toString('utf8', ini, fin))[campoClave];
}

const cachePrefijos = new Map();
function prefijoDe(campo) {
  let p = cachePrefijos.get(campo);
  if (!p) { p = Buffer.from(`{"${campo}":`); cachePrefijos.set(campo, p); }
  return p;
}
