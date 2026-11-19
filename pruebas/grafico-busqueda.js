// Genera los gráficos PNG del benchmark de búsqueda con chartjs-node-canvas (ejes X e Y en escala logarítmica).
// Si la librería no está instalada, avisa y el benchmark sigue (CSV/JSON se escriben igual).
import fs from 'node:fs';
import path from 'node:path';

const TIPOS = ['primera', 'ultima', 'central', 'aleatoria', 'no_existente'];
const COLORES = { primera: '#FF6384', ultima: '#36A2EB', central: '#FFCE56', aleatoria: '#4BC0C0', no_existente: '#9966FF' };

function puntos(filas, filtro) {
  return filas.filter(filtro).sort((a, b) => a.n - b.n).map((f) => ({ x: f.n, y: f.t_prom_us }));
}

function configuracion(titulo, datasets) {
  return {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: titulo, font: { size: 18 } },
        legend: { labels: { color: '#333', font: { size: 10 } } },
      },
      scales: {
        x: { type: 'logarithmic', title: { display: true, text: 'Volumen de registros (escala logarítmica)', color: '#333' }, ticks: { color: '#555' } },
        y: { type: 'logarithmic', title: { display: true, text: 'Tiempo por consulta, µs (escala logarítmica)', color: '#333' }, ticks: { color: '#555' } },
      },
    },
  };
}

const linea = (label, data, color, discontinua) => ({
  label, data, borderColor: color, backgroundColor: 'transparent', borderWidth: 2,
  borderDash: discontinua ? [6, 4] : [], pointRadius: 4, fill: false, tension: 0.1,
});

export async function generarGraficos(filas, dirSalida) {
  let ChartJSNodeCanvas;
  try {
    ({ ChartJSNodeCanvas } = await import('chartjs-node-canvas'));
  } catch (e) {
    console.warn('\n[aviso] No se pudo cargar chartjs-node-canvas, no se generan los PNG.');
    console.warn('        Instala con: npm install chartjs-node-canvas chart.js   (el CSV y el JSON sí se escribieron)');
    return [];
  }
  const lienzo = new ChartJSNodeCanvas({ width: 1200, height: 800, backgroundColour: 'white' });
  const generados = [];
  const guardar = async (nombre, cfg) => {
    const ruta = path.join(dirSalida, nombre);
    fs.writeFileSync(ruta, await lienzo.renderToBuffer(cfg));
    generados.push(ruta);
  };

  // 1) Gráfico principal: secuencial vs binaria, memoria y archivo (caso promedio = clave aleatoria)
  const ale = (medio, alg) => (f) => f.medio === medio && f.algoritmo === alg && f.tipo_clave === 'aleatoria';
  await guardar('benchmark-busqueda.png', configuracion('Búsqueda secuencial vs binaria (clave aleatoria, caso promedio)', [
    linea('Secuencial - memoria', puntos(filas, ale('memoria', 'secuencial')), '#E74C3C', true),
    linea('Binaria - memoria', puntos(filas, ale('memoria', 'binaria')), '#2980B9', false),
    linea('Secuencial - archivo', puntos(filas, ale('archivo', 'secuencial')), '#F39C12', true),
    linea('Binaria - archivo', puntos(filas, ale('archivo', 'binaria')), '#16A085', false),
  ]));

  // 2) Una gráfica por medio con las 5 claves (primera, última, central, aleatoria, no existente)
  for (const medio of ['memoria', 'archivo']) {
    const datasets = [];
    for (const alg of ['secuencial', 'binaria']) {
      for (const tipo of TIPOS) {
        datasets.push(linea(`${alg === 'secuencial' ? 'Secuencial' : 'Binaria'} - ${tipo}`,
          puntos(filas, (f) => f.medio === medio && f.algoritmo === alg && f.tipo_clave === tipo), COLORES[tipo], alg === 'secuencial'));
      }
    }
    await guardar(`benchmark-busqueda-claves-${medio}.png`, configuracion(`Búsqueda en ${medio}: las 5 claves de prueba`, datasets));
  }
  return generados;
}