// BÚSQUEDA SECUENCIAL (lineal), implementada desde cero: NO usa .find(), .indexOf() ni .includes().
//  - Tiempo: O(n) en el peor caso (el objetivo está al final o no existe); O(1) en el mejor caso.
//  - Espacio: O(1).
//  - No necesita que el arreglo esté ordenado.
//
// Convención para contar comparaciones: UNA comparación por cada elemento que se examina
// (cada vez que se pregunta "¿este elemento es el objetivo?").
//
// Parámetros:
//   arreglo : arreglo de objetos (p. ej. edificios)
//   objetivo: valor que se busca
//   campo   : propiedad por la que se busca (por defecto 'altura')
// Devuelve: { encontrado, indice, comparaciones }   (indice = -1 si no se encontró)

export function busquedaSecuencial(arreglo, objetivo, campo = 'altura') {
  let comparaciones = 0;
  for (let i = 0; i < arreglo.length; i++) {
    comparaciones++;
    if (arreglo[i][campo] === objetivo) {
      return { encontrado: true, indice: i, comparaciones };
    }
  }
  return { encontrado: false, indice: -1, comparaciones };
}
