import { describe, expect, it } from "vitest";
import { fitNativeFrame, remainingFrameInset } from "../src/ui/nativeFrame";

const zero = { top: 0, right: 0, bottom: 0, left: 0 };
describe("Android responsive density normalization", () => {
  it("keeps the 390×844 reference unchanged", () => {
    expect(fitNativeFrame(390, 844, zero)).toEqual({ scale: 1, x: 0, y: 0, width: 390, height: 844, insets: zero });
  });
  it("excludes remaining bars once and fills the available aspect ratio", () => {
    const fit = fitNativeFrame(360,780,{ ...zero,top:24,bottom:48 });
    expect(fit.scale).toBeCloseTo(360/390);
    expect(fit.y).toBeCloseTo(24);
    expect(fit.y+fit.height*fit.scale).toBeCloseTo(732);
    expect(fit.x).toBe(0);
    expect(fit.width*fit.scale).toBeCloseTo(360);
  });
  it("preserves physical geometry across display zoom/density", () => {
    const values = [2,2.4,3,3.6,4].map(density => {
      const f=fitNativeFrame(1080/density,2340/density,{...zero,top:72/density,bottom:144/density});
      return [f.scale*density,f.x*density,f.y*density,f.width,f.height,f.insets.top,f.insets.bottom];
    });
    for (const value of values) value.forEach((v,i)=>expect(v).toBeCloseTo(values[0]![i]!));
  });
  it("handles landscape, asymmetric cutouts and unavailable windows", () => {
    const f=fitNativeFrame(844,390,{top:10,right:50,bottom:20,left:40});
    expect(f.scale).toBeCloseTo(360/640);
    expect(f.x).toBeGreaterThanOrEqual(40);
    expect(f.x+f.width*f.scale).toBeCloseTo(794);
    expect(f.height).toBe(640);
    expect(fitNativeFrame(NaN,-1,zero).scale).toBe(0);
  });
  it("adapts to tablet proportions instead of shrinking a portrait rectangle", () => {
    const tablet=fitNativeFrame(800,1280,zero);
    expect(tablet.width).toBe(400);
    expect(tablet.height).toBe(640);
    expect(tablet.x).toBe(0);
    expect(tablet.y).toBe(0);
    const wide=fitNativeFrame(1280,800,zero);
    expect(wide.width).toBe(1024);
    expect(wide.height).toBe(640);
  });
  it("accepts measured zero and falls back only when absent", () => {
    expect(remainingFrameInset("0px","24px")).toBe(0);
    expect(remainingFrameInset("12.5px","24px")).toBe(12.5);
    expect(remainingFrameInset("","24px")).toBe(24);
    expect(remainingFrameInset("-3px","24px")).toBe(0);
    expect(remainingFrameInset("","")).toBe(0);
  });
});
