export const appConfig = {
  appName: "mesh-metronome",
  storagePrefix: "mesh-metronome",
  description:
    "Peer-to-peer mesh: 4 phones become a polyrhythm grid, each playing a clock-synced subdivision of the same BPM.",
  accentHex: "#ff5e7a",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
  repositoryUrl: "https://github.com/baditaflorin/mesh-metronome",
  pagesUrl: "https://baditaflorin.github.io/mesh-metronome/",
  signalingUrl:
    (import.meta.env.VITE_WEBRTC_SIGNALING as string | undefined) ?? "wss://turn.0docker.com/ws",
  turnTokenUrl:
    (import.meta.env.VITE_TURN_TOKEN_URL as string | undefined) ??
    "https://turn.0docker.com/credentials",
  paypalUrl: "https://www.paypal.com/paypalme/florinbadita",
} as const;
