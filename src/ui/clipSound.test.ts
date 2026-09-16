import { afterEach, describe, expect, it, vi } from "vitest";
import { ClipSound } from "./clipSound";

function setup() {
  const source = { buffer: null, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null };
  const context = { state: "running", destination: {}, resume: vi.fn(async () => {}), decodeAudioData: vi.fn(async () => ({ duration: 5 })), createBufferSource: vi.fn(() => source) };
  vi.stubGlobal("window", { AudioContext: function () { return context; } });
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) })));
  const sound = new ClipSound(); sound.unlock();
  return { sound, context, source };
}
afterEach(() => vi.unstubAllGlobals());
describe("result video soundtrack", () => {
  it("starts at the video position, caches decoding, and stops", async () => {
    const { sound, source, context } = setup();
    await sound.play("a.mp3", () => .5); expect(source.start).toHaveBeenCalledWith(0, .5);
    sound.stop(); expect(source.stop).toHaveBeenCalled();
    await sound.play("a.mp3", () => 1); expect(context.decodeAudioData).toHaveBeenCalledTimes(1);
  });
  it("does not start a late decode after leaving a result", async () => {
    const { sound, source } = setup();
    const playing = sound.play("a.mp3", () => 0); sound.stop(); await playing;
    expect(source.start).not.toHaveBeenCalled();
  });
  it("reports blocked context for fallback and retries resume on a gesture", async () => {
    const { sound, context } = setup(); context.state = "suspended";
    await expect(sound.play("a.mp3", () => 0)).rejects.toThrow();
    sound.unlock(); expect(context.resume).toHaveBeenCalled();
  });
});
