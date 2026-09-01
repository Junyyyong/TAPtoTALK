const MOVIE_1 = {
  video: new URL("../../movie/1.webm", import.meta.url).href,
  iosVideo: new URL("../../movie/1.mp4", import.meta.url).href,
  sound: new URL("../../movie/1.mp3", import.meta.url).href,
} as const;

/**
 * Product copy and replaceable media live here, away from game rules and UI.
 * Keep the public paths stable and a redesign only needs new asset files.
 */
export const APP_CONFIG = {
  name: "TAP to TALK",
  board: { columns: 9, rows: 9 },
  assets: {
    logo: new URL("../../TAPtoTALK-logo-0901.svg", import.meta.url).href,
    splash: new URL("../../taptotalk-cover.png", import.meta.url).href,
    celebrationVideo: MOVIE_1.video,
    celebrationAudio: MOVIE_1.sound,
    celebrations: [
      { at: 1400, layout: "hero", ...MOVIE_1 },
      { at: 1000, layout: "hero", ...MOVIE_1 },
      { at: 600, layout: "large", ...MOVIE_1 },
      { at: 300, layout: "standard", ...MOVIE_1 },
      { at: 0, layout: "compact", ...MOVIE_1 },
    ],
  },
} as const;
