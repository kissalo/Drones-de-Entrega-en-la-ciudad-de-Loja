// BÚSQUEDA BINARIA, implementada desde cero (iterativa, sin recursión).
//  - Tiempo: O(log n) en el peor caso; O(1) en el mejor caso (el objetivo está justo en el medio).
//  - Espacio: O(1).
//  - REQUISITO: el arreglo debe estar ORDENADO ASCENDENTEMENTE por el mismo 'campo' que se busca.
//
// Idea: se mira el elemento del medio; si es el objetivo, listo. Si el objetivo es mayor, se descarta
// la mitad izquierda; si es menor, la mitad derecha. Cada paso reduce el problema a la mitad.
//
// Convención para contar comparaciones: UNA comparación por cada iteración, es decir, cada vez
// que se examina el elemento del medio (igual criterio que en la secuencial: 1 por elemento examinado).
//
// Si hay valores repetidos, devuelve el índice de UNO de ellos (no necesariamente el primero).
// Devuelve: { encontrado, indice, comparaciones }   (indice = -1 si no se encontró)

export function busquedaBinaria(arreglo, objetivo, campo = 'altura') {
  let comparaciones = 0;
  let izq = 0;
  let der = arreglo.length - 1;

  while (izq <= der) {
    const medio = izq + Math.floor((der - izq) / 2);   // evita desbordes y siempre es entero
    const valor = arreglo[medio][campo];
    comparaciones++;

    if (valor === objetivo) {
      return { encontrado: true, indice: medio, comparaciones };
    } else if (valor < objetivo) {
      izq = medio + 1;        // el objetivo está a la derecha: descartar la mitad izquierda
    } else {
      der = medio - 1;        // el objetivo está a la izquierda: descartar la mitad derecha
    }
  }
  return { encontrado: false, indice: -1, comparaciones };
}
