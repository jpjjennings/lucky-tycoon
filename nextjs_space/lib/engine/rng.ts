// ============================================
// Seeded PRNG — Mulberry32
// ============================================

export function mulberry32(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function nextRng(state: number): { value: number; nextState: number } {
  const nextState = (state + 1) | 0;
  return { value: mulberry32(nextState), nextState };
}

export function rollDice(rngState: number): { dice: [number, number]; nextState: number } {
  const r1 = nextRng(rngState);
  const r2 = nextRng(r1.nextState);
  const d1 = Math.floor(r1.value * 6) + 1;
  const d2 = Math.floor(r2.value * 6) + 1;
  return { dice: [d1, d2] as [number, number], nextState: r2.nextState };
}

export function randomInt(rngState: number, min: number, max: number): { value: number; nextState: number } {
  const r = nextRng(rngState);
  return { value: Math.floor(r.value * (max - min + 1)) + min, nextState: r.nextState };
}

export function shuffleArray<T>(arr: T[], rngState: number): { result: T[]; nextState: number } {
  const copy = [...(arr ?? [])];
  let state = rngState;
  for (let i = copy.length - 1; i > 0; i--) {
    const r = nextRng(state);
    state = r.nextState;
    const j = Math.floor(r.value * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return { result: copy, nextState: state };
}

export function pickRandom<T>(arr: T[], rngState: number): { value: T; nextState: number } {
  const r = nextRng(rngState);
  const idx = Math.floor(r.value * (arr?.length ?? 1));
  return { value: arr?.[idx] as T, nextState: r.nextState };
}
