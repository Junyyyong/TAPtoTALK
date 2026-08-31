/**
 * Product copy and replaceable media live here, away from game rules and UI.
 * Keep the public paths stable and a redesign only needs new asset files.
 */
export const APP_CONFIG = {
  name: "TAP to TALK",
  board: { columns: 9, rows: 9 },
  assets: {
    logo: new URL("../../TAPtoTALK-logo.svg", import.meta.url).href,
    splash: "./assets/brand/splash.webp",
    celebrationVideo: "./assets/brand/celebration.webm",
    celebrationAudio: "./assets/brand/celebration.mp3",
  },
} as const;
