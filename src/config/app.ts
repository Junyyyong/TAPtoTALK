const CELEBRATION_MOVIES = [
  {
    video: new URL("../../movie/1.webm", import.meta.url).href,
    iosVideo: new URL("../../movie/1.mp4", import.meta.url).href,
    sound: new URL("../../movie/1.mp3", import.meta.url).href,
  },
  {
    video: new URL("../../movie/4.webm", import.meta.url).href,
    iosVideo: new URL("../../movie/4.mp4", import.meta.url).href,
    sound: new URL("../../movie/4.mp3", import.meta.url).href,
  },
  {
    video: new URL("../../movie/taepi.webm", import.meta.url).href,
    iosVideo: new URL("../../movie/taepi.mp4", import.meta.url).href,
    sound: new URL("../../movie/taepi.mp3", import.meta.url).href,
  },
  {
    video: new URL("../../movie/hupi.webm", import.meta.url).href,
    iosVideo: new URL("../../movie/hupi.mp4", import.meta.url).href,
    sound: new URL("../../movie/hupi.mp3", import.meta.url).href,
  },
  {
    video: new URL("../../movie/haepi.webm", import.meta.url).href,
    iosVideo: new URL("../../movie/haepi.mp4", import.meta.url).href,
    sound: new URL("../../movie/haepi.mp3", import.meta.url).href,
  },
  {
    video: new URL("../../movie/jaepi.webm", import.meta.url).href,
    iosVideo: new URL("../../movie/jaepi.mp4", import.meta.url).href,
    sound: new URL("../../movie/jaepi.mp3", import.meta.url).href,
  },
] as const;

const FAILURE_MOVIE = {
  video: new URL("../../movie/tipi.webm", import.meta.url).href,
  iosVideo: new URL("../../movie/tipi.mp4", import.meta.url).href,
  sound: new URL("../../movie/tipi.mp3", import.meta.url).href,
  layout: "compact",
} as const;

/**
 * Product copy and replaceable media live here, away from game rules and UI.
 * Keep the public paths stable and a redesign only needs new asset files.
 */
export const APP_CONFIG = {
  name: "TAP to TALK",
  board: { columns: 9, rows: 9 },
  timing: { studioSplashMs: 3_000, productSplashMs: 4_000 },
  music: {
    menu: new URL("../../public/assets/audio/talk-lobby.mp3", import.meta.url).href,
    game: new URL("../../public/assets/audio/talk-game.mp3", import.meta.url).href,
  },
  assets: {
    studioSplash: new URL("../../public/assets/brand/tapeetepee-open-talk.png", import.meta.url).href,
    logo: new URL("../../public/assets/brand/taptotalk-logo-0911.png", import.meta.url).href,
    splash: new URL("../../public/assets/brand/taptotalk-cover-0911-v2.png", import.meta.url).href,
    celebrationVideo: FAILURE_MOVIE.video,
    celebrationAudio: FAILURE_MOVIE.sound,
    failureCelebration: FAILURE_MOVIE,
    celebrations: [
      // Taepi for AMAZING and above; Tipi for all lower grades and practice.
      // Keep clip arrays so additional videos can be added later per grade.
      { at: 1400, layout: "hero", clips: [CELEBRATION_MOVIES[2]] },
      { at: 1000, layout: "hero", clips: [CELEBRATION_MOVIES[2]] },
      { at: 600, layout: "large", clips: [CELEBRATION_MOVIES[2]] },
      { at: 300, layout: "standard", clips: [FAILURE_MOVIE] },
      { at: 1, layout: "standard", clips: [FAILURE_MOVIE] },
      { at: 0, layout: "compact", clips: [FAILURE_MOVIE] },
    ],
  },
} as const;
