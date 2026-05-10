import { createHash } from "node:crypto";

export function generateWaveformFromSource(source: string, bars = 96): number[] {
  const hash = createHash("sha256").update(source).digest();
  const result: number[] = [];

  for (let i = 0; i < bars; i += 1) {
    const byte = hash[i % hash.length] ?? 0;
    const value = Math.max(0.04, Math.min(1, byte / 255));
    result.push(Number(value.toFixed(4)));
  }

  return result;
}
