# Face2Face

A minimal, fast WebRTC video calling app — host or join a room in seconds. No installs, no accounts.

Face2Face uses an **SFU (Selective Forwarding Unit)** architecture: a Go backend, built on [Pion](https://github.com/pion/webrtc), receives each peer's audio/video tracks and selectively forwards them to everyone else in the room. A React frontend (TanStack Start) handles device setup, signaling, and the UI.

## Table of contents

- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Running locally](#running-locally)
- [How it works](#how-it-works)
- [API reference](#api-reference)
- [Configuration & limitations](#configuration--limitations)
- [Scripts](#scripts)

## Architecture

```
┌────────────┐   WebSocket (signaling)   ┌────────────┐
│ Frontend   │  ←──────────────────────→  │ Backend    │
│ (React)    │                            │ (Go SFU)   │
└─────┬──────┘                            └─────┬──────┘
      │   RTCPeerConnection (DTLS/SRTP)         │
      └──────────── UDP media ──────────────────┘
                    (via ICE/STUN)

Peer A ──sends tracks──▶ SFU ──forwards──▶ Peer B, C, …
```

- The backend opens a `recvonly` audio + video transceiver for each peer and listens on `OnTrack`.
- Each incoming RTP track is republished as a `TrackLocalStaticRTP` and `AddTrack`ed to every other peer's connection.
- When peers join or leave, the server renegotiates (re-offers) with each participant.
- A background ticker requests keyframes via PLI every 3 seconds so new joiners decode cleanly.
- Signaling is plain JSON over a single WebSocket per client; media flows directly over UDP between the browser and the Pion stack.

## Tech stack

**Backend** — Go 1.26, [`go-chi/chi/v5`](https://github.com/go-chi/chi) (HTTP router), [`coder/websocket`](https://github.com/coder/websocket) (WS), [`pion/webrtc/v3`](https://github.com/pion/webrtc) (WebRTC).

**Frontend** — React 19, [TanStack Start](https://tanstack.com/start) (SSR) + [TanStack Router](https://tanstack.com/router) (file-based routing), [Tailwind CSS v4](https://tailwindcss.com/), [Biome](https://biomejs.dev/) (lint/format), [Vite](https://vitejs.dev/), [bun](https://bun.sh/), [lucide-react](https://lucide.dev/) icons.

## Repository layout

```
face2face/
├── backend/                 Go SFU signaling server (port 6969)
│   ├── main.go              HTTP server, routes, shutdown, keyframe ticker
│   ├── coordinator.go       RoomManager + WebSocket handler + PeerConnection setup
│   ├── room.go              Room state, track forwarding, renegotiation, PLI
│   ├── peer.go              Peer wrapper (conn + PeerConnection)
│   ├── signal.go            Signal JSON schema + types
│   ├── test.html            Manual test page served at GET /room
│   └── Makefile             run / build / clean
└── frontend/                React client (port 3000)
    └── src/
        ├── routes/          File-based routes (/, /preview, /host, /rooms/$roomId)
        ├── pages/           Page components (home, preview, host, room, not-found)
        ├── components/      Nav, Footer, Button, Card, VideoTile, DevicePreview,
        │                    CopyButton, ThemeProvider/Toggle
        ├── hooks/           useSfu (WS client), useMedia (getUserMedia)
        ├── sfuclient.ts     WebSocket + RTCPeerConnection client
        └── connection.tsx   UserConnectionProvider context
```

## Prerequisites

- **Go** 1.26+ (see `backend/go.mod`)
- **bun** (recommended) or Node 20+
- A modern browser (Chrome/Firefox/Edge) with camera and microphone access

## Running locally

You need **two terminals** — backend and frontend run independently.

1. **Start the backend** (serves signaling on `:6969`):

   ```bash
   cd backend
   make run        # or: go run .
   ```

   Verify it's up:

   ```bash
   curl localhost:6969/api/v1/health
   # -> Up and Running
   ```

2. **Start the frontend** (dev server on `:3000`):

   ```bash
   cd frontend
   bun install      # first run only
   bun run dev
   ```

3. **Use it** — open <http://localhost:3000>:
   - Click **Create as Host** → grant camera/mic access → a room ID is generated.
   - Copy the room ID, open a second tab (or another browser/device) → **Join as Client** → paste the ID → join.
   - You should see and hear each other. Use the camera/mic buttons to toggle tracks, and **Leave** to disconnect.

> `localhost` is a secure context, so `getUserMedia` works without HTTPS during development.

## How it works

Signaling is JSON over WebSocket. Each message has the shape `{ type, data?, room_id?, peer_id? }`.

| `type`      | Direction        | Payload (`data`)         | Purpose                                  |
| ----------- | ---------------- | ------------------------ | ---------------------------------------- |
| `join`      | client → server  | — (`room_id`, `peer_id`) | Register a peer in a room                |
| `offer`     | server → client  | SDP offer (JSON)         | Begin WebRTC negotiation                 |
| `answer`    | client → server  | SDP answer (JSON)        | Accept the offer                         |
| `candidate` | both ways        | ICE candidate (JSON)     | Trickle ICE connectivity checks          |
| `leave`     | client → server  | — (`room_id`)            | Remove the peer and renegotiate the room |

**Connection flow:**

1. Client opens a WebSocket to `/api/v1/ws` and sends `{type:"join", peer_id, room_id}`.
2. Server gets-or-creates the room, registers the peer, and adds `recvonly` audio + video transceivers.
3. Server creates an SDP offer and sends `{type:"offer", data}`.
4. Client calls `setRemoteDescription`, creates an answer, and sends `{type:"answer", data}`.
5. Both sides exchange `{type:"candidate", data}` (trickle ICE) until a path is found.
6. Media flows: the server reads RTP from each peer's tracks and writes them to `TrackLocalStaticRTP` forwards for the others.
7. On join/leave the server renegotiates with remaining peers; every 3s it requests keyframes (PLI) for stable decoding.

## API reference

| Method | Path             | Description                                      |
| ------ | ---------------- | ------------------------------------------------ |
| `GET`  | `/api/v1/health` | Health check — `200 "Up and Running"`            |
| `GET`  | `/api/v1/ws`     | WebSocket upgrade endpoint (SFU signaling)       |
| `GET`  | `/room`          | Serves `test.html`, a manual test client         |

## Configuration & limitations

This is a lightweight project — a few things to know before you deploy it:

- **WebSocket URL is hardcoded** to `ws://localhost:6969/api/v1/ws` in [`frontend/src/hooks/useSfu.ts`](frontend/src/hooks/useSfu.ts). Update it to point at your backend (and use `wss://` behind TLS) before deploying.
- **STUN only** (`stun:stun.l.google.com:19302`). There is no TURN server, so peers behind symmetric NATs or strict firewalls will fail to connect. Add a TURN server to `RTC_CONFIG` (frontend) and `webrtc.Configuration` (backend) for production.
- **Secure context required** for camera/mic access. `localhost` is exempt; in production you must serve the frontend over **HTTPS** (and signaling over `wss://`).
- **In-memory state** — rooms and peers live only in the backend's memory. A restart drops everything. There is no persistence, database, or authentication.

## Scripts

### Backend (`backend/Makefile`)

| Command       | Action                              |
| ------------- | ----------------------------------- |
| `make run`    | Run the server (`go run .`)         |
| `make build`  | Build the binary into `.build/`     |
| `make clean`  | Remove the `.build/` directory      |

### Frontend (`frontend/package.json`)

| Command            | Action                                  |
| ------------------ | --------------------------------------- |
| `bun run dev`      | Vite dev server on port 3000            |
| `bun run build`    | Production build                        |
| `bun run preview`  | Preview the production build            |
| `bun run test`     | Run Vitest tests                        |
| `bun run lint`     | Biome lint                              |
| `bun run format`   | Biome format                            |
| `bun run check`    | Biome check (lint + format)             |
