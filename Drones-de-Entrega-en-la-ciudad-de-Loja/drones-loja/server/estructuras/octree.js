// OCTREE: el espacio es una caja que se divide en 8 cajas hijas cuando tiene demasiados obstáculos.
// contienePunto(): baja por UNA sola rama (profundidad máx. ≈ 8) y compara pocos obstáculos,
// en vez de recorrer todos los edificios (O(n)).
// Las cajas se guardan agrandadas por `margen` (RNF-05), así la consulta del punto ya es segura.

//Divide el espacio aereo en cubitos para evitar colisiones con obstaculos.

const solapa = (a, b) =>
  a.minx <= b.maxx && a.maxx >= b.minx &&
  a.miny <= b.maxy && a.maxy >= b.miny &&
  a.minz <= b.maxz && a.maxz >= b.minz;

export class Octree {
  constructor(mundo, { profMax = 8, maxItems = 8 } = {}) {
    this.profMax = profMax;
    this.maxItems = maxItems;
    this.raiz = { caja: mundo, prof: 0, items: [], hijos: null };
    this.cantidad = 0;       // obstáculos insertados
    this.comparaciones = 0;  // para medir en el benchmark cuánto trabajo hace la consulta
  }

  // caja = {minx,miny,minz,maxx,maxy,maxz}
  insertar(caja, margen = 0) {
    const c = {
      minx: caja.minx - margen, miny: caja.miny - margen, minz: caja.minz - margen,
      maxx: caja.maxx + margen, maxy: caja.maxy + margen, maxz: caja.maxz + margen,
    };
    this._ins(this.raiz, c);
    this.cantidad++;
  }

  _ins(nodo, c) {
    if (!solapa(nodo.caja, c)) return;
    if (nodo.hijos === null) {
      nodo.items.push(c);
      if (nodo.items.length > this.maxItems && nodo.prof < this.profMax) this._dividir(nodo);
      return;
    }
    for (const h of nodo.hijos) this._ins(h, c);
  }

  _dividir(nodo) {
    const b = nodo.caja;
    const mx = (b.minx + b.maxx) / 2, my = (b.miny + b.maxy) / 2, mz = (b.minz + b.maxz) / 2;
    const hijos = [];
    for (let i = 0; i < 8; i++) {            // bit0 = x, bit1 = y, bit2 = z (1 = mitad superior)
      hijos.push({
        prof: nodo.prof + 1, items: [], hijos: null,
        caja: {
          minx: i & 1 ? mx : b.minx, maxx: i & 1 ? b.maxx : mx,
          miny: i & 2 ? my : b.miny, maxy: i & 2 ? b.maxy : my,
          minz: i & 4 ? mz : b.minz, maxz: i & 4 ? b.maxz : mz,
        },
      });
    }
    const items = nodo.items;
    nodo.items = [];
    nodo.hijos = hijos;
    for (const it of items) for (const h of hijos) this._ins(h, it);
  }

  // ¿el punto está dentro de algún obstáculo (ya con margen)?
  contienePunto(x, y, z) {
    let n = this.raiz;
    const w = n.caja;
    if (x < w.minx || x > w.maxx || y < w.miny || y > w.maxy || z < w.minz || z > w.maxz) return false;
    while (n.hijos !== null) {
      const b = n.caja;
      const i = (x >= (b.minx + b.maxx) / 2 ? 1 : 0) |
                (y >= (b.miny + b.maxy) / 2 ? 2 : 0) |
                (z >= (b.minz + b.maxz) / 2 ? 4 : 0);
      n = n.hijos[i];
    }
    for (const c of n.items) {
      this.comparaciones++;
      if (x >= c.minx && x <= c.maxx && y >= c.miny && y <= c.maxy && z >= c.minz && z <= c.maxz) return true;
    }
    return false;
  }
}
