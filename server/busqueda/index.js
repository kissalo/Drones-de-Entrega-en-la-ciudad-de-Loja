// API pública del módulo de búsqueda en archivo indexado. Uso:
//   import { construirIndice, busquedaSecuencialArchivo, busquedaBinariaIndice, ArchivoRegistros } from './server/busqueda/index.js';
//   const indice = construirIndice('data/generado/edificios-50000.ndjson', 'codigo');
//   const archivo = new ArchivoRegistros('data/generado/edificios-50000.ndjson');
//   busquedaBinariaIndice(indice, archivo, 12345);  busquedaSecuencialArchivo('data/generado/edificios-50000.ndjson', 12345);
export { construirIndice, guardarIndice, cargarIndice } from './indice-archivo.js';
export { busquedaSecuencialArchivo, busquedaBinariaIndice, ArchivoRegistros } from './busqueda-archivo.js';
