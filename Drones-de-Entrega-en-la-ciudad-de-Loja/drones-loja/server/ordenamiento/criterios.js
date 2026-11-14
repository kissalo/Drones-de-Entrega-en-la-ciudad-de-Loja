// CRITERIOS DE ORDENAMIENTO: convierte una lista de criterios en una función comparadora.
// Un criterio es { campo, orden } con orden 'asc' (por defecto) o 'desc'. Si dos registros empatan en el
// primer criterio se desempata con el segundo, y así sucesivamente (ordenamiento por múltiples criterios).
//
// Campos disponibles de cada edificio: los del archivo (xmin, ymin, xmax, ymax, zmax, altura)
// y tres derivados: ancho, largo y area (se calculan al comparar, no se guardan).

const CAMPOS_DERIVADOS = {
  ancho: (e) => e.xmax - e.xmin,
  largo: (e) => e.ymax - e.ymin,
  area: (e) => (e.xmax - e.xmin) * (e.ymax - e.ymin),
};

export function valorDe(registro, campo) {
  const derivado = CAMPOS_DERIVADOS[campo];
  return derivado ? derivado(registro) : registro[campo];
}

// Devuelve (a, b) => número negativo si a va antes que b, positivo si va después y 0 si empatan.
export function crearComparador(criterios) {
  if (!Array.isArray(criterios) || criterios.length === 0) throw new Error('Se requiere al menos un criterio');
  const reglas = criterios.map(({ campo, orden = 'asc' }) => {
    if (orden !== 'asc' && orden !== 'desc') throw new Error(`orden inválido: ${orden}`);
    return { campo, signo: orden === 'desc' ? -1 : 1 };
  });
  return (a, b) => {
    for (let i = 0; i < reglas.length; i++) {
      const { campo, signo } = reglas[i];
      const va = valorDe(a, campo), vb = valorDe(b, campo);
      if (va < vb) return -signo;
      if (va > vb) return signo;
    }
    return 0;
  };
}

// Verifica que un arreglo esté ordenado según el comparador (sirve para las pruebas y para el informe).
export function estaOrdenado(arreglo, comparador) {
  for (let i = 1; i < arreglo.length; i++) if (comparador(arreglo[i - 1], arreglo[i]) > 0) return false;
  return true;
}
