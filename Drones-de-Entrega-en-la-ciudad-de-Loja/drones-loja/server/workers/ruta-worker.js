// WORKER: calcula rutas fuera del hilo principal para no bloquear el Event Loop de Express (RNF-01).
// Cada worker carga su propia copia del mapa; los obstáculos nuevos se le envían por mensaje.
import { parentPort } from 'node:worker_threads';
import { DATA_DIR } from '../config.js';
import { crearSistema, planificar, registrarObstaculo } from '../rutas/planificador.js';

const sistema = await crearSistema(DATA_DIR);
parentPort.postMessage({ tipo: 'listo' });

parentPort.on('message', (m) => {
  try {
    if (m.tipo === 'obstaculo') registrarObstaculo(sistema, m.obstaculo);
    else if (m.tipo === 'planificar') {
      const t0 = performance.now();
      const resultado = planificar(sistema, m.pedido);
      resultado.msCalculo = Math.round((performance.now() - t0) * 10) / 10;
      parentPort.postMessage({ tipo: 'resultado', id: m.pedido.id, resultado });
    }
  } catch (err) {
    if (m.tipo === 'planificar')
      parentPort.postMessage({ tipo: 'resultado', id: m.pedido.id, resultado: { estado: 'error', motivo: String(err) } });
  }
});
