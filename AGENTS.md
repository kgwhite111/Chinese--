# Project Architecture & Guidelines (AGENTS.md)

This document describes the architectural decisions, structure, and guidelines for future AI agents working on this workspace.

## 🏗️ Architectural Decisions

1. **Pure Front-end Application**:
   - The application has been built entirely using static client-side web technologies (`HTML5`, `CSS3`, `Vanilla JS`).
   - It is designed to be hosted serverlessly on Netlify directly from the project root.
   - It doesn't require any Node.js compilation, bundling step (like Vite, Webpack), or package management. This results in instant cold starts, tiny footprint, and absolute zero maintenance overhead.

2. **Security & API Keys Storage**:
   - In accordance with Netlify's frontend security guidelines, **no hardcoded API keys are ever committed to the repository**.
   - Instead, the app uses a **User-Provided BYOK (Bring Your Own Key)** architecture.
   - The API configuration (Base URL, API Key, and Model name) is retrieved and saved securely inside the client's `window.localStorage`.
   - All network connections are made directly from the user's browser to the OpenAI-compatible endpoint specified by the user, avoiding middleman servers.

3. **Modern Pure-CSS/JS Visual Features**:
   - High-fidelity visual components and custom CSS transitions.
   - Custom CSS animation (`@keyframes ripple`) is used for the dual-ring pulsing wave visual when voice input (recording) is active.
   - Responsive design uses CSS Grid (`grid-template-columns: 1fr auto 1fr`) on desktop and automatically switches to vertical stack on mobile.
   - The slide-out drawer utilizes pure CSS transformation (`transform: translateX(100%)` transition) combined with an active class (`.open`) for seamless modern UX.
   - Custom in-app Toast notifications replace standard browser `alert` boxes for a professional, cohesive DeepL-like design.

## 📂 File Directory Map

- `/index.html` - Main HTML layout, contains SVG icons inline to avoid network dependencies or third-party asset loading.
- `/style.css` - Beautiful, cohesive responsive stylesheet defining color tokens, custom transition curves, keyframes for speech recording waves, spinner animations, and right-side drawer sliding.
- `/script.js` - Logic orchestration including LocalStorage BYOK handling, event bindings, OpenAI-compatible Fetch request, SpeechSynthesis TTS handling, Web Audio API / MediaRecorder lifecycle management.
- `/README.md` - Documentation and setup guide for humans.
- `/AGENTS.md` - This architecture map for AI agents.

## 💬 Code Conventions & Extensibility

- **OpenAI chat format API**: The fetch request connects to `${baseURL}/chat/completions` using the standard OpenAI payload:
  ```json
  {
    "model": modelName,
    "messages": [
      { "role": "system", "content": "..." },
      { "role": "user", "content": "..." }
    ]
  }
  ```
- **Voice Recording Lifecycle**:
  - The mic recording leverages `MediaRecorder` API. When toggled, we track standard events `dataavailable` and `stop`.
  - Upon stopping, we stop all individual stream tracks to release the hardware mic.
  - Future developers or AI agents can easily hook up the generated `audioBlob` from `stop` event listener directly to a serverless Netlify function wrapping Whisper (`/v1/audio/transcriptions`) to implement real-time speech-to-text.
- **Speech Synthesis (TTS) Extensibility**:
  - Chinese (`zh`) works directly via browser `speechSynthesis`.
  - Kyrgyz (`ky`) is not natively supported by standard consumer OS speech engines. Code comments inside `script.js` outline how to implement a secure Netlify serverless function using Microsoft Cognitive Services TTS / `edge-tts-ts` to fetch and play professional Azure Kyrgyz voices (`ky-KG-NaziraNeural` / `ky-KG-SamatNeural`) seamlessly.
