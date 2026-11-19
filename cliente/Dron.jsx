// Dron: recorre la ruta que calculó el servidor respetando la velocidad de cada tramo
// (crucero rápido, descenso final lento) y se detiene en el cargador (RF-03, RF-06, RF-07).
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const PAUSA_CARGA_S = 20; // pausa visual en el cargador (el tiempo real de carga lo informa el servidor)

export default function Dron({ escena, ruta, base, terreno, config, seguir, factor, dronRef, onTelemetria }) {
  const fRef = useRef(factor); fRef.current = factor;
  const sRef = useRef(seguir); sRef.current = seguir;

  useEffect(() => {
    if (!escena || !ruta?.length) return;
    const { scene, camera, controls } = escena;
    const P = ruta.map((p) => new THREE.Vector3(p.x, p.z - base, p.y));

    // Tiempos: pausa (si salió de un cargador) + tramo a la velocidad del punto de llegada
    const dur = [0], pausa = [0], llegada = [0];
    for (let i = 1; i < P.length; i++) {
      pausa[i] = ruta[i - 1].tipo === 'carga' ? PAUSA_CARGA_S : 0;
      dur[i] = P[i].distanceTo(P[i - 1]) / Math.max(ruta[i].v, 0.1);
      llegada[i] = llegada[i - 1] + pausa[i] + dur[i];
    }
    const total = llegada[P.length - 1];

    const dron = new THREE.Group();
    dron.add(new THREE.Mesh(new THREE.BoxGeometry(18, 5, 18), new THREE.MeshStandardMaterial({ color: 0xff7a00 })));
    for (const [x, z] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 1, 12), new THREE.MeshStandardMaterial({ color: 0x222222 }));
      r.position.set(x, 3, z); dron.add(r);
    }
    dron.position.copy(P[0]); scene.add(dron);

    let t = 0, i = 1, previo = performance.now(), ultimaTele = 0, vivo = true, anterior = P[0].clone();
    const paso = (ahora) => {
      if (!vivo) return;
      const dt = (ahora - previo) / 1000; previo = ahora;
      t = Math.min(t + dt * fRef.current, total);
      while (i < P.length - 1 && llegada[i] < t) i++;
      let fase = 'crucero';
      if (P.length > 1) {
        const ini = llegada[i - 1] + pausa[i];
        if (t < ini) { dron.position.copy(P[i - 1]); fase = 'cargando'; }
        else dron.position.lerpVectors(P[i - 1], P[i], Math.min((t - ini) / Math.max(dur[i], 1e-6), 1));
        if (ruta[i].tipo === 'entrega') fase = 'descenso lento';
        if (t >= total) fase = 'entregado';
      }
      if (sRef.current) {                              // la cámara acompaña sin perder el control orbital
        camera.position.add(dron.position.clone().sub(anterior));
        controls.target.copy(dron.position);
      }
      anterior.copy(dron.position);

      const ult = Math.max(0, fase === 'cargando' ? i - 1 : i - 1);   // último nodo ya pasado (para replanificar)
      const p = ruta[ult];
      if (dronRef) dronRef.current = { indice: ult, fila: p.fila, col: p.col, capa: p.capa };
      if (onTelemetria && ahora - ultimaTele > 200) {
        ultimaTele = ahora;
        const fi = Math.min(config.FILAS - 1, Math.max(0, Math.round(dron.position.z / config.TAM_CELDA)));
        const ci = Math.min(config.COLS - 1, Math.max(0, Math.round(dron.position.x / config.TAM_CELDA)));
        onTelemetria({
          altSuelo: Math.round(dron.position.y + base - terreno[fi][ci]),
          v: fase === 'cargando' || fase === 'entregado' ? 0 : ruta[i].v,
          progreso: Math.round((100 * t) / total), fase,
        });
      }
      requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
    return () => { vivo = false; scene.remove(dron); };
  }, [escena, ruta]);

  return null;
}
