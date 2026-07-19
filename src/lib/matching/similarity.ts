function bigrams(s: string): string[] {
  const grams: string[] = [];
  for (let i = 0; i < s.length - 1; i++) grams.push(s.slice(i, i + 2));
  return grams;
}

// Sorensen-Dice coefficient: 2 * |shared bigrams| / (|bigrams(a)| + |bigrams(b)|).
// Dependency-free, well suited to short strings like customer names.
export function diceCoefficient(a: string, b: string): number {
  if (a === b) return 1;
  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);
  if (bigramsA.length === 0 || bigramsB.length === 0) return 0;

  const bag = new Map<string, number>();
  for (const g of bigramsA) bag.set(g, (bag.get(g) || 0) + 1);

  let shared = 0;
  for (const g of bigramsB) {
    const count = bag.get(g) || 0;
    if (count > 0) {
      shared++;
      bag.set(g, count - 1);
    }
  }

  return (2 * shared) / (bigramsA.length + bigramsB.length);
}
