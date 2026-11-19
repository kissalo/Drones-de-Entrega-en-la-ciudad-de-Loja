// QUICKSORT, implementado desde cero: NO usa Array.prototype.sort().
//  - Tiempo: O(n log n) en promedio; el pivote "mediana de tres" evita el peor caso O(n²) en datos ya ordenados.
//  - Espacio: O(log n) de pila (siempre se recurre sobre la partición más pequeña; la grande se itera).
//  - In situ (sobre una copia) y NO estable.
//  - Partición en 3 zonas (menores | iguales | mayores) para que muchos valores repetidos no lo degraden.
//  - Particiones pequeñas (<= UMBRAL) se terminan con inserción, que es más rápida para pocos elementos.
// No modifica el arreglo recibido: devuelve uno nuevo.

const UMBRAL = 16;

export function quickSort(arreglo, comparar) {
  const a = arreglo.slice();
  ordenar(a, 0, a.length - 1, comparar);
  return a;
}

function ordenar(a, bajo, alto, comparar) {
  while (alto - bajo + 1 > UMBRAL) {
    // --- pivote: mediana de tres (primero, medio, último) ---
    const medio = bajo + ((alto - bajo) >> 1);
    if (comparar(a[medio], a[bajo]) < 0) intercambiar(a, medio, bajo);
    if (comparar(a[alto], a[bajo]) < 0) intercambiar(a, alto, bajo);
    if (comparar(a[alto], a[medio]) < 0) intercambiar(a, alto, medio);
    const pivote = a[medio];

    // --- partición en 3 zonas: a[bajo..lt-1] < pivote, a[lt..gt] == pivote, a[gt+1..alto] > pivote ---
    let lt = bajo, i = bajo, gt = alto;
    while (i <= gt) {
      const c = comparar(a[i], pivote);
      if (c < 0) intercambiar(a, lt++, i++);
      else if (c > 0) intercambiar(a, i, gt--);
      else i++;
    }

    // --- recursión sobre la parte más pequeña; la más grande se procesa con el while ---
    if (lt - bajo < alto - gt) { ordenar(a, bajo, lt - 1, comparar); bajo = gt + 1; }
    else { ordenar(a, gt + 1, alto, comparar); alto = lt - 1; }
  }
  insercion(a, bajo, alto, comparar);
}

function insercion(a, bajo, alto, comparar) {
  for (let i = bajo + 1; i <= alto; i++) {
    const x = a[i];
    let j = i - 1;
    while (j >= bajo && comparar(a[j], x) > 0) { a[j + 1] = a[j]; j--; }
    a[j + 1] = x;
  }
}

function intercambiar(a, i, j) { const t = a[i]; a[i] = a[j]; a[j] = t; }
