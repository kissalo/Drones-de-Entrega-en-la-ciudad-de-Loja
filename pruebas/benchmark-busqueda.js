// BENCHMARK Búsqueda secuencial O(n) vs binaria O(log n) — Avance 2, Unidad 2.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { busquedaSecuencial } from '../busqueda/busqueda-secuencial.js';
import { busquedaBinaria } from '../busqueda/busqueda-binaria.js';
import { generarDatasetOrdenado, generarObjetivos, VOLUMENES } from '../busqueda/generador-datos.js';
import { escribirArchivoIndexado, busquedaSecuencialArchivo, busquedaBinariaArchivo, crearBloque, crearRegistro, TAM_REGISTRO } from '../busqueda/busqueda-archivo.js';
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
const DIR_INFORME = path.resolve(arg('salida', path.join(RAIZ, 'informe-avance2', 'resultados')));
const DIR_CRUDOS = path.resolve(arg('crudos', path.join(RAIZ, 'pruebas', 'resultados')));
const OBJ_LOTE_MS = 20;   // cada medición dura al menos ~20 ms: así el reloj no se confunde con el ruido

/* ---------- utilidades ---------- */
const media = (v) => v.reduce((a, b) => a + b, 0) / v.length;
const mediana = (v) => { const o = [...v].sort((a, b) => a - b), m = o.length >> 1; return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2; };
const desv = (v) => { if (v.length < 2) return 0; const m = media(v); return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1)); };
const log2 = (x) => Math.log(x) / Math.LN2;
const miles = (e) => String(e).replace(/\B(?=(\d{3})+(?!\d))/g, '\\,');
function fmt(x) {   // coma decimal y espacio fino de miles (estilo ES) para LaTeX
  if (!isFinite(x)) return '--';
  const d = x >= 10 ? 2 : x >= 1 ? 3 : x >= 0.1 ? 4 : 5;
  const [e, f] = Math.abs(x).toFixed(d).split('.');
  return (x < 0 ? '-' : '') + miles(e) + '{,}' + f;
}
const fmtEntero = (x) => miles(Math.round(x));
const esc = (s) => String(s).replace(/([\\&%$#_{}])/g, '\\$1').replace(/~/g, '\\textasciitilde{}').replace(/\^/g, '\\textasciicircum{}');
const NOMBRE_TIPO = { primera: 'Primera', ultima: String.raw`\'Ultima`, central: 'Central', aleatoria: 'Aleatoria', no_existente: 'No existente' };

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
  fs.mkdirSync(DIR_INFORME, { recursive: true });
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
  escribirParaInforme(filas, sorts, entorno);
  const pngs = await generarGraficos(filas, DIR_CRUDOS);
  console.log(`\nResultados crudos (CSV/JSON${pngs.length ? ' y PNG' : ''}) en ${DIR_CRUDOS}`);
  for (const p of pngs) console.log('  PNG: ' + path.basename(p));
  console.log(`Archivos para el informe en ${DIR_INFORME}`);
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

/* ---------- archivos que lee el informe LaTeX ---------- */
function escribirParaInforme(filas, sorts, entorno) {
  const prom = filas.filter((f) => f.tipo_clave === 'aleatoria');   // caso promedio
  const g = (m, n, a) => prom.find((f) => f.medio === m && f.n === n && f.algoritmo === a);
  const gt = (m, n, t, a) => filas.find((f) => f.medio === m && f.n === n && f.tipo_clave === t && f.algoritmo === a);

  const ancho = ['n,seq_mem_us,bin_mem_us,seq_arch_us,bin_arch_us,comp_seq,comp_bin,lect_seq_arch,lect_bin_arch'];
  for (const n of TAMANOS) ancho.push([n, g('memoria', n, 'secuencial').t_prom_us, g('memoria', n, 'binaria').t_prom_us, g('archivo', n, 'secuencial').t_prom_us,
    g('archivo', n, 'binaria').t_prom_us, g('memoria', n, 'secuencial').comp_medidas, g('memoria', n, 'binaria').comp_medidas,
    g('archivo', n, 'secuencial').lecturas_es, g('archivo', n, 'binaria').lecturas_es].join(','));
  fs.writeFileSync(path.join(DIR_INFORME, 'curvas.csv'), ancho.join('\n') + '\n');

  // Tabla principal (clave aleatoria = caso promedio)
  let tex = '', medioPrev = null;
  for (const f of prom) {
    if (medioPrev !== null && f.medio !== medioPrev) tex += '\\midrule\n';
    medioPrev = f.medio;
    tex += [f.medio === 'memoria' ? 'Memoria' : 'Archivo', `$${miles(f.n)}$`, f.algoritmo === 'secuencial' ? 'Secuencial' : 'Binaria',
      fmt(f.t_prom_us), fmt(f.t_desv_us), fmt(f.cpu_prom_us), fmt(f.comp_medidas), fmt(f.comp_teoricas),
      f.medio === 'archivo' ? fmt(f.lecturas_es) : '--', f.algoritmo === 'binaria' ? `$\\times$${fmt(f.aceleracion)}` : '--'].join(' & ') + ' \\\\\n';
  }
  fs.writeFileSync(path.join(DIR_INFORME, 'filas_tabla.tex'), tex.replace(/ \\\\\n$/, '\n'));   // sin el último salto: el .tex lo agrega tras \input

  const nMin = Math.min(...TAMANOS), nMax = Math.max(...TAMANOS);

  // Tabla por tipo de clave, con el mayor volumen
  let tc = '';
  for (const medio of ['memoria', 'archivo']) {
    if (medio === 'archivo') tc += '\\midrule\n';
    for (const tipo of TIPOS) {
      const s = gt(medio, nMax, tipo, 'secuencial'), b = gt(medio, nMax, tipo, 'binaria');
      tc += [medio === 'memoria' ? 'Memoria' : 'Archivo', NOMBRE_TIPO[tipo], fmt(s.t_prom_us), fmt(b.t_prom_us), fmt(s.comp_medidas), fmt(b.comp_medidas), `$\\times$${fmt(b.aceleracion)}`].join(' & ') + ' \\\\\n';
    }
  }
  fs.writeFileSync(path.join(DIR_INFORME, 'filas_claves.tex'), tc.replace(/ \\\\\n$/, '\n'));

  const sm = g('memoria', nMax, 'secuencial'), bm = g('memoria', nMax, 'binaria'), sa = g('archivo', nMax, 'secuencial'), ba = g('archivo', nMax, 'binaria');
  const sm0 = g('memoria', nMin, 'secuencial'), bm0 = g('memoria', nMin, 'binaria'), sa0 = g('archivo', nMin, 'secuencial'), ba0 = g('archivo', nMin, 'binaria');
  const pct = (x) => fmt(x * 100);
  const M = {
    nMin: `$${miles(nMin)}$`, nMax: `$${miles(nMax)}$`, NumConsMem: fmtEntero(Q_MEM), NumConsArch: fmtEntero(Q_ARCH), NumConsFija: fmtEntero(Q_FIJA), Reps: String(REPS),
    FactorN: fmtEntero(nMax / nMin), FactorLog: fmt(log2(nMax) / log2(nMin)),
    SpeedMemMax: fmt(sm.t_prom_us / bm.t_prom_us), SpeedArchMax: fmt(sa.t_prom_us / ba.t_prom_us),
    SpeedMemMin: fmt(sm0.t_prom_us / bm0.t_prom_us), SpeedArchMin: fmt(sa0.t_prom_us / ba0.t_prom_us),
    CompSecMax: fmt(sm.comp_medidas), CompBinMax: fmt(bm.comp_medidas), RatioCompMax: fmt(sm.comp_medidas / bm.comp_medidas),
    CrecSecMem: fmt(sm.t_prom_us / sm0.t_prom_us), CrecBinMem: fmt(bm.t_prom_us / bm0.t_prom_us),
    CrecSecArch: fmt(sa.t_prom_us / sa0.t_prom_us), CrecBinArch: fmt(ba.t_prom_us / ba0.t_prom_us),
    AhorroCPUMem: pct(1 - bm.cpu_prom_us / sm.cpu_prom_us), AhorroCPUArch: pct(1 - ba.cpu_prom_us / sa.cpu_prom_us),
    LectSecArch: fmt(sa.lecturas_es), LectBinArch: fmt(ba.lecturas_es),
    TSecMemMax: fmt(sm.t_prom_us), TBinMemMax: fmt(bm.t_prom_us), TSecArchMax: fmt(sa.t_prom_us), TBinArchMax: fmt(ba.t_prom_us),
    // peor caso (clave no existente) con el mayor volumen
    PeorSecMem: fmt(gt('memoria', nMax, 'no_existente', 'secuencial').t_prom_us), PeorBinMem: fmt(gt('memoria', nMax, 'no_existente', 'binaria').t_prom_us),
    PeorSecArch: fmt(gt('archivo', nMax, 'no_existente', 'secuencial').t_prom_us), PeorBinArch: fmt(gt('archivo', nMax, 'no_existente', 'binaria').t_prom_us),
    PeorCompSec: fmt(gt('memoria', nMax, 'no_existente', 'secuencial').comp_medidas), PeorCompBin: fmt(gt('memoria', nMax, 'no_existente', 'binaria').comp_medidas),
    TOrdenMax: fmt(sorts[nMax]), AmortMem: fmtEntero(Math.ceil((sorts[nMax] * 1000) / (sm.t_prom_us - bm.t_prom_us))),
    KBMin: fmt((nMin * TAM_REGISTRO) / 1000), MBMax: fmt((nMax * TAM_REGISTRO) / 1e6),
    EntFecha: entorno.fecha, EntNode: esc(entorno.node), EntSO: esc(entorno.so), EntCPU: esc(entorno.cpu),
    EntNucleos: String(entorno.nucleos), EntRAM: String(entorno.ram_gb).replace('.', '{,}'),
  };
  fs.writeFileSync(path.join(DIR_INFORME, 'macros_resultados.tex'), Object.entries(M).map(([k, v]) => `\\newcommand{\\${k}}{${v}}`).join('\n') + '\n');
}

main().catch((e) => { console.error(e); process.exit(1); });