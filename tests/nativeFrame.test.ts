import { describe, expect, it } from "vitest";
import { fitNativeFrame, remainingFrameInset } from "../src/ui/nativeFrame";

const zero = { top: 0, right: 0, bottom: 0, left: 0 };
describe("Android whole-screen fitting", () => {
  it("keeps the 390×844 reference unchanged", () => {
    expect(fitNativeFrame(390, 844, zero)).toEqual({ scale: 1, x: 0, y: 0 });
  });
  it("excludes remaining bars and centers without stretching", () => {
    const fit = fitNativeFrame(360,780,{ ...zero,top:24,bottom:48 });
    expect(fit.scale).toBeCloseTo(708/844);
    expect(fit.y).toBeCloseTo(24);
    expect(fit.y+844*fit.scale).toBeCloseTo(732);
    expect(fit.x).toBeGreaterThan(0);
  });
  it("preserves physical geometry across display zoom/density", () => {
    const values = [2,2.4,3,3.6,4].map(density => {
      const f=fitNativeFrame(1080/density,2340/density,{...zero,top:72/density,bottom:144/density});
      return [f.scale*density,f.x*density,f.y*density];
    });
    for (const value of values) value.forEach((v,i)=>expect(v).toBeCloseTo(values[0]![i]!));
  });
  it("handles landscape, asymmetric cutouts and unavailable windows", () => {
    const f=fitNativeFrame(844,390,{top:10,right:50,bottom:20,left:40});
    expect(f.scale).toBeCloseTo(360/844);
    expect(f.x).toBeGreaterThanOrEqual(40);
    expect(f.x+390*f.scale).toBeLessThanOrEqual(794);
    expect(fitNativeFrame(NaN,-1,zero).scale).toBe(0);
  });
  it("accepts measured zero and falls back only when absent", () => {
    expect(remainingFrameInset("0px","24px")).toBe(0);
    expect(remainingFrameInset("12.5px","24px")).toBe(12.5);
    expect(remainingFrameInset("","24px")).toBe(24);
    expect(remainingFrameInset("-3px","24px")).toBe(0);
    expect(remainingFrameInset("","")).toBe(0);
  });
});
