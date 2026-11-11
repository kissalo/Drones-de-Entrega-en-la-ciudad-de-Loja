// FUNCIÓN DE COSTO ENERGÉTICO (Wh) de una arista. Es el "peso" que minimiza Dijkstra/A*.
//   horizontal : K_HORIZ * (masa dron + producto) * distancia * factor de capa * factor de viento
//   ascenso    : K_SUBIDA * masa * metros que sube (bajar no cuesta)
// Lo que NO depende del pedido (distancia, desnivel, dirección) ya viene precalculado en el grafo.

//Mide el costo de energia dependiendo de los factores, distancia, peso, viento, etc. 

import {
  MASA_DRON_KG, K_HORIZ, K_SUBIDA, FACTOR_CAPA, BONO_VIENTO, VIENTO_MAX_MS, DESCENSO_FACTOR,
} from '../config.js';
import { CELDAS } from './malla.js';

// pedido: { pesoKg, viento: { velocidad (m/s), direccionGrados (hacia dónde sopla; 0 = norte, 90 = este) } }
export function crearContexto(pedido) {
  const masa = MASA_DRON_KG + Math.max(0, pedido.pesoKg ?? 0);                 // RF-04
  const vel = pedido.viento?.velocidad ?? 0;
  const vNorm = Math.min(Math.max(vel / VIENTO_MAX_MS, 0), 1);                 // RF-02
  const rad = ((pedido.viento?.direccionGrados ?? 0) * Math.PI) / 180;
  const kHoriz = K_HORIZ * masa;
  return {
    kHoriz,
    kSubida: K_SUBIDA * masa,
    vx: Math.sin(rad) * vNorm,
    vy: Math.cos(rad) * vNorm,
    // Costo mínimo por metro posible: sirve de heurística ADMISIBLE para A*.
    // El 0.9999 absorbe el redondeo de Float32 en las distancias del grafo.
    costoMinMetro: kHoriz * (1 - BONO_VIENTO * vNorm) * Math.min(...FACTOR_CAPA) * 0.9999,
  };
}

export function costoArista(g, e, v, ctx) {
  const fv = 1 - BONO_VIENTO * (g.ux[e] * ctx.vx + g.uy[e] * ctx.vy);
  const dz = g.dz[e];
  return ctx.kHoriz * g.dist[e] * FACTOR_CAPA[(v / CELDAS) | 0] * fv + (dz > 0 ? ctx.kSubida * dz : 0);
}

// RF-06: descender despacio hasta el punto de entrega.
export function costoDescenso(ctx, alturaM) {
  return ctx.kHoriz * Math.max(alturaM, 0) * DESCENSO_FACTOR;
}