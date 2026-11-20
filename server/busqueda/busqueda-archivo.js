// BÚSQUEDA EN ARCHIVO, con conteo de COMPARACIONES y de LECTURAS A DISCO. Sin .find() / .indexOf() / .sort().
//
//  1) Secuencial sobre el archivo: lee bloque a bloque, recorre línea a línea y compara la clave de cada una.
//        Tiempo O(n) · comparaciones = posición de la clave (n si no existe) · lecturas = bloques leídos hasta encontrarla.
//  2) Binaria sobre el índice: el índice está en memoria y ordenado; se busca la posición en bytes con O(log n)
//        comparaciones y luego se hace UNA lectura a disco (un readSync) para traer solo ese registro.
//        Si la clave no existe, se sabe solo con el índice: 0 lecturas a disco.
//
// "Lectura a disco" = una llamada a fs.readSync. La secuencial lee bloques de 64 KB; la binaria lee solo la línea del registro.
import fs from 'node:fs';
import { recorrerLineas, claveDeLinea } from './lector-lineas.js';

export function busquedaSecuencialArchivo(rutaDatos, clave, campoClave = 'codigo') {
  let comparaciones = 0, registro = null;
  const { lecturasDisco, lineas } = recorrerLineas(rutaDatos, (data, ini, fin) => {
    comparaciones++;
    if (claveDeLinea(data, ini, fin, campoClave) === clave) {
      registro = JSON.parse(data.toString('utf8', ini, fin));   // se decodifica SOLO la línea encontrada
      return true;                                              // detener la lectura
    }
    return false;
  });
  return { encontrado: registro !== null, registro, comparaciones, lecturasDisco, lineasLeidas: lineas };
}

// Manejador del archivo de datos abierto, para la búsqueda binaria (cuenta cada lectura).
export class ArchivoRegistros {
  constructor(ruta) {
    this.fd = fs.openSync(ruta, 'r');
    this.lecturasDisco = 0;
    this.bufer = Buffer.allocUnsafe(4096);
  }
  leerRegistro(offset, largo) {
    if (largo > this.bufer.length) this.bufer = Buffer.allocUnsafe(largo);
    fs.readSync(this.fd, this.bufer, 0, largo, offset);   // acceso directo por posición en bytes
    this.lecturasDisco++;
    return JSON.parse(this.bufer.toString('utf8', 0, largo));
  }
  cerrar() { fs.closeSync(this.fd); }
}

export function busquedaBinariaIndice(indice, archivo, clave) {
  const lecturasAntes = archivo.lecturasDisco;
  let bajo = 0, alto = indice.n - 1, comparaciones = 0;
  while (bajo <= alto) {
    const medio = (bajo + alto) >>> 1;
    const actual = indice.claves[medio];
    comparaciones++;                                  // una comparación de clave por iteración
    if (actual === clave) {
      const registro = archivo.leerRegistro(indice.offsets[medio], indice.largos[medio]);
      return { encontrado: true, registro, comparaciones, lecturasDisco: archivo.lecturasDisco - lecturasAntes };
    }
    if (actual < clave) bajo = medio + 1; else alto = medio - 1;
  }
  return { encontrado: false, registro: null, comparaciones, lecturasDisco: archivo.lecturasDisco - lecturasAntes };
}
