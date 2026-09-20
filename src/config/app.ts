const FAILURE_MOVIE = {
  video: new URL("../../0917-movie/notbad.webm", import.meta.url).href,
  iosVideo: new URL("../../0917-movie/notbad.mp4", import.meta.url).href,
  sound: new URL("../../0917-movie/notbad.mp3", import.meta.url).href,
  layout: "compact",
} as const;

const GRADE_MOVIES = {
  goodTry: {
    video: new URL("../../movie/GOOD TRY.webm", import.meta.url).href,
    iosVideo: new URL("../../movie/GOOD TRY.mp4", import.meta.url).href,
    sound: new URL("../../movie/GOOD TRY.mp3", import.meta.url).href,
  },
  great: {
    video: new URL("../../movie/tipi.webm", import.meta.url).href,
    iosVideo: new URL("../../movie/tipi.mp4", import.meta.url).href,
    sound: new URL("../../movie/tipi.mp3", import.meta.url).href,
  },
  amazing: {
    video: new URL("../../0917-movie/amazing.webm", import.meta.url).href,
    iosVideo: new URL("../../0917-movie/amazing.mp4", import.meta.url).href,
    sound: new URL("../../0917-movie/amazing.mp3", import.meta.url).href,
  },
  unbelievable: {
    video: new URL("../../0917-movie/unbelievable.webm", import.meta.url).href,
    iosVideo: new URL("../../0917-movie/unbelievable.mp4", import.meta.url).href,
    sound: new URL("../../0917-movie/unbelievable.mp3", import.meta.url).href,
  },
  ohMyGod: {
    video: new URL("../../0917-movie/ohmygod.webm", import.meta.url).href,
    iosVideo: new URL("../../0917-movie/ohmygod.mp4", import.meta.url).href,
    sound: new URL("../../0917-movie/ohmygod.mp3", import.meta.url).href,
  },
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
    game: new URL("../../public/assets/audio/talk-game-acoustic-142.mp3", import.meta.url).href,
  },
  assets: {
    studioSplash: new URL("../../public/assets/brand/tapeetepee-open-talk.png", import.meta.url).href,
    logo: new URL("../../public/assets/brand/taptotalk-logo-0911.png", import.meta.url).href,
    splash: new URL("../../public/assets/brand/taptotalk-cover-0911-v2.png", import.meta.url).href,
    celebrationVideo: FAILURE_MOVIE.video,
    celebrationAudio: FAILURE_MOVIE.sound,
    failureCelebration: FAILURE_MOVIE,
    celebrations: [
      // September 17 uploads; GOOD TRY and GREAT/practice retain their clips.
      { at: 1400, layout: "hero", clips: [GRADE_MOVIES.ohMyGod] },
      { at: 1000, layout: "hero", clips: [GRADE_MOVIES.unbelievable] },
      { at: 600, layout: "large", clips: [GRADE_MOVIES.amazing] },
      { at: 300, layout: "standard", clips: [GRADE_MOVIES.great] },
      { at: 1, layout: "standard", clips: [GRADE_MOVIES.goodTry] },
      { at: 0, layout: "compact", clips: [FAILURE_MOVIE] },
    ],
  },
} as const;
