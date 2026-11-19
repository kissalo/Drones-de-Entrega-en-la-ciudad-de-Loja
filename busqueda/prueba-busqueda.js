// Pruebas de corrección de las dos búsquedas. Ejecuta: node busqueda/prueba-busqueda.js
import { busquedaSecuencial } from './busqueda-secuencial.js';
import { busquedaBinaria } from './busqueda-binaria.js';
import { VOLUMENES, generarDatasetOrdenado, generarObjetivos } from './generador-datos.js';

let fallos = 0;
const verificar = (condicion, mensaje) => { if (!condicion) { fallos++; console.log('  FALLA:', mensaje); } };

// 1) Arreglo pequeño y conocido
const chico = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91].map((altura) => ({ altura }));
for (const x of [2, 38, 91, 1, 100, 13]) {          // primero, medio, último, menor, mayor, intermedio inexistente
  const s = busquedaSecuencial(chico, x), b = busquedaBinaria(chico, x);
  console.log(`objetivo ${String(x).padStart(3)} -> secuencial:`, JSON.stringify(s), ' binaria:', JSON.stringify(b));
  verificar(s.encontrado === b.encontrado, `discrepan en encontrado para ${x}`);
  if (b.encontrado) verificar(chico[b.indice].altura === x, `índice binario incorrecto para ${x}`);
  verificar(b.comparaciones <= Math.ceil(Math.log2(chico.length + 1)), `binaria excede el límite para ${x}`);
}
verificar(busquedaSecuencial([], 5).indice === -1 && busquedaBinaria([], 5).indice === -1, 'arreglo vacío');

// 2) Dataset real generado: ambas deben coincidir en encontrado, y el índice debe apuntar al valor buscado
for (const n of VOLUMENES) {
  const datos = generarDatasetOrdenado(n);
  const { existentes, inexistentes } = generarObjetivos(datos, 'altura', 200);
  const limite = Math.floor(Math.log2(n)) + 1;
  let maxBin = 0;
  for (const x of [...existentes, ...inexistentes]) {
    const s = busquedaSecuencial(datos, x), b = busquedaBinaria(datos, x);
    verificar(s.encontrado === b.encontrado, `n=${n}: discrepan en ${x}`);
    if (b.encontrado) verificar(datos[b.indice].altura === x, `n=${n}: índice binario incorrecto`);
    verificar(b.comparaciones <= limite, `n=${n}: binaria usó ${b.comparaciones} > ${limite}`);
    maxBin = Math.max(maxBin, b.comparaciones);
  }
  console.log(`n=${String(n).padStart(6)}: OK | máx. comparaciones binaria = ${maxBin} (límite teórico ${limite})`);
}
console.log(fallos === 0 ? '\nTODAS LAS PRUEBAS PASARON' : `\n${fallos} FALLO(S)`);
process.exit(fallos === 0 ? 0 : 1);
