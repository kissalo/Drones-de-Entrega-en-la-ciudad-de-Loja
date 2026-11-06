// COLA DE PRIORIDAD (min-heap binario) sobre Typed Arrays.
// push y pop: O(log n). Dijkstra/A* la usan en cada paso (antes: sort() + shift() = O(n log n)).
// vaciar() solo pone n = 0: el mismo heap se reutiliza en cada replanificación (RNF-02).
export class MinHeap {
  constructor(capacidad = 1024) {
    this.claves = new Float64Array(capacidad);
    this.valores = new Int32Array(capacidad);
    this.n = 0;
    this.claveTope = 0; // clave del último elemento sacado
  }
  get tamano() { return this.n; }
  vaciar() { this.n = 0; }

  _crecer() {
    const cap = this.claves.length * 2;
    const k = new Float64Array(cap); k.set(this.claves);
    const v = new Int32Array(cap); v.set(this.valores);
    this.claves = k; this.valores = v;
  }

  push(clave, valor) {
    if (this.n === this.claves.length) this._crecer();
    const k = this.claves, v = this.valores;
    let i = this.n++;
    while (i > 0) {                       // sube mientras el padre sea mayor
      const p = (i - 1) >> 1;
      if (k[p] <= clave) break;
      k[i] = k[p]; v[i] = v[p]; i = p;
    }
    k[i] = clave; v[i] = valor;
  }

  pop() {
    const k = this.claves, v = this.valores;
    const tope = v[0];
    this.claveTope = k[0];
    const n = --this.n;
    if (n > 0) {                          // el último baja desde la raíz
      const ck = k[n], cv = v[n];
      let i = 0;
      for (;;) {
        let h = 2 * i + 1;
        if (h >= n) break;
        if (h + 1 < n && k[h + 1] < k[h]) h++;
        if (k[h] >= ck) break;
        k[i] = k[h]; v[i] = v[h]; i = h;
      }
      k[i] = ck; v[i] = cv;
    }
    return tope;
  }
}
