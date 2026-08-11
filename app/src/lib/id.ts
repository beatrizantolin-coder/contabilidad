export function genId(): string {
  return crypto.randomUUID();
}

let seqCounter = 0;

/** Entero creciente para desempatar orden cronológico entre movimientos con la misma fecha. */
export function genSeq(): number {
  seqCounter += 1;
  return Date.now() * 1000 + (seqCounter % 1000);
}
