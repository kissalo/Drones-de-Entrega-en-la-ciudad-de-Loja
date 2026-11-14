// Evidencia para el informe (Avance 1, Unidad 2): antes/después del ordenamiento, tiempos (ms) y memoria (MB).
// Ejecuta: npm run ordenar        (usa --expose-gc para medir la memoria con más precisión)
import { DATA_DIR } from '../server/config.js';
import { cargarEdificiosLista } from '../server/datos/cargador-stream.js';
import { mergeSort, quickSort, crearComparador } from '../server/ordenamiento/index.js';
import { generarEdificios } from './datos-sinteticos.js';

const REPETICIONES = 5;
const MB = 1024 * 1024;
const CRITERIOS = {
  'altura (desc)': [{ campo: 'altura', orden: 'desc' }],
  'altura desc + área asc': [{ campo: 'altura', orden: 'desc' }, { campo: 'area', orden: 'asc' }],
};
const ALGORITMOS = [['MergeSort', mergeSort], ['QuickSort', quickSort]];

const fila = (e) => `#${String(e.id).padStart(3)}  altura=${e.altura.toFixed(1).padStart(6)}  zmax=${e.zmax.toFixed(1)}  área=${((e.xmax - e.xmin) * (e.ymax - e.ymin)).toFixed(0).padStart(5)} m²`;
const mostrar = (titulo, lista, n = 8) => { console.log(titulo); lista.slice(0, n).forEach((e) => console.log('  ' + fila(e))); console.log('  ...'); };
const mediana = (v) => { const a = v.slice(); for (let i = 1; i < a.length; i++) { const x = a[i]; let j = i - 1; while (j >= 0 && a[j] > x) { a[j + 1] = a[j]; j--; } a[j + 1] = x; } return a[a.length >> 1]; };

function medir(algoritmo, datos, comparador) {
  const tiempos = [], memorias = [];
  for (let r = 0; r < REPETICIONES; r++) {
    globalThis.gc?.();
    const antes = process.memoryUsage().heapUsed;
    const t0 = performance.now();
    const salida = algoritmo(datos, comparador);
    const t = performance.now() - t0;
    const despues = process.memoryUsage().heapUsed;   // sin gc: incluye el arreglo resultado y el auxiliar
    tiempos.push(t); memorias.push(Math.max(0, despues - antes) / MB);
    if (salida.length !== datos.length) throw new Error('longitud incorrecta');
  }
  return { ms: mediana(tiempos), mb: mediana(memorias) };
}

// ---------- 1) ANTES / DESPUÉS sobre el dataset real del proyecto ----------
const real = await cargarEdificiosLista(DATA_DIR + '/edificios.ndjson');
console.log(`=== Dataset del proyecto: edificios.ndjson (${real.length} registros) ===\n`);
mostrar('ANTES (orden del archivo):', real);
const cmp = crearComparador(CRITERIOS['altura desc + área asc']);
mostrar('\nDESPUÉS (MergeSort, altura desc + área asc):', mergeSort(real, cmp));
mostrar('\nDESPUÉS (QuickSort, altura desc + área asc):', quickSort(real, cmp));

// ---------- 2) TIEMPOS Y MEMORIA con distintos tamaños ----------
console.log(`\n=== Tiempos y memoria (mediana de ${REPETICIONES} repeticiones, Node ${process.version}) ===`);
const tamanos = [real.length, 1000, 10000, 100000];
const filasLatex = [];
console.log('Algoritmo  Criterio                  Registros   Tiempo (ms)  Memoria (MB)');
for (const n of tamanos) {
  const datos = n === real.length ? real : generarEdificios(n);
  for (const [critNombre, crit] of Object.entries(CRITERIOS)) {
    const comparador = crearComparador(crit);
    for (const [nombre, alg] of ALGORITMOS) {
      const { ms, mb } = medir(alg, datos, comparador);
      console.log(`${nombre.padEnd(10)} ${critNombre.padEnd(25)} ${String(n).padStart(9)}   ${ms.toFixed(3).padStart(10)}   ${mb.toFixed(2).padStart(10)}`);
      const miles = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\\,');
      filasLatex.push(`${nombre} & ${critNombre.replace('altura desc + área asc', 'altura, área')} & ${miles} & ${ms.toFixed(3)} & ${mb.toFixed(2)}\\\\`);
    }
  }
}
console.log('\n--- Filas para pegar en la tabla LaTeX del informe ---');
console.log(filasLatex.join('\n'));
