// Escena Three.js: relieve, edificios (un solo InstancedMesh), cargadores, ruta y obstáculos.
// Coordenadas: three.x = este, three.z = norte (fila), three.y = altitud - base (para números pequeños).
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Dron from './Dron.jsx';

export default function Escena3D({ datos, ruta, obstaculos, seguir, factor, dronRef, onTelemetria }) {
  const caja = useRef(null);
  const [escena, setEscena] = useState(null);
  const dinamico = useRef({ ruta: null, obst: [] });
  const { config: C, terreno, edificios, cargadores, base } = datos;

  useEffect(() => {
    const el = caja.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x10151c);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.1));
    const sol = new THREE.DirectionalLight(0xffffff, 1.2); sol.position.set(600, 1500, 400); scene.add(sol);

    const W = (C.COLS - 1) * C.TAM_CELDA, H = (C.FILAS - 1) * C.TAM_CELDA;
    const camera = new THREE.PerspectiveCamera(55, el.clientWidth / el.clientHeight, 1, 20000);
    camera.position.set(W / 2, 1600, H * 1.5);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(W / 2, 0, H / 2);

    // Relieve: una malla de triángulos con la elevación de cada celda
    const pos = new Float32Array(C.FILAS * C.COLS * 3), idx = [];
    for (let fi = 0; fi < C.FILAS; fi++) for (let c = 0; c < C.COLS; c++) {
      const i = (fi * C.COLS + c) * 3;
      pos[i] = c * C.TAM_CELDA; pos[i + 1] = terreno[fi][c] - base; pos[i + 2] = fi * C.TAM_CELDA;
      if (fi < C.FILAS - 1 && c < C.COLS - 1) {
        const a = fi * C.COLS + c, b = a + 1, d = a + C.COLS, e = d + 1;
        idx.push(a, d, b, b, d, e);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    scene.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x3b5b3b, flatShading: true, side: THREE.DoubleSide })));

    // Edificios: una sola llamada de dibujo para todos
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x9aa5b1 }), edificios.length);
    const o = new THREE.Object3D();
    edificios.forEach((b, i) => {
      o.position.set((b.xmin + b.xmax) / 2, b.zmax - base - b.altura / 2, (b.ymin + b.ymax) / 2);
      o.scale.set(b.xmax - b.xmin, b.altura, b.ymax - b.ymin);
      o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    });
    scene.add(im);

    for (const k of cargadores) {                       // RF-07
      const m = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 30, 16), new THREE.MeshStandardMaterial({ color: 0x22d3ee }));
      m.position.set(k.col * C.TAM_CELDA, terreno[k.fila][k.col] - base + 15, k.fila * C.TAM_CELDA);
      scene.add(m);
    }

    let vivo = true;
    const bucle = () => { if (!vivo) return; controls.update(); renderer.render(scene, camera); requestAnimationFrame(bucle); };
    bucle();
    const redim = () => { renderer.setSize(el.clientWidth, el.clientHeight); camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix(); };
    window.addEventListener('resize', redim);
    setEscena({ scene, camera, controls });
    return () => { vivo = false; window.removeEventListener('resize', redim); renderer.dispose(); el.removeChild(renderer.domElement); };
  }, [datos]);

  // Línea de la ruta (se redibuja en cada replanificación)
  useEffect(() => {
    if (!escena) return;
    const { scene } = escena;
    if (dinamico.current.ruta) { scene.remove(dinamico.current.ruta); dinamico.current.ruta.geometry.dispose(); }
    dinamico.current.ruta = null;
    if (!ruta) return;
    const g = new THREE.BufferGeometry().setFromPoints(ruta.map((p) => new THREE.Vector3(p.x, p.z - base, p.y)));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffc107 }));
    scene.add(l); dinamico.current.ruta = l;
  }, [escena, ruta]);

  // Obstáculos detectados por sensores
  useEffect(() => {
    if (!escena) return;
    const { scene } = escena;
    dinamico.current.obst.forEach((m) => scene.remove(m));
    dinamico.current.obst = obstaculos.map((ob) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(ob.radio, 24, 16), new THREE.MeshBasicMaterial({ color: 0xff4d4f, transparent: true, opacity: 0.35 }));
      m.position.set(ob.x, ob.z - base, ob.y); scene.add(m); return m;
    });
  }, [escena, obstaculos]);

  return (
    <div ref={caja} style={{ position: 'absolute', inset: 0 }}>
      <Dron escena={escena} ruta={ruta} base={base} terreno={terreno} config={C} seguir={seguir} factor={factor} dronRef={dronRef} onTelemetria={onTelemetria} />
    </div>
  );
}
