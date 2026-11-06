// PILA (LIFO) sobre Int32Array. Dijkstra solo deja "de dónde vine" en prev[], así que la ruta
// sale DESTINO → ORIGEN. Se apilan los nodos y al sacarlos quedan en orden ORIGEN → DESTINO.
export class Pila {
  constructor(capacidad) { this.a = new Int32Array(capacidad); this.n = 0; }
  push(x) { this.a[this.n++] = x; }
  pop() { return this.a[--this.n]; }
  get vacia() { return this.n === 0; }
}

export function reconstruir(prev, destino, pila) {
  pila.n = 0;                                   // se reutiliza la misma pila (RNF-02)
  for (let v = destino; v !== -1; v = prev[v]) pila.push(v);
  const ruta = new Int32Array(pila.n);
  let i = 0;
  while (!pila.vacia) ruta[i++] = pila.pop();
  return ruta;
}
