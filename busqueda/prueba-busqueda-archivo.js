// Pruebas de corrección de la búsqueda en archivo indexado. Ejecuta: node busqueda/prueba-busqueda-archivo.js
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { busquedaSecuencial } from './busqueda-secuencial.js';
import { busquedaBinaria } from './busqueda-binaria.js';
import { generarDatasetOrdenado } from './generador-datos.js';
import { escribirArchivoIndexado, busquedaSecuencialArchivo, busquedaBinariaArchivo, crearBloque, crearRegistro, TAM_REGISTRO } from './busqueda-archivo.js';

let fallos = 0, aserciones = 0;
const verificar = (cond, msg) => { aserciones++; if (!cond) { fallos++; console.log('  FALLA:', msg); } };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'busq-arch-'));
const bloque = crearBloque(), reg = crearRegistro();

for (const n of [0, 1, 2, 3, 7, 16, 1000, 5000]) {
  const datos = generarDatasetOrdenado(n, 'id');           // edificios del proyecto, ordenados con mergeSort por id
  const ruta = path.join(tmp, `a${n}.bin`);
  escribirArchivoIndexado(ruta, datos);
  verificar(fs.statSync(ruta).size === n * TAM_REGISTRO, `n=${n}: tamaño del archivo`);
  const fd = fs.openSync(ruta, 'r');
  const limite = n > 0 ? Math.floor(Math.log2(n)) + 1 : 0;

  // 1) cada id existente: los 4 algoritmos devuelven la misma posición
  for (let i = 0; i < n; i++) {
    const id = datos[i].id;
    const m1 = busquedaSecuencial(datos, id, 'id'), m2 = busquedaBinaria(datos, id, 'id');
    const a1 = busquedaSecuencialArchivo(fd, n, id, bloque), a2 = busquedaBinariaArchivo(fd, n, id, reg);
    verificar(m1.indice === i && m2.indice === i && a1.indice === i && a2.indice === i, `n=${n}: id ${id} no está en la posición ${i}`);
    verificar(a2.comparaciones <= limite, `n=${n}: binaria en archivo usó ${a2.comparaciones} > ${limite}`);
  }
  // 2) ids inexistentes: menor que todos, mayor que todos y 0
  for (const id of [-5, 0, n + 1, n + 1000]) {
    verificar(!busquedaSecuencialArchivo(fd, n, id, bloque).encontrado && !busquedaBinariaArchivo(fd, n, id, reg).encontrado, `n=${n}: id inexistente ${id}`);
  }
  fs.closeSync(fd);
  console.log(`n=${String(n).padStart(5)}: OK`);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(fallos === 0 ? `\nTODAS LAS PRUEBAS PASARON (${aserciones} aserciones)` : `\n${fallos} FALLO(S)`);
process.exit(fallos === 0 ? 0 : 1);