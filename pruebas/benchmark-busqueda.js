// BENCHMARK Búsqueda secuencial O(n) vs binaria O(log n) — Avance 2, Unidad 2.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { busquedaSecuencial } from '../busqueda/busqueda-secuencial.js';
import { busquedaBinaria } from '../busqueda/busqueda-binaria.js';
import { generarDatasetOrdenado, generarObjetivos, VOLUMENES } from '../busqueda/generador-datos.js';
import { escribirArchivoIndexado, busquedaSecuencialArchivo, busquedaBinariaArchivo, crearBloque, crearRegistro } from '../busqueda/busqueda-archivo.js';
import { generarGraficos } from './grafico-busqueda.js';

/* ---------- argumentos ---------- */
const arg = (nombre, def) => { const i = process.argv.indexOf('--' + nombre); return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : def; };
const TAMANOS = String(arg('sizes', VOLUMENES.join(','))).split(',').map(Number);
const Q_MEM = Number(arg('consultas-mem', 500));       // consultas de la clave "aleatoria" en memoria
const Q_ARCH = Number(arg('consultas-archivo', 100));  // ídem en archivo
const Q_FIJA = 50;                                     // repeticiones de las claves fijas (primera, última, central, no existente) por lote
const REPS = Number(arg('reps', 7));                   // entre 5 y 10
const CAMPO = 'id';
const TIPOS = ['primera', 'ultima', 'central', 'aleatoria', 'no_existente'];
const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const DIR_CRUDOS = path.resolve(arg('crudos', path.join(RAIZ, 'pruebas', 'resultados')));
const OBJ_LOTE_MS = 20;   // cada medición dura al menos ~20 ms: así el reloj no se confunde con el ruido

/* ---------- utilidades ---------- */
const media = (v) => v.reduce((a, b) => a + b, 0) / v.length;
const mediana = (v) => { const o = [...v].sort((a, b) => a - b), m = o.length >> 1; return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2; };
const desv = (v) => { if (v.length < 2) return 0; const m = media(v); return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1)); };
const log2 = (x) => Math.log(x) / Math.LN2;

// Comparaciones teóricas: promedio para "aleatoria"; valor exacto (secuencial) o cota del peor caso (binaria) para las fijas.
function teorica(tipo, algoritmo, n) {
  if (algoritmo === 'binaria') return tipo === 'aleatoria' ? log2(n) : Math.floor(log2(n)) + 1;
  return { primera: 1, ultima: n, central: Math.floor(n / 2) + 1, aleatoria: (n + 1) / 2, no_existente: n }[tipo];
}

/* ---------- cronometraje por lotes ---------- */
let SUMIDERO = 0;   // evita que el motor elimine las llamadas como "código muerto"
function cronometrar(lote, q) {
  lote(Math.min(q, 20), 1);                                        // calentamiento (JIT)
  let t0 = performance.now();
  SUMIDERO ^= lote(q, 1);
  const una = performance.now() - t0;
  const vueltas = Math.max(1, Math.min(5000, Math.ceil(OBJ_LOTE_MS / Math.max(una, 1e-4))));   // repite el lote si es muy corto
  if (vueltas > 1) SUMIDERO ^= lote(q, vueltas);                   // lote de calentamiento sin medir
  const tiempos = [], cpus = [];
  for (let r = 0; r < REPS; r++) {
    const c0 = process.cpuUsage();
    t0 = performance.now();
    SUMIDERO ^= lote(q, vueltas);
    const t1 = performance.now();
    const c = process.cpuUsage(c0);
    tiempos.push(((t1 - t0) * 1000) / (q * vueltas));              // µs por consulta (reloj de pared)
    cpus.push((c.user + c.system) / (q * vueltas));                // µs de CPU por consulta
  }
  return { t_prom_us: media(tiempos), t_mediana_us: mediana(tiempos), t_desv_us: desv(tiempos), cpu_prom_us: media(cpus), vueltas };
}

