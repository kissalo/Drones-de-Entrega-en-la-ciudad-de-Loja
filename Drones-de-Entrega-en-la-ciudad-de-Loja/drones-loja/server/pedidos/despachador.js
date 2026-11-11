// DESPACHADOR: los ciudadanos hacen pedidos (RF-09) → entran a una COLA FIFO → se asignan al primer
// worker libre. Los resultados se buscan por id en un Map (O(1)).

//Recibe la orden , para que vayan en orden aplicando FIFO, y se asigna a 
// un worker libre para que lo procese.


import os from 'node:os';
import { Worker } from 'node:worker_threads';
import { ColaFIFO } from '../estructuras/cola-fifo.js';

const RUTA_WORKER = new URL('../workers/ruta-worker.js', import.meta.url);
const MAX_GUARDADOS = 1000;

export class Despachador {
  constructor(nWorkers = Math.max(2, Math.min(4, os.cpus().length - 1))) {
    this.cola = new ColaFIFO();
    this.estados = new Map();   // id → { estado, ...resultado }
    this.contador = 0;
    this.slots = [];
    for (let i = 0; i < nWorkers; i++) {
      const slot = { w: new Worker(RUTA_WORKER), listo: false, ocupado: false, actual: null };
      slot.w.on('message', (m) => {
        if (m.tipo === 'listo') slot.listo = true;
        else if (m.tipo === 'resultado') {
          this.estados.set(m.id, m.resultado);
          slot.ocupado = false; slot.actual = null;
        }
        this._bombear();
      });
      slot.w.on('error', (e) => {
        console.error('worker error:', e);
        if (slot.actual) this.estados.set(slot.actual, { estado: 'error', motivo: String(e) });
        slot.listo = false; slot.ocupado = false;
      });
      this.slots.push(slot);
    }
  }

  encolar(pedido) {
    const id = `P-${++this.contador}`;
    this.estados.set(id, { estado: 'en_cola' });
    if (this.estados.size > MAX_GUARDADOS) this.estados.delete(this.estados.keys().next().value);
    this.cola.encolar({ ...pedido, id });
    this._bombear();
    return id;
  }

  consultar(id) { return this.estados.get(id); }

  // RF-05: el obstáculo se avisa a TODOS los workers antes de planificar de nuevo.
  reportarObstaculo(obstaculo) {
    for (const s of this.slots) s.w.postMessage({ tipo: 'obstaculo', obstaculo });
  }

  resumen() {
    return { enCola: this.cola.tamano, workers: this.slots.length, ocupados: this.slots.filter((s) => s.ocupado).length };
  }

  _bombear() {
    while (this.cola.tamano > 0) {
      const slot = this.slots.find((s) => s.listo && !s.ocupado);
      if (!slot) return;
      const pedido = this.cola.desencolar();             // el primero en llegar es el primero en salir
      slot.ocupado = true; slot.actual = pedido.id;
      this.estados.set(pedido.id, { estado: 'calculando' });
      slot.w.postMessage({ tipo: 'planificar', pedido });
    }
  }

  cerrar() { return Promise.all(this.slots.map((s) => s.w.terminate())); }
}
