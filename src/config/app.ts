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
  video: new URL("../../movie/notbad.webm", import.meta.url).href,
  iosVideo: new URL("../../movie/notbad.mp4", import.meta.url).href,
  sound: new URL("../../movie/notbad.mp3", import.meta.url).href,
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
    video: new URL("../../movie/AMAZING.webm", import.meta.url).href,
    iosVideo: new URL("../../movie/AMAZING.mp4", import.meta.url).href,
    sound: new URL("../../movie/AMAZING.mp3", import.meta.url).href,
  },
  ohMyGod: {
    video: new URL("../../movie/OH MY GOD.webm", import.meta.url).href,
    iosVideo: new URL("../../movie/OH MY GOD.mp4", import.meta.url).href,
    sound: new URL("../../movie/OH MY GOD.mp3", import.meta.url).href,
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
      // Four named uploads; GREAT/practice and UNBELIEVABLE keep existing clips.
      { at: 1400, layout: "hero", clips: [GRADE_MOVIES.ohMyGod] },
      { at: 1000, layout: "hero", clips: [CELEBRATION_MOVIES[2]] },
      { at: 600, layout: "large", clips: [GRADE_MOVIES.amazing] },
      { at: 300, layout: "standard", clips: [GRADE_MOVIES.great] },
      { at: 1, layout: "standard", clips: [GRADE_MOVIES.goodTry] },
      { at: 0, layout: "compact", clips: [FAILURE_MOVIE] },
    ],
  },
} as const;
