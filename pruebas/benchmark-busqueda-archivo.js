import { construirIndice, busquedaSecuencialArchivo, busquedaBinariaIndice, ArchivoRegistros } from '../server/busqueda/index.js';
import { generarArchivoRegistros } from './generar-archivo-indexado.js';

const RAPIDO = process.argv.includes('--rapido');
const VOLUMENES = RAPIDO ? [1000, 5000] : [1000, 50000, 500000];
const REPETICIONES = RAPIDO ? 3 : 7;
const ALEATORIAS = RAPIDO ? 20 : 100;
const MB = 1024 * 1024;

function rng(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = rng(11);
const prom = (v) => v.reduce((s, x) => s + x, 0) / v.length;
const desv = (v) => { const m = prom(v); return Math.sqrt(prom(v.map((x) => (x - m) ** 2))); };
const fmt = (x, d = 3) => x.toFixed(d).replace('.', ',');
const miles = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\\,');

// Ejecuta una búsqueda por lote de claves y devuelve las métricas promedio POR CONSULTA.
function lote(buscar, claves) {
  let comp = 0, lect = 0, lineas = 0;
  const t0 = performance.now();
  for (const k of claves) { const r = buscar(k); comp += r.comparaciones; lect += r.lecturasDisco; lineas += r.lineasLeidas ?? 0; }
  const ms = (performance.now() - t0) / claves.length;
  return { ms, comp: comp / claves.length, lect: lect / claves.length, lineas: lineas / claves.length };
}

console.log(`Node ${process.version} · repeticiones: ${REPETICIONES} (+1 de calentamiento) · claves aleatorias por lote: ${ALEATORIAS}\n`);
const resumen = [], filasLatex = [];

for (const n of VOLUMENES) {
  const { ruta, claves } = generarArchivoRegistros(n);
  const tamMB = fs.statSync(ruta).size / MB;

  globalThis.gc?.();
  const heap0 = process.memoryUsage().heapUsed;
  const t0 = performance.now();
  const indice = construirIndice(ruta, 'codigo');
  const msIndice = performance.now() - t0;
  const heapIndice = (process.memoryUsage().heapUsed - heap0) / MB;
  const bytesIndice = (indice.claves.byteLength + indice.offsets.byteLength + indice.largos.byteLength) / MB;
  console.log(`=== ${n.toLocaleString('es')} registros · archivo ${tamMB.toFixed(2)} MB ===`);
  console.log(`Índice: construido en ${msIndice.toFixed(1)} ms (${indice.lecturasDisco} lecturas de disco), ${bytesIndice.toFixed(2)} MB en memoria, archivo ya ordenado: ${indice.archivoOrdenado}`);

  const archivo = new ArchivoRegistros(ruta);
  const aleatorias = Array.from({ length: ALEATORIAS }, () => claves[(rnd() * n) | 0]);
  const escenarios = [
    ['primera', [claves[0]]], ['última', [claves[n - 1]]], ['central', [claves[n >> 1]]],
    ['aleatoria', aleatorias], ['no existe (peor caso)', [claves[n - 1] + 1]],
  ];
  const algoritmos = [
    ['Secuencial', (k) => busquedaSecuencialArchivo(ruta, k, 'codigo')],
    ['Binaria (índice)', (k) => busquedaBinariaIndice(indice, archivo, k)],
  ];

  console.log('Algoritmo         Clave                     Tiempo (ms)   Comparaciones   Lecturas a disco   Líneas leídas');
  const acum = {};
  for (const [nomAlg, buscar] of algoritmos) {
    acum[nomAlg] = { ms: [], comp: [], lect: [], lineas: [] };
    for (const [nomEsc, lista] of escenarios) {
      lote(buscar, lista);                                            // calentamiento
      const reps = Array.from({ length: REPETICIONES }, () => lote(buscar, lista));
      const m = { ms: prom(reps.map((r) => r.ms)), comp: prom(reps.map((r) => r.comp)), lect: prom(reps.map((r) => r.lect)), lineas: prom(reps.map((r) => r.lineas)) };
      for (const c of Object.keys(m)) acum[nomAlg][c].push(m[c]);
      console.log(`${nomAlg.padEnd(17)} ${nomEsc.padEnd(24)} ${fmt(m.ms, 4).padStart(12)} ${fmt(m.comp, 1).padStart(15)} ${fmt(m.lect, 1).padStart(18)} ${fmt(m.lineas, 0).padStart(15)}`);
    }
  }
  archivo.cerrar();

  for (const [nomAlg] of algoritmos) {
    const a = acum[nomAlg];
    const r = { n, alg: nomAlg, ms: prom(a.ms), sd: desv(a.ms), comp: prom(a.comp), lect: prom(a.lect), teo: nomAlg === 'Secuencial' ? n / 2 : Math.floor(Math.log2(n)) + 1 };
    resumen.push(r);
    filasLatex.push(`${miles(n)} & ${nomAlg} & ${fmt(r.ms, 6)} & ${fmt(r.comp, 1)} & ${nomAlg === 'Secuencial' ? miles(n / 2) : miles(r.teo)} & ${fmt(r.lect, 1)} & ${nomAlg === 'Secuencial' ? 'O(n)' : 'O(log n)'}\\\\`);
  }
  console.log('');
}

console.log('=== RESUMEN (promedio de los 5 tipos de clave) ===');
console.log('Registros   Algoritmo          Tiempo prom. (ms)   ± desv.   Comp. exp.   Comp. teór.   Lecturas disco');
for (const r of resumen) console.log(`${String(r.n).padStart(9)}   ${r.alg.padEnd(17)} ${fmt(r.ms, 6).padStart(17)} ${fmt(r.sd, 4).padStart(9)} ${fmt(r.comp, 1).padStart(12)} ${fmt(r.teo, 0).padStart(13)} ${fmt(r.lect, 1).padStart(16)}`);
console.log('\n--- Filas LaTeX: N.º registros & Algoritmo & Tiempo prom. (ms) & Comp. exp. & Comp. teór. & Lecturas a disco & Complejidad ---');
console.log(filasLatex.join('\n'));
console.log('\nNota: "Comp. teór." = n/2 (secuencial, caso promedio) y ⌊log2 n⌋+1 (binaria, peor caso). Una "lectura a disco" es una llamada a fs.readSync.');
