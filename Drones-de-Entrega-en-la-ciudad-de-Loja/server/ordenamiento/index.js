// API pública del módulo de ordenamiento. Uso:
//   import { ordenarEdificios } from './server/ordenamiento/index.js';
//   const ordenados = ordenarEdificios(edificios, [{ campo: 'altura', orden: 'desc' }, { campo: 'area' }], 'merge');
import { mergeSort } from './merge-sort.js';
import { quickSort } from './quick-sort.js';
import { crearComparador } from './criterios.js';

export { mergeSort, quickSort };
export { crearComparador, estaOrdenado, valorDe } from './criterios.js';

const ALGORITMOS = { merge: mergeSort, quick: quickSort };

// registros: arreglo de objetos | criterios: [{ campo, orden }] | algoritmo: 'merge' (por defecto) o 'quick'
export function ordenarEdificios(registros, criterios, algoritmo = 'merge') {
  const ordenar = ALGORITMOS[algoritmo];
  if (!ordenar) throw new Error(`Algoritmo desconocido: ${algoritmo} (usa 'merge' o 'quick')`);
  return ordenar(registros, crearComparador(criterios));
}
