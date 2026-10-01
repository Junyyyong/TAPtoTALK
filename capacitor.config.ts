import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "io.github.junyyyong.taptotalk",
  appName: "TAP to TALK",
  webDir: "dist",
  // White letterboxing around the uniformly fitted Android game canvas.
  backgroundColor: "#ffffff",
  android: {
    backgroundColor: "#ffffff",
  },
};

export default config;
