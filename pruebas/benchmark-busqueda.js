/**
 * Benchmark: Búsqueda Secuencial vs Búsqueda Binaria
 */

import { performance } from 'node:perf_hooks';
import fs from 'node:fs';
import path from 'node:path';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { fileURLToPath } from 'node:url';

// En ES Modules, __dirname no existe por defecto, así que lo recreamos:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// 1. Implementación de los algoritmos de búsqueda


function busquedaSecuencial(arr, target) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] === target) return i;
    }
    return -1;
}

function busquedaBinaria(arr, target) {
    let izquierda = 0;
    let derecha = arr.length - 1;

    while (izquierda <= derecha) {
        const medio = Math.floor((izquierda + derecha) / 2);
        if (arr[medio] === target) return medio;
        if (arr[medio] < target) {
            izquierda = medio + 1;
        } else {
            derecha = medio - 1;
        }
    }
    return -1;
}


// 2. Utilidades de medición y estadísticas


function medirTiempo(fn, arr, target, repeticiones = 7) {
    const tiempos = [];
    for (let i = 0; i < repeticiones; i++) {
        const inicio = performance.now();
        fn(arr, target);
        const fin = performance.now();
        tiempos.push(fin - inicio);
    }
    tiempos.sort((a, b) => a - b);
    const mid = Math.floor(tiempos.length / 2);
    return tiempos.length % 2 !== 0
        ? tiempos[mid]
        : (tiempos[mid - 1] + tiempos[mid]) / 2;
}

function calentar(fn, arr, target) {
    for (let i = 0; i < 100; i++) {
        fn(arr, target);
    }
}


// 3. Generación de datos sintéticos


function generarArrayOrdenado(n) {
    const arr = new Array(n);
    for (let i = 0; i < n; i++) {
        arr[i] = i * 2; // Valores pares: 0, 2, 4, ...
    }
    return arr;
}


// 4. Configuración de los escenarios y claves de prueba


const VOLUMENES = [1000, 50000, 500000];
const TIPOS_CLAVE = ['primera', 'ultima', 'central', 'aleatoria', 'no_existente'];
const REPETICIONES = 7;

// 5. Función principal del benchmark


async function ejecutarBenchmark() {
    console.log('🚀 Iniciando benchmark de búsqueda secuencial vs binaria...\n');

    const resultados = [];

    for (const n of VOLUMENES) {
        console.log(`📊 Escenario: ${n.toLocaleString()} registros`);

        const arr = generarArrayOrdenado(n);

        const claves = {
            primera: arr[0],
            ultima: arr[arr.length - 1],
            central: arr[Math.floor(arr.length / 2)],
            aleatoria: arr[Math.floor(Math.random() * arr.length)],
            no_existente: -999
        };

        for (const tipo of TIPOS_CLAVE) {
            const clave = claves[tipo];

            calentar(busquedaSecuencial, arr, clave);
            calentar(busquedaBinaria, arr, clave);

            const tiempoSecuencial = medirTiempo(busquedaSecuencial, arr, clave, REPETICIONES);
            const tiempoBinaria = medirTiempo(busquedaBinaria, arr, clave, REPETICIONES);

            resultados.push({
                escenario: n,
                tipo_clave: tipo,
                valor_clave: clave,
                tiempo_secuencial_ms: tiempoSecuencial,
                tiempo_binaria_ms: tiempoBinaria
            });

            console.log(
                `   ${tipo.padEnd(15)} | Secuencial: ${tiempoSecuencial.toFixed(4)} ms | Binaria: ${tiempoBinaria.toFixed(4)} ms`
            );
        }
        console.log('');
    }

    return resultados;
}

// 6. Exportación de resultados (CSV y JSON)


function exportarCSV(resultados, rutaArchivo) {
    const cabecera = 'escenario,tipo_clave,valor_clave,tiempo_secuencial_ms,tiempo_binaria_ms\n';
    const filas = resultados.map(r =>
        `${r.escenario},${r.tipo_clave},${r.valor_clave},${r.tiempo_secuencial_ms},${r.tiempo_binaria_ms}`
    ).join('\n');
    fs.writeFileSync(rutaArchivo, cabecera + filas, 'utf8');
    console.log(`📄 CSV exportado a: ${rutaArchivo}`);
}

function exportarJSON(resultados, rutaArchivo) {
    fs.writeFileSync(rutaArchivo, JSON.stringify(resultados, null, 2), 'utf8');
    console.log(`📄 JSON exportado a: ${rutaArchivo}`);
}


// 7. Generación del gráfico PNG


async function generarGrafico(resultados, rutaArchivo) {
    const ancho = 1200;
    const alto = 800;
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: ancho, height: alto });

    const tiposClave = [...new Set(resultados.map(r => r.tipo_clave))];
    const datasets = [];

    const colores = {
        primera: '#FF6384',
        ultima: '#36A2EB',
        central: '#FFCE56',
        aleatoria: '#4BC0C0',
        no_existente: '#9966FF'
    };

    for (const tipo of tiposClave) {
        const datosTipo = resultados.filter(r => r.tipo_clave === tipo);
        datasets.push({
            label: `Secuencial - ${tipo}`,
            data: datosTipo.map(r => ({
                x: r.escenario,
                y: r.tiempo_secuencial_ms
            })),
            borderColor: colores[tipo],
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 4,
            fill: false,
            tension: 0.1
        });
    }

    for (const tipo of tiposClave) {
        const datosTipo = resultados.filter(r => r.tipo_clave === tipo);
        datasets.push({
            label: `Binaria - ${tipo}`,
            data: datosTipo.map(r => ({
                x: r.escenario,
                y: r.tiempo_binaria_ms
            })),
            borderColor: colores[tipo],
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 4,
            fill: false,
            tension: 0.1
        });
    }

    const configuracion = {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Benchmark: Búsqueda Secuencial vs Binaria',
                    font: { size: 18 }
                },
                legend: {
                    labels: { color: '#333', font: { size: 10 } }
                }
            },
            scales: {
                x: {
                    type: 'logarithmic',
                    title: {
                        display: true,
                        text: 'Volumen de registros (escala logarítmica)',
                        color: '#333'
                    },
                    ticks: { color: '#555' }
                },
                y: {
                    type: 'logarithmic',
                    title: {
                        display: true,
                        text: 'Tiempo (ms) - escala logarítmica',
                        color: '#333'
                    },
                    ticks: { color: '#555' }
                }
            }
        }
    };

    const buffer = await chartJSNodeCanvas.renderToBuffer(configuracion);
    fs.writeFileSync(rutaArchivo, buffer);
    console.log(` Gráfico PNG generado en: ${rutaArchivo}`);
}

// ============================================================
// 8. Punto de entrada principal
// ============================================================

(async () => {
    try {
        const dirResultados = path.join(__dirname, 'resultados');
        if (!fs.existsSync(dirResultados)) {
            fs.mkdirSync(dirResultados, { recursive: true });
        }

        const resultados = await ejecutarBenchmark();

        exportarCSV(resultados, path.join(dirResultados, 'benchmark-busqueda.csv'));
        exportarJSON(resultados, path.join(dirResultados, 'benchmark-busqueda.json'));

        await generarGrafico(resultados, path.join(dirResultados, 'benchmark-busqueda.png'));

        console.log('\n Benchmark completado con éxito.');
        console.log(` Revisa los archivos en: ${dirResultados}`);
    } catch (error) {
        console.error(' Error durante el benchmark:', error);
        process.exit(1);
    }
})();