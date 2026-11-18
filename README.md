# Scrum Planning Poker

A real-time Scrum Planning Poker web application built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, and **Firebase (Cloud Firestore + Firebase Hosting on GCP)**.

## Features
- **Join with Display Name**: Instant onboarding without tedious account creation.
- **Create & Share Rooms**: Generate a 6-character room code or share a direct `?room=CODE` invite link so multiple planning sessions can run simultaneously.
- **Standard Fibonacci Deck**: `0, 1, 2, 3, 5, 8, 13, 21, ?, ☕`.
- **Face-Down Voting**: Selections stay face-down on the table until revealed to prevent anchoring bias.
- **Room Owner Controls**: Only the room creator can click **Reveal Cards** and **New Round / Reset Cards**.
- **Automatic Local Multi-Tab Mode**: Works out of the box across browser tabs via `BroadcastChannel` + `localStorage` before `.env` is configured, and switches to **GCP Cloud Firestore** automatically when `.env` is populated.

## Local Development

```bash
npm install
npm run dev
```

## Deploying to GCP / Firebase Hosting

1. Create a Firebase / GCP project at [Firebase Console](https://console.firebase.google.com/) and enable **Cloud Firestore** and **Firebase Hosting**.
2. Copy `.env.example` to `.env` and fill in your Firebase Web App credentials:
   ```bash
   cp .env.example .env
   ```
3. Link your project and deploy:
   ```bash
   firebase use --add
   npm run build
   firebase deploy --only firestore:rules,hosting
   ```
