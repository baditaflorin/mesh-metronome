# Privacy threat model — mesh-metronome

## What other peers in the same room can see

- `Date.now()` timestamps (clock sync).
- Yjs awareness `clientID` — per-session random integer.

That's it. Each phone schedules its own clicks locally, and the audio is produced locally; nothing about your click stream is sent on the wire.

## What stays local

- Your pattern choice.
- Your BPM (must match other phones to lock, but it's not shared automatically — you set it yourself).
- All audio synthesis.

## What the signaling server sees

The room name and encrypted SDP offers/answers. No click events, no audio.

## What the TURN server sees

Encrypted DTLS/SRTP bytes if peers can't connect directly. Cannot decrypt.
