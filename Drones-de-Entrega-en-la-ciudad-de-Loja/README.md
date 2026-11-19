# Enrutamiento 3D multicapa para drones de entrega urbana en Loja

Proyecto de **Estructura de Datos**. Grafo multicapa 3D + Octree + colas + Typed Arrays + Streams + worker threads.

## Cómo ejecutarlo
```bash
npm install
npm run datos        # genera datos DEMO en data/ (reemplázalos por datos reales de Loja)
npm run prueba       # verifica RF-01..RF-09 y las estructuras (solo necesita Node)
npm run benchmark    # mide "versión simple" vs "con estructura": evidencia para el informe
npm run server       # API en http://localhost:3000
npm run cliente      # visor 3D en http://localhost:5173   (en otra terminal)
```

## Mapa de archivos
| Archivo | Estructura / tópico de la materia | Qué hace |
|---|---|---|
| `server/estructuras/min-heap.js` | Cola de prioridad (heap), O(log n) | Motor de Dijkstra/A* |
| `server/estructuras/cola-fifo.js` | Cola circular, O(1) | Pedidos en orden de llegada (RF-09) |
| `server/estructuras/octree.js` | Búsqueda espacial | Obstáculos estáticos y de sensores (RF-05, RNF-05) |
| `server/datos/cargador-stream.js` | Archivos y Streams, O(1) de memoria | Carga mapa y edificios por líneas |
| `server/grafo/malla.js` | TDA y Typed Arrays, complejidad espacial | Nodo = entero; vecinos por aritmética |
| `server/grafo/constructor.js` | Grafo multicapa | Bloquea nodos y aristas; agrega obstáculos en vuelo |
| `server/grafo/costo.js` | Función de costo | Energía: distancia, ascenso, viento (RF-02), peso (RF-04) |
| `server/rutas/buscador.js` | Camino mínimo | Dijkstra / A* con arreglos reutilizados (RNF-02) |
| `server/rutas/reconstruir.js` | Pila (LIFO) | Ruta en orden origen → destino |
| `server/rutas/planificador.js` | Reglas del negocio | Descenso lento (RF-06), cargadores (RF-07), ruta alterna (RF-08) |
| `server/pedidos/despachador.js` | Cola FIFO + Map | Asigna pedidos a workers |
| `server/workers/ruta-worker.js` | Event Loop | Calcula fuera del hilo de Express (RNF-01) |
| `server/index.js` | Event Loop / API | `POST /api/pedidos`, `GET /api/pedidos/:id`, `POST /api/obstaculos` |
| `cliente/*` | — | Visor Three.js, seguimiento del dron (RF-03) |

## Formato de datos (para usar datos reales)
- `data/elevacion.csv`: 40 líneas × 40 valores (m s. n. m.), una por fila de la malla.
- `data/edificios.ndjson`: un JSON por línea `{xmin,ymin,xmax,ymax,zmax,altura}` en metros locales (usa `latLonAMetros` de `config.js`; `zmax` = terreno + altura).
- `data/cargadores.json`: `[{ "id": "C1", "fila": 10, "col": 10 }]`.

## Límites conocidos (decláralos en el informe)
- Los datos incluidos son sintéticos. Las constantes de energía de `config.js` son didácticas: calíbralas.
- El obstáculo en vuelo (RF-05) lo simula un botón; no hay sensor real.
- Una sola parada de carga por pedido; se asume carga completa.
- Los obstáculos dinámicos se guardan solo en memoria: reiniciar el servidor los borra.
- El clima (RF-02) es un viento uniforme, no un pronóstico real.