/* ---------- experimento ---------- */
async function main() {
  fs.mkdirSync(DIR_CRUDOS, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-'));
  const bloque = crearBloque(), reg = crearRegistro();
  const filas = [], sorts = {};
  console.log(`Node ${process.version} | tamaños: ${TAMANOS.join(', ')} | repeticiones: ${REPS} | aleatoria: ${Q_MEM} (memoria) y ${Q_ARCH} (archivo) consultas`);

  for (const n of TAMANOS) {
    const t0 = performance.now();
    const datos = generarDatasetOrdenado(n, CAMPO);                // edificios del proyecto ordenados con mergeSort (semilla fija)
    sorts[n] = performance.now() - t0;
    const ruta = path.join(tmp, `edificios_${n}.bin`);
    escribirArchivoIndexado(ruta, datos);
    const fd = fs.openSync(ruta, 'r');
    const oMem = generarObjetivos(datos, CAMPO, Q_MEM), oArch = generarObjetivos(datos, CAMPO, Q_ARCH);

    // Posición real de las claves fijas (para verificar) y conjuntos de consultas por tipo
    const posFija = { primera: 0, ultima: n - 1, central: Math.floor(n / 2) };
    const consultas = (aleatorias) => ({
      primera: Array(Q_FIJA).fill(datos[posFija.primera][CAMPO]),
      ultima: Array(Q_FIJA).fill(datos[posFija.ultima][CAMPO]),
      central: Array(Q_FIJA).fill(datos[posFija.central][CAMPO]),
      aleatoria: aleatorias.existentes,
      no_existente: Array(Q_FIJA).fill(-1),                        // id inexistente: peor caso (obliga a recorrer todo / agotar los pasos)
    });
    const medios = [
      { medio: 'memoria', cons: consultas(oMem), inex: oMem.inexistentes,
        sec: (x) => busquedaSecuencial(datos, x, CAMPO), bin: (x) => busquedaBinaria(datos, x, CAMPO) },
      { medio: 'archivo', cons: consultas(oArch), inex: oArch.inexistentes,
        sec: (x) => busquedaSecuencialArchivo(fd, n, x, bloque), bin: (x) => busquedaBinariaArchivo(fd, n, x, reg) },
    ];

    for (const m of medios) {
      for (const tipo of TIPOS) {
        const claves = m.cons[tipo], q = claves.length;
        for (const algoritmo of ['secuencial', 'binaria']) {
          const f = algoritmo === 'secuencial' ? m.sec : m.bin;
          // 1) Verificación y conteo (fuera del cronometraje)
          let comp = 0, lect = 0;
          for (let k = 0; k < q; k++) {
            const r = f(claves[k]);
            if (tipo === 'no_existente') { if (r.encontrado) throw new Error(`Falso positivo: ${m.medio}/${algoritmo} n=${n}`); }
            else if (!r.encontrado || datos[r.indice][CAMPO] !== claves[k] || (tipo !== 'aleatoria' && r.indice !== posFija[tipo])) {
              throw new Error(`Resultado incorrecto: ${m.medio}/${algoritmo}/${tipo} n=${n} id=${claves[k]}`);
            }
            comp += r.comparaciones; lect += r.lecturas || 0;
          }
          for (const x of m.inex) if (f(x).encontrado) throw new Error(`Falso positivo: ${m.medio}/${algoritmo} n=${n}`);
          // 2) Cronometraje
          const lote = (cant, vueltas) => { let s = 0; for (let v = 0; v < vueltas; v++) for (let k = 0; k < cant; k++) s += f(claves[k]).indice; return s | 0; };
          const t = cronometrar(lote, q);
          filas.push({ medio: m.medio, n, tipo_clave: tipo, algoritmo, consultas: q, repeticiones: REPS, vueltas_por_lote: t.vueltas,
            t_prom_us: t.t_prom_us, t_mediana_us: t.t_mediana_us, t_desv_us: t.t_desv_us, cpu_prom_us: t.cpu_prom_us,
            comp_medidas: comp / q, comp_teoricas: teorica(tipo, algoritmo, n), lecturas_es: lect / q });
        }
        const s = filas[filas.length - 2], b = filas[filas.length - 1];
        console.log(`${m.medio.padEnd(8)} ${String(n).padStart(7)} ${tipo.padEnd(12)} sec=${s.t_prom_us.toFixed(4).padStart(11)} µs  bin=${b.t_prom_us.toFixed(4).padStart(9)} µs  comp ${s.comp_medidas.toFixed(1)} / ${b.comp_medidas.toFixed(1)}`);
      }
    }
    fs.closeSync(fd);
    fs.unlinkSync(ruta);
  }
  fs.rmSync(tmp, { recursive: true, force: true });

  const buscar = (m, n, t, a) => filas.find((f) => f.medio === m && f.n === n && f.tipo_clave === t && f.algoritmo === a);
  for (const f of filas) if (f.algoritmo === 'binaria') f.aceleracion = buscar(f.medio, f.n, f.tipo_clave, 'secuencial').t_prom_us / f.t_prom_us;

  const entorno = { fecha: new Date().toISOString().slice(0, 10), node: process.version, so: `${os.type()} ${os.release()} (${process.platform}/${process.arch})`,
    cpu: os.cpus()[0] ? os.cpus()[0].model.trim() : 'desconocido', nucleos: os.cpus().length, ram_gb: (os.totalmem() / 2 ** 30).toFixed(1) };
  escribirCrudos(filas, sorts, entorno);
  const pngs = await generarGraficos(filas, DIR_CRUDOS);
  console.log(`\nResultados crudos (CSV/JSON${pngs.length ? ' y PNG' : ''}) en ${DIR_CRUDOS}`);
  for (const p of pngs) console.log('  PNG: ' + path.basename(p));
}

/* ---------- resultados crudos: CSV + JSON ---------- */
function ordenar(filas) {
  const om = { memoria: 0, archivo: 1 };
  filas.sort((a, b) => om[a.medio] - om[b.medio] || a.n - b.n || TIPOS.indexOf(a.tipo_clave) - TIPOS.indexOf(b.tipo_clave) || (a.algoritmo === 'secuencial' ? -1 : 1));
}
function escribirCrudos(filas, sorts, entorno) {
  ordenar(filas);
  const cab = ['medio', 'n', 'tipo_clave', 'algoritmo', 'consultas', 'repeticiones', 't_prom_us', 't_mediana_us', 't_desv_us', 'cpu_prom_us', 'comp_medidas', 'comp_teoricas', 'lecturas_es', 'aceleracion'];
  fs.writeFileSync(path.join(DIR_CRUDOS, 'benchmark-busqueda.csv'), [cab.join(',')].concat(filas.map((f) => cab.map((k) => (f[k] === undefined ? '' : f[k])).join(','))).join('\n') + '\n');
  fs.writeFileSync(path.join(DIR_CRUDOS, 'benchmark-busqueda.json'), JSON.stringify({ entorno, parametros: { TAMANOS, Q_MEM, Q_ARCH, Q_FIJA, REPS, CAMPO }, generar_y_ordenar_ms: sorts, filas }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });