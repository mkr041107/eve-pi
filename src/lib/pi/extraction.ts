/** Port of esi-docs pi-extraction formula (see pi-reference.md). */

const DEFAULT_DECAY = 0.012;
const DEFAULT_NOISE = 0.8;

export function calculateExtractorCycleYield(
  cycleIndex: number,
  cycleTimeSeconds: number,
  qtyPerCycle: number,
  decayFactor = DEFAULT_DECAY,
  noiseFactor = DEFAULT_NOISE,
): number {
  const barWidth = cycleTimeSeconds / 900;
  const t = (cycleIndex + 0.5) * barWidth;
  const decayValue = qtyPerCycle / (1 + t * decayFactor);
  const phaseShift = Math.pow(qtyPerCycle, 0.7);
  const sinA = Math.cos(phaseShift + t * (1 / 12));
  const sinB = Math.cos(phaseShift / 2 + t * 0.2);
  const sinC = Math.cos(t * 0.5);
  const sinStuff = Math.max((sinA + sinB + sinC) / 3, 0);
  const barHeight = decayValue * (1 + noiseFactor * sinStuff);
  return barWidth * barHeight;
}

export function sumExtractorYield(
  totalCycles: number,
  cycleTimeSeconds: number,
  qtyPerCycle: number,
  startCycle = 0,
): number {
  let sum = 0;
  for (let i = startCycle; i < totalCycles; i++) {
    sum += calculateExtractorCycleYield(i, cycleTimeSeconds, qtyPerCycle);
  }
  return sum;
}

export function extractorCyclesRemaining(
  installTime: Date,
  expiryTime: Date,
  cycleTimeSeconds: number,
): { totalCycles: number; completedCycles: number; remainingCycles: number } {
  const durationSec = (expiryTime.getTime() - installTime.getTime()) / 1000;
  const totalCycles = Math.max(0, Math.floor(durationSec / cycleTimeSeconds));
  const elapsedSec = (Date.now() - installTime.getTime()) / 1000;
  const completedCycles = Math.min(
    totalCycles,
    Math.max(0, Math.floor(elapsedSec / cycleTimeSeconds)),
  );
  return {
    totalCycles,
    completedCycles,
    remainingCycles: Math.max(0, totalCycles - completedCycles),
  };
}
