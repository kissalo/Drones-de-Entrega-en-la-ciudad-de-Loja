// PLANIFICADOR: reglas del negocio encima del buscador.
//  RF-01 ruta de menor consumo | RF-02 viento | RF-04 peso | RF-06 descenso lento
//  RF-07 puntos de carga       | RF-08 ruta alterna (replanificar tras un obstáculo)
import path from 'node:path';
import {
  FILAS, COLS, CAPAS, ANCHO_X, ALTO_Y, Z_MAX, BATERIA_WH, RESERVA_BATERIA, VEL_CRUCERO,
  VEL_DESCENSO, ALTURA_ENTREGA, TIEMPO_CARGA_S, RADIO_BUSQUEDA_LIBRE,
} from '../config.js';
import { Octree } from '../estructuras/octree.js';
import { cargarElevacion, cargarEdificios, cargarCargadores } from '../datos/cargador-stream.js';
import { idDe, filaDe, colDe, capaDe } from '../grafo/malla.js';
import { construirGrafo, agregarObstaculoDinamico } from '../grafo/constructor.js';
import { crearContexto, costoDescenso } from '../grafo/costo.js';
import { Buscador } from './buscador.js';

// Carga datos por streams, arma el Octree y el grafo. Se llama UNA vez por proceso/worker.
export async function crearSistema(dirData) {
  const terreno = await cargarElevacion(path.join(dirData, 'elevacion.csv'));
  const octree = new Octree({ minx: 0, miny: 0, minz: 0, maxx: ANCHO_X, maxy: ALTO_Y, maxz: Z_MAX });
  await cargarEdificios(path.join(dirData, 'edificios.ndjson'), octree);
  const grafo = construirGrafo(terreno, octree);
  const cargadores = (await cargarCargadores(path.join(dirData, 'cargadores.json')))
    .map((c) => ({ ...c, nodo: idDe(c.fila, c.col, 0) }))
    .filter((c) => !grafo.bloqueado[c.nodo]);
  return { terreno, octree, grafo, buscador: new Buscador(grafo), cargadores };
}

export function registrarObstaculo(sistema, obstaculo) {
  return agregarObstaculoDinamico(sistema.grafo, sistema.octree, obstaculo);
}

// Si el nodo pedido está bloqueado, busca el libre más cercano (anillos de celdas, capas cercanas).
export function nodoLibreCercano(g, fila, col, capa) {
  for (let r = 0; r <= RADIO_BUSQUEDA_LIBRE; r++)
    for (let f = fila - r; f <= fila + r; f++)
      for (let c = col - r; c <= col + r; c++) {
        if (Math.max(Math.abs(f - fila), Math.abs(c - col)) !== r) continue;
        if (f < 0 || f >= FILAS || c < 0 || c >= COLS) continue;
        for (let d = 0; d < CAPAS; d++)
          for (const l of d === 0 ? [capa] : [capa + d, capa - d]) {
            if (l < 0 || l >= CAPAS) continue;
            const id = idDe(f, c, l);
            if (!g.bloqueado[id]) return id;
          }
      }
  return -1;
}

const r1 = (n) => Math.round(n * 10) / 10;
function punto(g, id, v, tipo) {
  return { x: r1(g.x[id]), y: r1(g.y[id]), z: r1(g.z[id]), fila: filaDe(id), col: colDe(id), capa: capaDe(id), v, tipo };
}

// pedido = { origen:{fila,col,capa?}, destino:{fila,col}, pesoKg, viento:{velocidad,direccionGrados}, bateriaWh }
export function planificar(sistema, pedido, aEstrella = true) {
  const { grafo: g, buscador, cargadores } = sistema;
  const ctx = crearContexto(pedido);
  const o = nodoLibreCercano(g, pedido.origen.fila, pedido.origen.col, pedido.origen.capa ?? 0);
  const d = nodoLibreCercano(g, pedido.destino.fila, pedido.destino.col, 0);
  if (o < 0 || d < 0) return { estado: 'sin_ruta', motivo: 'origen o destino bloqueado' };

  const usable = (pedido.bateriaWh ?? BATERIA_WH) * (1 - RESERVA_BATERIA);
  const zEntrega = g.terreno[filaDe(d) * COLS + colDe(d)] + ALTURA_ENTREGA;
  const costoDesc = costoDescenso(ctx, g.z[d] - zEntrega);
  let explorados = 0;

  // 1) Intento directo
  const directa = buscador.buscar(o, d, ctx, aEstrella);
  explorados += directa.explorados;
  if (!directa.encontrada) return { estado: 'sin_ruta', motivo: 'no hay camino libre', explorados };

  let tramos, costo, paradas = [];
  if (directa.costo + costoDesc <= usable) {
    tramos = [directa.ruta]; costo = directa.costo + costoDesc;
  } else {
    // 2) RF-07: origen → cargador → destino (se asume carga completa en el cargador)
    let mejor = null;
    for (const c of cargadores) {
      const a = buscador.buscar(o, c.nodo, ctx, aEstrella); explorados += a.explorados;
      if (!a.encontrada || a.costo > usable) continue;
      const b = buscador.buscar(c.nodo, d, ctx, aEstrella); explorados += b.explorados;
      if (!b.encontrada || b.costo + costoDesc > usable) continue;
      const total = a.costo + b.costo + costoDesc;
      if (!mejor || total < mejor.total) mejor = { c, a, b, total };
    }
    if (!mejor) return { estado: 'sin_ruta', motivo: 'batería insuficiente, ningún cargador alcanzable', explorados };
    tramos = [mejor.a.ruta, mejor.b.ruta]; costo = mejor.total; paradas = [mejor.c.id];
  }

  // Armado de la trayectoria con velocidades (RF-06: el último tramo baja lento)
  const pts = [];
  tramos.forEach((ruta, t) => {
    for (let i = t === 0 ? 0 : 1; i < ruta.length; i++) {
      const esUltimo = i === ruta.length - 1;
      const tipo = t === 0 && i === 0 ? 'inicio' : esUltimo && t < tramos.length - 1 ? 'carga' : 'vuelo';
      pts.push(punto(g, ruta[i], VEL_CRUCERO, tipo));
    }
  });
  const ult = pts[pts.length - 1];
  pts.push({ ...ult, z: r1(zEntrega), v: VEL_DESCENSO, tipo: 'entrega' });

  let distanciaM = 0, tiempoS = paradas.length * TIEMPO_CARGA_S;
  for (let i = 1; i < pts.length; i++) {
    const dd = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y, pts[i].z - pts[i - 1].z);
    distanciaM += dd; tiempoS += dd / pts[i].v;
  }
  return {
    estado: 'ok', ruta: pts, costoWh: Math.round(costo * 100) / 100, bateriaUsableWh: usable,
    paradasCarga: paradas, distanciaM: Math.round(distanciaM), tiempoS: Math.round(tiempoS),
    explorados, algoritmo: aEstrella ? 'A*' : 'Dijkstra',
  };
}
