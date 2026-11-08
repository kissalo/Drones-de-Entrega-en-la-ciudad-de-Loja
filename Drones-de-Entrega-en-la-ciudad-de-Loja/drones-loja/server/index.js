// API REST (Express). Recibe pedidos, devuelve el estado/ruta y recibe obstáculos de los sensores.
import express from 'express';
import {
  PUERTO, DATA_DIR, FILAS, COLS, CAPAS, TAM_CELDA, ALTURAS_CAPA, PESO_MAX_KG, BATERIA_WH,
  VEL_CRUCERO, VEL_DESCENSO, ALTURA_ENTREGA,
} from './config.js';
import { Despachador } from './pedidos/despachador.js';

const app = express();
app.use(express.json());
app.use('/data', express.static(DATA_DIR));            // el cliente 3D descarga mapa y edificios
const despachador = new Despachador();

const esEntero = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;

app.get('/api/config', (_req, res) =>
  res.json({ FILAS, COLS, CAPAS, TAM_CELDA, ALTURAS_CAPA, PESO_MAX_KG, BATERIA_WH, VEL_CRUCERO, VEL_DESCENSO, ALTURA_ENTREGA }));

app.get('/api/estado', (_req, res) => res.json(despachador.resumen()));

app.post('/api/pedidos', (req, res) => {
  const { origen, destino, pesoKg = 0, viento = {}, bateriaWh } = req.body ?? {};
  if (!esEntero(origen?.fila, 0, FILAS - 1) || !esEntero(origen?.col, 0, COLS - 1) ||
      !esEntero(destino?.fila, 0, FILAS - 1) || !esEntero(destino?.col, 0, COLS - 1))
    return res.status(400).json({ error: 'origen/destino fuera de la malla' });
  if (origen.capa !== undefined && !esEntero(origen.capa, 0, CAPAS - 1))
    return res.status(400).json({ error: 'capa inválida' });
  if (!(pesoKg >= 0 && pesoKg <= PESO_MAX_KG))
    return res.status(400).json({ error: `pesoKg debe estar entre 0 y ${PESO_MAX_KG}` });
  const id = despachador.encolar({
    origen, destino, pesoKg,
    viento: { velocidad: Number(viento.velocidad) || 0, direccionGrados: Number(viento.direccionGrados) || 0 },
    bateriaWh: bateriaWh === undefined ? undefined : Number(bateriaWh),
  });
  res.status(202).json({ id });
});

app.get('/api/pedidos/:id', (req, res) => {
  const r = despachador.consultar(req.params.id);
  if (!r) return res.status(404).json({ error: 'pedido no existe' });
  res.json(r);
});

// Obstáculo detectado por un sensor: {x, y, z, radio} en metros locales.
app.post('/api/obstaculos', (req, res) => {
  const { x, y, z, radio } = req.body ?? {};
  if (![x, y, z, radio].every(Number.isFinite) || radio <= 0 || radio > 300)
    return res.status(400).json({ error: 'obstáculo inválido' });
  despachador.reportarObstaculo({ x, y, z, radio });
  res.json({ ok: true });
});

app.listen(PUERTO, () => console.log(`API de drones en http://localhost:${PUERTO}`));
