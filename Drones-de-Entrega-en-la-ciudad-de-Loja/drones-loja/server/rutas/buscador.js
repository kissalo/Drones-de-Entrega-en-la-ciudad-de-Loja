// BUSCADOR: Dijkstra 3D con min-heap. Con aEstrella = true agrega la heurística (A*) y explora
// bastantes menos nodos con el MISMO costo final. Los arreglos de trabajo se crean UNA vez
// y se reinician con fill() en cada búsqueda (RNF-02): no se crean objetos nuevos por replanificación.

//Usa Dijkstra para encontrar el camino mas corto y economico.

import { GRADO } from '../config.js';
import { MinHeap } from '../estructuras/min-heap.js';
import { Pila, reconstruir } from './reconstruir.js';
import { costoArista } from '../grafo/costo.js';

export class Buscador {
  constructor(g) {
    this.g = g;
    this.dist = new Float64Array(g.total);
    this.prev = new Int32Array(g.total);
    this.cerrado = new Uint8Array(g.total);
    this.heap = new MinHeap(4096);
    this.pila = new Pila(g.total);
  }

  buscar(origen, destino, ctx, aEstrella = true) {
    const { g, dist, prev, cerrado, heap } = this;
    dist.fill(Infinity); prev.fill(-1); cerrado.fill(0); heap.vaciar();

    const hm = aEstrella ? ctx.costoMinMetro : 0;
    const tx = g.x[destino], ty = g.y[destino], tz = g.z[destino];
    const h = (v) => {
      if (hm === 0) return 0;
      const dx = g.x[v] - tx, dy = g.y[v] - ty, dz = g.z[v] - tz;
      return hm * Math.sqrt(dx * dx + dy * dy + dz * dz);
    };

    dist[origen] = 0;
    heap.push(h(origen), origen);
    let explorados = 0;
    while (heap.tamano > 0) {
      const u = heap.pop();
      if (cerrado[u]) continue;                 // entrada vieja del heap (borrado perezoso)
      cerrado[u] = 1; explorados++;
      if (u === destino) break;
      const base = u * GRADO;
      for (let k = 0; k < GRADO; k++) {
        const e = base + k;
        if (g.aristaBloq[e]) continue;
        const v = g.dest[e];
        if (cerrado[v]) continue;
        const nc = dist[u] + costoArista(g, e, v, ctx);
        if (nc < dist[v]) { dist[v] = nc; prev[v] = u; heap.push(nc + h(v), v); }
      }
    }
    if (dist[destino] === Infinity) return { encontrada: false, explorados };
    return { encontrada: true, costo: dist[destino], ruta: reconstruir(prev, destino, this.pila), explorados };
  }
}
