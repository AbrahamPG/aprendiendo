
export function cosineSimilarity(
  a: number[],
  b: number[],
): number {
  if (a.length !== b.length || a.length === 0) {
    throw new Error("Los vectores deben tener la misma longitud");
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    const valueA = a[i]
    const valueB = b[i]

    if(valueA === undefined || valueB=== undefined){
        throw new Error('No se encontro un valor del vector')
    }

    dotProduct += valueA * valueB;
    magnitudeA += valueA * valueA;
    magnitudeB += valueB * valueB;
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    throw new Error("No se puede comparar un vector de magnitud cero");
  }

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}
