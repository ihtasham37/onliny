/**
 * Fisher-Yates Shuffle Algorithm implementation with session stability.
 * Provides high-performance, truly uniform randomization without flickering on re-renders.
 */

export function fisherYatesShuffle<T>(array: T[]): T[] {
  if (!array || array.length <= 1) return [...(array || [])];
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * Deterministic / Seed-based Fisher-Yates Shuffle.
 * Given an array and a stable seed string (e.g. product id or category id),
 * returns the exact same shuffled order every time without recalculating randomly.
 */
export function seededFisherYatesShuffle<T>(array: T[], seedStr: string = 'default'): T[] {
  if (!array || array.length <= 1) return [...(array || [])];
  const result = [...array];
  
  // Hash seed string to integer
  let seed = 0;
  for (let k = 0; k < seedStr.length; k++) {
    seed = (seed << 5) - seed + seedStr.charCodeAt(k);
    seed |= 0;
  }

  // Linear congruential generator (LCG) for deterministic pseudo-random sequence
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return Math.abs(seed) / 233280;
  };

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(pseudoRandom() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}
