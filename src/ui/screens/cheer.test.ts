import { describe, expect, it } from "vitest";
import { failureClip, poolFor, randomClipFor } from "./cheer";

describe("score-based celebration clips", () => {
  it("assigns clips to all six score bands", () => {
    expect(poolFor(0).at(0)?.layout).toBe("compact");
    expect(poolFor(100).at(0)?.layout).toBe("standard");
    expect(poolFor(300).at(0)?.layout).toBe("standard");
    expect(poolFor(600).at(0)?.layout).toBe("large");
    expect(poolFor(1000).at(0)?.layout).toBe("hero");
    expect(poolFor(1500).at(0)?.layout).toBe("hero");
    const lengths = [1, 1, 1, 1, 1];
    for (const [index, score] of [100, 300, 600, 1000, 1500].entries()) {
      const pool = poolFor(score);
      expect(pool).toHaveLength(lengths[index]!);
      expect(new Set(pool.map((clip) => clip.video)).size).toBe(lengths[index]);
      expect(pool.every((clip) => clip.video.endsWith(".webm"))).toBe(true);
      expect(pool.every((clip) => clip.iosVideo?.endsWith(".mp4"))).toBe(true);
      expect(pool.every((clip) => clip.sound?.endsWith(".mp3"))).toBe(true);
    }
  });

  it("can randomly select every clip in the pool", () => {
    const pool = poolFor(1000);
    const picks = pool.map((_, index) => randomClipFor(1000, () => (index + 0.5) / pool.length)?.video);
    expect(new Set(picks)).toEqual(new Set(pool.map((clip) => clip.video)));
  });

  it("uses September 17 remapped uploads and retains Good Try/Great for all formats", () => {
    expect(failureClip().video).toMatch(/movie\/notbad\.webm$/);
    expect(failureClip().iosVideo).toMatch(/movie\/notbad\.mp4$/);
    expect(failureClip().sound).toMatch(/movie\/notbad\.mp3$/);
    expect(poolFor(1000).every((clip) => !clip.video.includes("tipi"))).toBe(true);
    expect(poolFor(0)[0]?.video).toBe(failureClip().video);
    for (const score of [0, 1, 299, 300, 599, 600, 999, 1000, 1399, 1400, 1499, 1500, 9999]) {
      const name = score === 0 ? "notbad" : score < 300 ? "GOOD TRY" : score < 600 ? "tipi" : score < 1000 ? "amazing" : score < 1500 ? "unbelievable" : "ohmygod";
      const folder = score > 0 && score < 600 ? "movie" : "0917-movie";
      const clip = randomClipFor(score)!;
      expect(decodeURI(clip.video)).toMatch(new RegExp(`/${folder}/${name}\\.webm$`));
      expect(decodeURI(clip.iosVideo!)).toMatch(new RegExp(`/${folder}/${name}\\.mp4$`));
      expect(decodeURI(clip.sound!)).toMatch(new RegExp(`/${folder}/${name}\\.mp3$`));
    }
  });
});
