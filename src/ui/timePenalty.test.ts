import { afterEach, expect, it, vi } from "vitest";
import { TimePenalty } from "./timePenalty";

function setup() {
  vi.useFakeTimers();
  let now = 0;
  const element = () => {
    const classes = new Set<string>();
    return { offsetWidth: 10, classes, classList: { add: vi.fn((name: string) => classes.add(name)), remove: (name: string) => classes.delete(name) } };
  };
  const badge = element(), game = element();
  vi.stubGlobal("document", { getElementById: (id: string) => id === "time-penalty" ? badge : game });
  vi.stubGlobal("window", { setTimeout, clearTimeout });
  vi.stubGlobal("performance", { now: () => now });
  const effect = new TimePenalty();
  return { effect, badge, game, advance: (ms: number) => { now+=ms;vi.advanceTimersByTime(ms); } };
}
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it("shows a short tint/shake alongside the existing −1, then fully clears",()=>{
  const {effect,badge,game,advance}=setup();effect.show();
  expect(game.classes.has("is-mistake-feedback")).toBe(true);expect(badge.classes.has("is-visible")).toBe(true);
  advance(280);expect(game.classes.size).toBe(0);expect(badge.classes.has("is-visible")).toBe(true);
  advance(220);expect(badge.classes.size).toBe(0);
});
it("rate limits rapid flashes but restarts the numeric penalty every time",()=>{
  const {effect,badge,game,advance}=setup();effect.show();
  for(let i=0;i<6;i++){advance(100);effect.show();}
  expect(game.classList.add).toHaveBeenCalledTimes(1);expect(badge.classList.add).toHaveBeenCalledTimes(7);
  advance(100);effect.show();expect(game.classList.add).toHaveBeenCalledTimes(2);
});
it("clears effects/timers when pausing, leaving or ending a round",()=>{
  const {effect,badge,game,advance}=setup();effect.show();effect.clear();
  expect(game.classes.size).toBe(0);expect(badge.classes.size).toBe(0);
  advance(800);expect(game.classes.size).toBe(0);effect.show();expect(game.classes.size).toBe(1);
});
