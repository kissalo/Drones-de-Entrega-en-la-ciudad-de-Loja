// Panel de control: crea pedidos (RF-09), elige peso/viento/batería (RF-02, RF-04) y simula un
// obstáculo de sensor en pleno vuelo (RF-05) que dispara la ruta alterna (RF-08).
import { useEffect, useRef, useState } from 'react';
import Escena3D from './Escena3D.jsx';

const csv = (t) => t.trim().split('\n').map((l) => l.split(',').map(Number));
const ndjson = (t) => t.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const FINALES = ['ok', 'sin_ruta', 'error'];

export default function App() {
  const [datos, setDatos] = useState(null);
  const [f, setF] = useState({ of: 3, oc: 3, df: 30, dc: 28, pesoKg: 2, vel: 0, dir: 90, bateria: 80 });
  const [ruta, setRuta] = useState(null);
  const [info, setInfo] = useState(null);
  const [obst, setObst] = useState([]);
  const [tele, setTele] = useState(null);
  const [seguir, setSeguir] = useState(true);
  const [factor, setFactor] = useState(10);
  const dronRef = useRef(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/config').then((r) => r.json()),
      fetch('/data/elevacion.csv').then((r) => r.text()),
      fetch('/data/edificios.ndjson').then((r) => r.text()),
      fetch('/data/cargadores.json').then((r) => r.json()),
    ]).then(([config, e, b, cargadores]) => {
      const terreno = csv(e);
      setDatos({ config, terreno, edificios: ndjson(b), cargadores, base: Math.min(...terreno.flat()) });
    }).catch((err) => setInfo({ estado: 'error', motivo: 'No se pudo cargar el mapa: ' + err.message }));
  }, []);

  const set = (k) => (e) => setF({ ...f, [k]: Number(e.target.value) });
  const pedidoBase = () => ({
    origen: { fila: f.of, col: f.oc }, destino: { fila: f.df, col: f.dc }, pesoKg: f.pesoKg,
    viento: { velocidad: f.vel, direccionGrados: f.dir }, bateriaWh: f.bateria,
  });

  async function resolver(body) {
    setInfo({ estado: 'en_cola' });
    const r = await fetch('/api/pedidos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) return setInfo({ estado: 'error', motivo: (await r.json()).error });
    const { id } = await r.json();
    for (;;) {                                           // el servidor responde 202; se consulta hasta que termine
      await new Promise((s) => setTimeout(s, 250));
      const s = await (await fetch('/api/pedidos/' + id)).json();
      setInfo(s);
      if (FINALES.includes(s.estado)) { if (s.estado === 'ok') setRuta(s.ruta); return; }
    }
  }

  // RF-05 + RF-08: un obstáculo aparece adelante del dron; se avisa al servidor y se replanifica desde su posición.
  async function obstaculoAdelante() {
    const d = dronRef.current;
    if (!ruta || !d) return;
    const resto = ruta.length - 1 - d.indice;
    if (resto < 4) return;
    const p = ruta[d.indice + Math.max(2, Math.floor(resto / 3))];
    const o = { x: p.x, y: p.y, z: p.z, radio: 90 };
    await fetch('/api/obstaculos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o) });
    setObst((a) => [...a, o]);
    const act = ruta[d.indice];
    await resolver({ ...pedidoBase(), origen: { fila: act.fila, col: act.col, capa: act.capa } });
  }

  const num = (k, et, min, max, step = 1) => (
    <label>{et}<input type="number" min={min} max={max} step={step} value={f[k]} onChange={set(k)} /></label>
  );
  const ocupado = info && !FINALES.includes(info.estado);

  return (
    <div className="app">
      <div className="panel">
        <h1>Drones de entrega · Loja</h1>
        <h2>Pedido</h2>
        <div className="fila">{num('of', 'Origen fila', 0, 39)}{num('oc', 'Origen col', 0, 39)}</div>
        <div className="fila">{num('df', 'Destino fila', 0, 39)}{num('dc', 'Destino col', 0, 39)}</div>
        <div className="fila">{num('pesoKg', 'Peso (kg)', 0, 5, 0.5)}{num('bateria', 'Batería (Wh)', 10, 200)}</div>
        <div className="fila">{num('vel', 'Viento (m/s)', 0, 15)}{num('dir', 'Hacia (°)', 0, 359)}</div>
        <button disabled={ocupado} onClick={() => resolver(pedidoBase())}>Enviar pedido</button>

        <h2>Vuelo</h2>
        <button className="sec" disabled={!ruta || ocupado} onClick={obstaculoAdelante}>Obstáculo adelante (sensor)</button>
        <div className="fila" style={{ marginTop: 8 }}>
          <label>Velocidad simulada ×{factor}
            <input type="range" min="1" max="40" value={factor} onChange={(e) => setFactor(+e.target.value)} />
          </label>
        </div>
        <label><input type="checkbox" checked={seguir} onChange={(e) => setSeguir(e.target.checked)} /> Seguir al dron</label>

        <h2>Estado</h2>
        <div className="datos">
          <div><span>Pedido</span><b>{info?.estado ?? '—'}</b></div>
          {info?.motivo && <div className="error">{info.motivo}</div>}
          {info?.estado === 'ok' && (<>
            <div><span>Consumo</span><b>{info.costoWh} Wh</b></div>
            <div><span>Batería usable</span><b>{info.bateriaUsableWh} Wh</b></div>
            <div><span>Distancia</span><b>{info.distanciaM} m</b></div>
            <div><span>Tiempo</span><b>{Math.round(info.tiempoS / 60)} min</b></div>
            <div><span>Paradas de carga</span><b>{info.paradasCarga.length ? info.paradasCarga.join(', ') : 'ninguna'}</b></div>
            <div><span>Algoritmo</span><b>{info.algoritmo}</b></div>
            <div><span>Nodos explorados</span><b>{info.explorados}</b></div>
            <div><span>Cálculo</span><b>{info.msCalculo} ms</b></div>
          </>)}
        </div>
        {tele && (<>
          <h2>Seguimiento (RF-03)</h2>
          <div className="datos">
            <div><span>Altitud s/ suelo</span><b>{tele.altSuelo} m</b></div>
            <div><span>Velocidad</span><b>{tele.v} m/s</b></div>
            <div><span>Progreso</span><b>{tele.progreso} %</b></div>
            <div><span>Fase</span><b>{tele.fase}</b></div>
          </div>
        </>)}
      </div>
      <div className="escena">
        {datos ? <Escena3D datos={datos} ruta={ruta} obstaculos={obst} seguir={seguir} factor={factor} dronRef={dronRef} onTelemetria={setTele} />
               : <p style={{ padding: 20 }}>Cargando mapa…</p>}
      </div>
    </div>
  );
}
