// BÚSQUEDA EN ARCHIVO INDEXADO (Avance 2). Mismos algoritmos, pero los datos están en un archivo binario
// de registros de LONGITUD FIJA, ordenado por id: el registro i está en el byte i * 16 (acceso directo).
//
// Registro (16 bytes, little-endian): [ id: Int32 | reservado: Int32 | altura: Float64 ]
//
// Convención: 1 comparación = 1 registro examinado; 1 lectura = 1 llamada fs.readSync.
// Ambas funciones devuelven { encontrado, indice, comparaciones, lecturas } como las de memoria.
// Usan fs.readSync (no se carga el archivo completo en memoria) y buffers reutilizables.
import fs from 'node:fs';

export const TAM_REGISTRO = 16;
export const TAM_BLOQUE = TAM_REGISTRO * 4096;   // 65 536 B (64 KiB) por lectura en el barrido secuencial

// Escribe el dataset (ya ordenado por id) como archivo binario.
export function escribirArchivoIndexado(ruta, dataset) {
  const fd = fs.openSync(ruta, 'w');
  const porLote = 4096;
  const buf = Buffer.alloc(porLote * TAM_REGISTRO);
  let i = 0;
  while (i < dataset.length) {
    const cuantos = Math.min(porLote, dataset.length - i);
    for (let j = 0; j < cuantos; j++) {
      const off = j * TAM_REGISTRO;
      buf.writeInt32LE(dataset[i + j].id, off);
      buf.writeInt32LE(0, off + 4);
      buf.writeDoubleLE(dataset[i + j].altura, off + 8);
    }
    fs.writeSync(fd, buf, 0, cuantos * TAM_REGISTRO);
    i += cuantos;
  }
  fs.closeSync(fd);
}

// Buffers reutilizables (así no se reserva memoria en cada consulta).
export function crearBloque() {
  const buf = Buffer.alloc(TAM_BLOQUE);   // un Buffer.alloc de este tamaño empieza en el byte 0 (alineado)
  return { buf, i32: new Int32Array(buf.buffer, buf.byteOffset, buf.length >> 2) };
}
export const crearRegistro = () => Buffer.alloc(TAM_REGISTRO);

// SECUENCIAL en archivo: lee bloques de 64 KiB seguidos y examina registro por registro. O(n).
export function busquedaSecuencialArchivo(fd, n, objetivo, bloque) {
  const { buf, i32 } = bloque;
  const porBloque = TAM_BLOQUE / TAM_REGISTRO;
  let comparaciones = 0, lecturas = 0, leidos = 0;
  while (leidos < n) {
    const cuantos = Math.min(porBloque, n - leidos);
    fs.readSync(fd, buf, 0, cuantos * TAM_REGISTRO, leidos * TAM_REGISTRO);
    lecturas++;
    for (let j = 0; j < cuantos; j++) {
      comparaciones++;
      if (i32[j * 4] === objetivo) return { encontrado: true, indice: leidos + j, comparaciones, lecturas };
    }
    leidos += cuantos;
  }
  return { encontrado: false, indice: -1, comparaciones, lecturas };
}

// BINARIA en archivo: una lectura de 16 B por paso, en el registro central. O(log n) lecturas.
export function busquedaBinariaArchivo(fd, n, objetivo, reg) {
  let comparaciones = 0, lecturas = 0;
  let izq = 0, der = n - 1;
  while (izq <= der) {
    const medio = izq + Math.floor((der - izq) / 2);
    fs.readSync(fd, reg, 0, TAM_REGISTRO, medio * TAM_REGISTRO);
    lecturas++;
    comparaciones++;
    const valor = reg.readInt32LE(0);
    if (valor === objetivo) return { encontrado: true, indice: medio, comparaciones, lecturas };
    if (valor < objetivo) izq = medio + 1;
    else der = medio - 1;
  }
  return { encontrado: false, indice: -1, comparaciones, lecturas };
}