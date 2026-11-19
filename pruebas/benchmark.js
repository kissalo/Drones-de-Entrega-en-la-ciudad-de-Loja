// Evidencia para el informe: versión simple vs. versión con estructura de datos. Ejecuta: npm run benchmark
import fs from 'node:fs';
import { DATA_DIR, GRADO, ANCHO_X, ALTO_Y, MARGEN_SEGURIDAD_M } from '../server/config.js';
import { crearSistema } from '../server/rutas/planificador.js';
import { crearContexto, costoArista } from '../server/grafo/costo.js';
import { idDe } from '../server/grafo/malla.js';
import { ColaFIFO } from '../server/estructuras/cola-fifo.js';

const ms = (f) => { const t = performance.now(); const r = f(); return [performance.now() - t, r]; };
function rng(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = rng(7);
const s = await crearSistema(DATA_DIR);
const g = s.grafo;
console.log(`Grafo: ${g.total} nodos\n`);

// 1) Octree vs recorrido lineal de edificios
const cajas = fs.readFileSync(DATA_DIR + '/edificios.ndjson', 'utf8').split('\n').filter(Boolean).map((l) => {
  const e = JSON.parse(l); const m = MARGEN_SEGURIDAD_M;
  return { a: e.xmin - m, b: e.ymin - m, c: -m, d: e.xmax + m, e: e.ymax + m, f: e.zmax + m };
});
const pts = Array.from({ length: 100000 }, () => [rnd() * ANCHO_X, rnd() * ALTO_Y, 2050 + rnd() * 400]);
const [tLin, rLin] = ms(() => pts.map(([x, y, z]) => cajas.some((b) => x >= b.a && x <= b.d && y >= b.b && y <= b.e && z >= b.c && z <= b.f)));
s.octree.comparaciones = 0;
const [tOct, rOct] = ms(() => pts.map(([x, y, z]) => s.octree.contienePunto(x, y, z)));
console.log(`1) ¿Hay obstáculo en este punto? (100 000 consultas, ${cajas.length} edificios)`);
console.log(`   lineal O(n): ${tLin.toFixed(0)} ms | Octree: ${tOct.toFixed(0)} ms | mismos resultados: ${rLin.every((v, i) => v === rOct[i])} | comparaciones por consulta: ${(s.octree.comparaciones / pts.length).toFixed(2)} (lineal: ${cajas.length})\n`);

// 2) Cola FIFO circular vs Array.shift()
const N = 100000;
const [tSh] = ms(() => { const a = []; for (let i = 0; i < N; i++) a.push(i); while (a.length) a.shift(); });
const [tFi] = ms(() => { const q = new ColaFIFO(); for (let i = 0; i < N; i++) q.encolar(i); while (q.tamano) q.desencolar(); });
console.log(`2) Cola de ${N} pedidos: Array.shift ${tSh.toFixed(0)} ms | ColaFIFO ${tFi.toFixed(0)} ms\n`);

// 3) Camino mínimo: versión simple (sort + shift + Map/Set) vs heap + Typed Arrays vs A*
function dijkstraSimple(o, d, ctx) {
  const dist = new Map([[o, 0]]), vis = new Set(); const fr = [{ id: o, c: 0 }];
  while (fr.length) {
    fr.sort((a, b) => a.c - b.c);
    const { id: u, c } = fr.shift();
    if (vis.has(u)) continue; vis.add(u);
    if (u === d) return { costo: c, explorados: vis.size };
    for (let k = 0; k < GRADO; k++) {
      const e = u * GRADO + k; if (g.aristaBloq[e]) continue;
      const v = g.dest[e]; if (vis.has(v)) continue;
      const nc = c + costoArista(g, e, v, ctx);
      if (nc < (dist.get(v) ?? Infinity)) { dist.set(v, nc); fr.push({ id: v, c: nc }); }
    }
  }
  return { costo: Infinity, explorados: vis.size };
}
const libres = []; for (let i = 0; i < g.total; i++) if (!g.bloqueado[i] && i < 1600) libres.push(i);
const pares = Array.from({ length: 60 }, () => [libres[(rnd() * libres.length) | 0], libres[(rnd() * libres.length) | 0]]);
const ctx = crearContexto({ pesoKg: 1, viento: { velocidad: 6, direccionGrados: 45 } });
const acum = { simple: [0, 0], heap: [0, 0], astar: [0, 0] }; let dif = 0, n = 0;
for (const [o, d] of pares) {
  const [t1, a] = ms(() => dijkstraSimple(o, d, ctx));
  const [t2, b] = ms(() => s.buscador.buscar(o, d, ctx, false));
  const [t3, c] = ms(() => s.buscador.buscar(o, d, ctx, true));
  if (!b.encontrada) continue; n++;
  if (Math.abs(a.costo - b.costo) > 1e-6 || Math.abs(c.costo - b.costo) > 1e-3) dif++;
  acum.simple[0] += t1; acum.simple[1] += a.explorados; acum.heap[0] += t2; acum.heap[1] += b.explorados; acum.astar[0] += t3; acum.astar[1] += c.explorados;
}
console.log(`3) Ruta de menor energía (${n} búsquedas, mismo costo en todas: ${dif === 0})`);
for (const [nom, [t, e]] of Object.entries(acum)) console.log(`   ${nom.padEnd(6)} ${(t / n).toFixed(2)} ms por búsqueda | ${(e / n).toFixed(0)} nodos explorados`);
