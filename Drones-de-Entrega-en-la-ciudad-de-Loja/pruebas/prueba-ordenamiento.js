// Pruebas del módulo de ordenamiento. Ejecuta: npm run prueba:orden
import { mergeSort, quickSort, crearComparador, estaOrdenado, ordenarEdificios } from '../server/ordenamiento/index.js';
import { generarEdificios } from './datos-sinteticos.js';

let fallos = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fallos++; };

const porAltura = crearComparador([{ campo: 'altura' }]);
const porAlturaDesc = crearComparador([{ campo: 'altura', orden: 'desc' }]);
const multi = crearComparador([{ campo: 'altura', orden: 'desc' }, { campo: 'area', orden: 'asc' }]);

for (const [nombre, alg] of [['MergeSort', mergeSort], ['QuickSort', quickSort]]) {
  // casos borde
  ok(alg([], porAltura).length === 0, `${nombre}: arreglo vacío`);
  ok(alg([{ altura: 5 }], porAltura).length === 1, `${nombre}: un solo elemento`);

  // aleatorio grande, varios criterios
  const datos = generarEdificios(20000);
  const copia = datos.map((e) => e.id).join();
  for (const [etq, cmp] of [['altura asc', porAltura], ['altura desc', porAlturaDesc], ['altura desc + área asc', multi]]) {
    const r = alg(datos, cmp);
    ok(r.length === datos.length && estaOrdenado(r, cmp), `${nombre}: 20 000 registros ordenados por ${etq}`);
  }
  ok(datos.map((e) => e.id).join() === copia, `${nombre}: no modifica el arreglo original`);

  // mismos elementos (permutación): la suma de ids debe coincidir
  const r = alg(datos, porAltura);
  const suma = (l) => l.reduce((s, e) => s + e.id, 0);
  ok(suma(r) === suma(datos), `${nombre}: no pierde ni duplica registros`);

  // ya ordenado, inverso y con todos iguales (casos clásicos que degradan a QuickSort ingenuo)
  const asc = alg(datos, porAltura);
  ok(estaOrdenado(alg(asc, porAltura), porAltura), `${nombre}: entrada ya ordenada`);
  ok(estaOrdenado(alg(asc, porAlturaDesc), porAlturaDesc), `${nombre}: entrada en orden inverso`);
  const iguales = Array.from({ length: 50000 }, (_, i) => ({ id: i, altura: 7 }));
  const t0 = performance.now();
  ok(estaOrdenado(alg(iguales, porAltura), porAltura) && performance.now() - t0 < 1000, `${nombre}: 50 000 valores iguales sin degradarse`);
}

// MergeSort es estable: los empates mantienen el orden original (por id)
const empates = Array.from({ length: 1000 }, (_, i) => ({ id: i, altura: i % 5 }));
const est = mergeSort(empates, porAltura);
let estable = true;
for (let i = 1; i < est.length; i++) if (est[i - 1].altura === est[i].altura && est[i - 1].id > est[i].id) estable = false;
ok(estable, 'MergeSort es estable');

// la API acepta ambos algoritmos y rechaza uno desconocido
const demo = generarEdificios(500);
ok(estaOrdenado(ordenarEdificios(demo, [{ campo: 'zmax' }], 'quick'), crearComparador([{ campo: 'zmax' }])), 'ordenarEdificios(..., "quick")');
let lanzo = false; try { ordenarEdificios(demo, [{ campo: 'altura' }], 'burbuja'); } catch { lanzo = true; }
ok(lanzo, 'algoritmo desconocido lanza error');

console.log(fallos ? `\n${fallos} prueba(s) fallaron` : '\nTodas las pruebas de ordenamiento pasaron');
process.exit(fallos ? 1 : 0);
