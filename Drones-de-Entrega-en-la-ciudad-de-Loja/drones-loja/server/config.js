// Constantes del sistema. Un solo lugar para ajustar mapa, capas, energía y viento.
import { fileURLToPath } from 'node:url';

export const PUERTO = 3000;
export const DATA_DIR = fileURLToPath(new URL('../data/', import.meta.url));

// ---- Malla del espacio aéreo (coordenadas locales en metros: x = este, y = norte, z = altitud) ----
export const FILAS = 40;
export const COLS = 40;
export const TAM_CELDA = 60;                         // m entre nodos vecinos
export const ALTURAS_CAPA = [40, 70, 100, 130, 160]; // m sobre el terreno de cada celda
export const CAPAS = ALTURAS_CAPA.length;
export const GRADO = 10;                             // 8 vecinos horizontales + subir + bajar
export const ANCHO_X = COLS * TAM_CELDA;
export const ALTO_Y = FILAS * TAM_CELDA;
export const Z_MAX = 3000;                           // techo del mundo del Octree (m s. n. m.)

// ---- Seguridad (RNF-05) ----
export const MARGEN_SEGURIDAD_M = 5;                 // se agranda cada obstáculo en todas direcciones

// ---- Modelo de energía (valores didácticos: calíbralos con datos reales del dron) ----
export const MASA_DRON_KG = 4;
export const K_HORIZ = 0.0035;                       // Wh por metro y por kg al volar
export const K_SUBIDA = 0.0055;                      // Wh por metro de ascenso y por kg
export const FACTOR_CAPA = [1.0, 1.04, 1.08, 1.14, 1.22]; // más alto = más viento y menos densidad
export const BONO_VIENTO = 0.3;                      // viento a favor -30 % / en contra +30 % (con viento máximo)
export const VIENTO_MAX_MS = 15;
export const DESCENSO_FACTOR = 1.5;                  // flotar y descender despacio cuesta más por metro
export const BATERIA_WH = 80;
export const RESERVA_BATERIA = 0.2;                  // nunca se usa el último 20 %
export const PESO_MAX_KG = 5;

// ---- Operación ----
export const VEL_CRUCERO = 12;                       // m/s
export const VEL_DESCENSO = 1.5;                     // m/s (RF-06)
export const ALTURA_ENTREGA = 3;                     // m sobre el suelo
export const TIEMPO_CARGA_S = 600;
export const RADIO_BUSQUEDA_LIBRE = 8;               // celdas a explorar si origen/destino está bloqueado

// Conversión de lat/lon (OpenStreetMap) a metros locales, para preparar tus datos reales.
export const CENTRO = { lat: -3.9931, lon: -79.2042 }; // aprox. centro de Loja: verifícalo
export function latLonAMetros(lat, lon) {
  const x = (lon - CENTRO.lon) * 111320 * Math.cos((CENTRO.lat * Math.PI) / 180) + ANCHO_X / 2;
  const y = (lat - CENTRO.lat) * 110574 + ALTO_Y / 2;
  return { x, y };
}
