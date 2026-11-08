// Prueba de extremo a extremo de los requisitos. Ejecuta: npm run prueba
import { DATA_DIR, TAM_CELDA } from '../server/config.js';
import { crearSistema, planificar, registrarObstaculo } from '../server/rutas/planificador.js';
import { ColaFIFO } from '../server/estructuras/cola-fifo.js';
import { MinHeap } from '../server/estructuras/min-heap.js';
import { Despachador } from '../server/pedidos/despachador.js';

let fallos = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fallos++; };

// --- estructuras sueltas ---
const h = new MinHeap(2);
[5, 1, 4, 2, 3, 0, 9].forEach((k) => h.push(k, k * 10));
const salida = []; while (h.tamano) salida.push(h.pop());
ok(salida.join() === '0,10,20,30,40,50,90', 'MinHeap saca en orden de costo');
const q = new ColaFIFO(2); for (let i = 0; i < 10; i++) q.encolar(i);
const sq = []; while (q.tamano) sq.push(q.desencolar());
ok(sq.join() === '0,1,2,3,4,5,6,7,8,9', 'ColaFIFO respeta orden de llegada (y crece)');

// --- sistema ---
const s = await crearSistema(DATA_DIR);
const bloq = s.grafo.bloqueado.reduce((a, b) => a + b, 0);
console.log(`  nodos: ${s.grafo.total}, bloqueados: ${bloq} (${(100 * bloq / s.grafo.total).toFixed(1)} %), edificios en Octree: ${s.octree.cantidad}`);

const base = { origen: { fila: 3, col: 3 }, destino: { fila: 30, col: 28 }, pesoKg: 0, viento: { velocidad: 0, direccionGrados: 0 } };
const r0 = planificar(s, base);
ok(r0.estado === 'ok', `RF-01 ruta encontrada (${r0.ruta?.length} puntos, ${r0.costoWh} Wh, ${r0.distanciaM} m, explorados ${r0.explorados})`);
const rD = planificar(s, base, false);
ok(Math.abs(rD.costoWh - r0.costoWh) < 0.01, `A* y Dijkstra dan el mismo costo (${r0.costoWh} vs ${rD.costoWh}); explorados ${r0.explorados} vs ${rD.explorados}`);

const rP = planificar(s, { ...base, pesoKg: 3 });
ok(rP.costoWh > r0.costoWh, `RF-04 más peso, más energía (${r0.costoWh} → ${rP.costoWh} Wh)`);
const favor = planificar(s, { ...base, viento: { velocidad: 12, direccionGrados: 60 } });
const contra = planificar(s, { ...base, viento: { velocidad: 12, direccionGrados: 240 } });
ok(favor.costoWh < contra.costoWh, `RF-02 viento a favor ${favor.costoWh} Wh < en contra ${contra.costoWh} Wh`);

const fin = r0.ruta[r0.ruta.length - 1];
ok(fin.tipo === 'entrega' && fin.v < 3 && r0.ruta[r0.ruta.length - 2].z > fin.z, 'RF-06 termina con descenso lento hasta el punto de entrega');

const rC = planificar(s, { ...base, bateriaWh: 44 });
ok(rC.estado === 'ok' && rC.paradasCarga.length === 1, `RF-07 con batería baja pasa por cargador (${rC.paradasCarga}) y suma ${rC.costoWh} Wh`);
const rN = planificar(s, { ...base, bateriaWh: 5 });
ok(rN.estado === 'sin_ruta', 'batería imposible → sin_ruta (no inventa una ruta)');

// --- RF-05 / RF-08: obstáculo nuevo en vuelo y ruta alterna ---
const m = r0.ruta[Math.floor(r0.ruta.length / 2)];
const obs = { x: m.x, y: m.y, z: m.z, radio: 90 };
registrarObstaculo(s, obs);
const rA = planificar(s, base);
const dentro = rA.ruta.some((p) => Math.hypot(p.x - obs.x, p.y - obs.y, p.z - obs.z) < obs.radio);
ok(rA.estado === 'ok' && !dentro, `RF-08 ruta alterna evita el obstáculo (${r0.costoWh} → ${rA.costoWh} Wh)`);
ok(rA.ruta.map((p) => p.x + ',' + p.y + ',' + p.z).join('|') !== r0.ruta.map((p) => p.x + ',' + p.y + ',' + p.z).join('|'), 'la ruta alterna es distinta a la original');

// --- despachador con workers: orden de llegada ---
const d = new Despachador(2);
const ids = [1, 2, 3, 4, 5].map((i) => d.encolar({ ...base, origen: { fila: 2 + i, col: 3 } }));
const t0 = Date.now();
while (!ids.every((id) => ['ok', 'sin_ruta', 'error'].includes(d.consultar(id)?.estado)) && Date.now() - t0 < 30000)
  await new Promise((r) => setTimeout(r, 100));
ok(ids.every((id) => d.consultar(id)?.estado === 'ok'), `RF-09 despachador atendió 5 pedidos con workers (${Date.now() - t0} ms)`);
await d.cerrar();

console.log(fallos ? `\n${fallos} prueba(s) fallaron` : '\nTodo en orden');
process.exit(fallos ? 1 : 0);
