// COLA FIFO circular: dos índices (ini, n) sobre un arreglo.
// encolar y desencolar: O(1). Array.shift() es O(n) porque mueve todos los elementos.

//Implementa una cola FIFO para que los pedidos se procesen en orden de llegada.

export class ColaFIFO {
  constructor(capacidad = 16) {
    this.buf = new Array(capacidad);
    this.ini = 0;
    this.n = 0;
  }
  get tamano() { return this.n; }

  encolar(x) {
    if (this.n === this.buf.length) this._crecer();
    this.buf[(this.ini + this.n) % this.buf.length] = x;
    this.n++;
  }

  desencolar() {
    if (this.n === 0) return undefined;
    const x = this.buf[this.ini];
    this.buf[this.ini] = undefined;       // suelta la referencia para el recolector
    this.ini = (this.ini + 1) % this.buf.length;
    this.n--;
    return x;
  }

  _crecer() {
    const nuevo = new Array(this.buf.length * 2);
    for (let i = 0; i < this.n; i++) nuevo[i] = this.buf[(this.ini + i) % this.buf.length];
    this.buf = nuevo;
    this.ini = 0;
  }
}
