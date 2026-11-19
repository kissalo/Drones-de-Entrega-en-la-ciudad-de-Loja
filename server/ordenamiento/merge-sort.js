// MERGESORT (divide y vencerás), implementado desde cero: NO usa Array.prototype.sort().
//  - Tiempo: O(n log n) en el mejor, promedio y peor caso.
//  - Espacio: O(n) por un único arreglo auxiliar reutilizado (se crea una sola vez, no en cada mezcla).
//  - Estable: si dos registros empatan, conservan el orden original.
// No modifica el arreglo recibido: devuelve uno nuevo.

export function mergeSort(arreglo, comparar) {
  const n = arreglo.length;
  let origen = arreglo.slice();     // copia de trabajo (el original queda intacto)
  if (n < 2) return origen;
  let destino = new Array(n);       // arreglo auxiliar único

  // Versión ascendente (bottom-up): mezcla bloques de tamaño 1, 2, 4, 8... sin recursión.
  for (let ancho = 1; ancho < n; ancho *= 2) {
    for (let ini = 0; ini < n; ini += 2 * ancho) {
      const medio = Math.min(ini + ancho, n);
      const fin = Math.min(ini + 2 * ancho, n);
      mezclar(origen, destino, ini, medio, fin, comparar);
    }
    const tmp = origen; origen = destino; destino = tmp;   // intercambio de roles, sin copiar
  }
  return origen;
}

// Mezcla las mitades ordenadas origen[ini..medio) y origen[medio..fin) dentro de destino[ini..fin).
function mezclar(origen, destino, ini, medio, fin, comparar) {
  let i = ini, j = medio, k = ini;
  while (i < medio && j < fin) {
    // '<= 0' toma primero el de la izquierda en empates: eso hace al algoritmo estable
    destino[k++] = comparar(origen[i], origen[j]) <= 0 ? origen[i++] : origen[j++];
  }
  while (i < medio) destino[k++] = origen[i++];
  while (j < fin) destino[k++] = origen[j++];
}
