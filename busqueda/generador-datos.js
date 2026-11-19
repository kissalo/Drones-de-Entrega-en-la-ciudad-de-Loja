// GENERADOR DE DATOS para el benchmark de búsqueda (Avance 2).
// Reutiliza lo del Avance 1: generarEdificios (datos sintéticos con el formato de edificios.ndjson)
// y mergeSort + crearComparador (ordenamiento propio, sin Array.sort).
// Todo es determinista: misma semilla => mismos datos => pruebas repetibles.
import { generarEdificios } from '../pruebas/datos-sinteticos.js';
import { mergeSort, crearComparador, estaOrdenado } from '../server/ordenamiento/index.js';

export const VOLUMENES = [1000, 50000, 500000];   // los 3 escenarios pedidos
export const CAMPO_BUSQUEDA = 'altura';           // campo por el que se ordena y se busca
const SEMILLA = 2026;

// Genera n edificios y los devuelve ORDENADOS ascendentemente por 'campo' (requisito de la búsqueda binaria).
export function generarDatasetOrdenado(n, campo = CAMPO_BUSQUEDA, semilla = SEMILLA) {
  const crudo = generarEdificios(n, semilla);
  const comparador = crearComparador([{ campo, orden: 'asc' }]);
  const ordenado = mergeSort(crudo, comparador);
  if (!estaOrdenado(ordenado, comparador)) throw new Error('El dataset no quedó ordenado');
  return ordenado;
}

// Genera los 3 datasets de una vez: { 1000: [...], 50000: [...], 500000: [...] }
export function generarTodosLosVolumenes(campo = CAMPO_BUSQUEDA) {
  const datasets = {};
  for (const n of VOLUMENES) datasets[n] = generarDatasetOrdenado(n, campo);
  return datasets;
}

// Generador pseudoaleatorio propio (mulberry32) para elegir objetivos de forma repetible.
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Objetivos para medir (útil para la Persona 2): { existentes, inexistentes, peorCasoSecuencial }
//  - existentes: valores que SÍ están, tomados al azar del dataset (caso promedio)
//  - inexistentes: valores que NO están (obligan a recorrer todo / hacer todos los pasos)
//  - extremos: primer y último elemento (mejor y peor caso de la secuencial)
export function generarObjetivos(dataset, campo = CAMPO_BUSQUEDA, cantidad = 100, semilla = SEMILLA) {
  const rnd = mulberry32(semilla + 1);
  const existentes = [];
  const inexistentes = [];
  for (let i = 0; i < cantidad; i++) {
    existentes.push(dataset[Math.floor(rnd() * dataset.length)][campo]);
    inexistentes.push(-1 - i);   // las alturas son >= 8, así que los negativos nunca existen
  }
  const extremos = { primero: dataset[0][campo], ultimo: dataset[dataset.length - 1][campo] };
  return { existentes, inexistentes, extremos };
}
