/** TAPtoPICK montage timing: 6s open, 360ms close, 120ms swap, 360ms open. */
export function windowMotion(elapsedMs: number) {
  const position = elapsedMs % 6840;
  const cycle = Math.floor(elapsedMs / 6840);
  if (position < 6000) return { phase: "ready", cycle, closure: 0 } as const;
  if (position < 6360) return { phase: "closing", cycle, closure: (position - 6000) / 360 } as const;
  if (position < 6480) return { phase: "closed", cycle, closure: 1 } as const;
  return { phase: "opening", cycle, closure: (6840 - position) / 360 } as const;
}
