// Pruebas de la búsqueda en archivo indexado. Ejecuta: npm run prueba:busqueda
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { construirIndice, guardarIndice, cargarIndice, busquedaSecuencialArchivo, busquedaBinariaIndice, ArchivoRegistros } from '../server/busqueda/index.js';
import { generarArchivoRegistros } from './generar-archivo-indexado.js';

let fallos = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fallos++; };
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'idx-'));
const N = 20000;
const techo = (n) => Math.floor(Math.log2(n)) + 1;

for (const desordenado of [false, true]) {
  const etq = desordenado ? 'archivo DESORDENADO' : 'archivo ordenado';
  const { ruta, claves } = generarArchivoRegistros(N, { desordenado, dir });
  const indice = construirIndice(ruta, 'codigo');
  const archivo = new ArchivoRegistros(ruta);

  ok(indice.n === N, `${etq}: el índice tiene ${N} entradas`);
  ok(indice.archivoOrdenado === !desordenado, `${etq}: detecta si el archivo está ordenado por la clave`);
  let ordenado = true; for (let i = 1; i < indice.n; i++) if (indice.claves[i - 1] >= indice.claves[i]) ordenado = false;
  ok(ordenado, `${etq}: el índice queda ordenado por clave`);

  // cada offset del índice apunta realmente al registro de esa clave
  let apuntaBien = true;
  for (let i = 0; i < indice.n; i += 97) if (archivo.leerRegistro(indice.offsets[i], indice.largos[i]).codigo !== indice.claves[i]) apuntaBien = false;
  ok(apuntaBien, `${etq}: las posiciones en bytes apuntan al registro correcto`);

  // ambos métodos encuentran el mismo registro; se verifican los conteos
  const casos = [claves[0], claves[N - 1], claves[N >> 1], claves[12345], claves[777]];
  let iguales = true, binOk = true, lecOk = true;
  for (const k of casos) {
    const s = busquedaSecuencialArchivo(ruta, k), b = busquedaBinariaIndice(indice, archivo, k);
    if (!s.encontrado || !b.encontrado || s.registro.codigo !== k || b.registro.codigo !== k || s.registro.id !== b.registro.id) iguales = false;
    if (b.comparaciones > techo(N)) binOk = false;
    if (b.lecturasDisco !== 1) lecOk = false;
  }
  ok(iguales, `${etq}: secuencial y binaria devuelven el mismo registro`);
  ok(binOk, `${etq}: binaria usa a lo sumo ⌊log2 n⌋+1 = ${techo(N)} comparaciones`);
  ok(lecOk, `${etq}: binaria hace exactamente 1 lectura a disco por clave encontrada`);

  // secuencial: en archivo ordenado, comparaciones = posición + 1 (primera → 1, última → n)
  if (!desordenado) {
    ok(busquedaSecuencialArchivo(ruta, claves[0]).comparaciones === 1, `${etq}: secuencial, primera clave → 1 comparación`);
    ok(busquedaSecuencialArchivo(ruta, claves[N - 1]).comparaciones === N, `${etq}: secuencial, última clave → ${N} comparaciones`);
  }

  // clave inexistente: la secuencial recorre todo el archivo; la binaria lo sabe con el índice y 0 lecturas
  const ausente = claves[100] + 0.5;
  const s = busquedaSecuencialArchivo(ruta, ausente), b = busquedaBinariaIndice(indice, archivo, ausente);
  ok(!s.encontrado && s.comparaciones === N && s.lineasLeidas === N, `${etq}: clave inexistente → secuencial lee las ${N} líneas`);
  ok(!b.encontrado && b.lecturasDisco === 0 && b.comparaciones <= techo(N), `${etq}: clave inexistente → binaria 0 lecturas a disco`);
  ok(s.lecturasDisco === Math.ceil(fs.statSync(ruta).size / 65536), `${etq}: secuencial cuenta los bloques de 64 KB leídos`);
  archivo.cerrar();
}

// guardar y cargar el índice en disco
{
  const { ruta } = generarArchivoRegistros(5000, { dir });
  const a = construirIndice(ruta), rutaIdx = path.join(dir, 'x.idx');
  guardarIndice(a, rutaIdx);
  const b = cargarIndice(rutaIdx);
  let igual = a.n === b.n;
  for (let i = 0; igual && i < a.n; i++) if (a.claves[i] !== b.claves[i] || a.offsets[i] !== b.offsets[i] || a.largos[i] !== b.largos[i]) igual = false;
  ok(igual, 'guardar/cargar el índice (.idx) conserva claves, posiciones y longitudes');
}

// borde: archivo de 1 registro y vacío
{
  const r1 = path.join(dir, 'uno.ndjson'); fs.writeFileSync(r1, '{"codigo":5,"x":1}');   // sin salto de línea final
  const i1 = construirIndice(r1), f1 = new ArchivoRegistros(r1);
  ok(busquedaBinariaIndice(i1, f1, 5).encontrado && busquedaSecuencialArchivo(r1, 5).encontrado, 'archivo de 1 registro sin salto de línea final');
  f1.cerrar();
  const r0 = path.join(dir, 'vacio.ndjson'); fs.writeFileSync(r0, '');
  const i0 = construirIndice(r0), f0 = new ArchivoRegistros(r0);
  ok(!busquedaBinariaIndice(i0, f0, 5).encontrado && !busquedaSecuencialArchivo(r0, 5).encontrado, 'archivo vacío: no encuentra nada y no falla');
  f0.cerrar();
}

fs.rmSync(dir, { recursive: true, force: true });
console.log(fallos ? `\n${fallos} prueba(s) fallaron` : '\nTodas las pruebas de búsqueda en archivo pasaron');
process.exit(fallos ? 1 : 0);
