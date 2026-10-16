# Chat-GPT-light

Chat-GPT-light is a small full-stack conversational AI application. It provides account signup and login, a chat workspace with recent conversations, message persistence, model-generated replies, per-user token accounting, and conversation summarization to keep longer prompts manageable.

This README describes the repository as it currently exists. Some handlers and data fields are still inconsistent; see [Known gaps](#known-gaps-and-cautions) before relying on every feature.

## Features

- React chat interface with signup/login pages, recent-chat navigation, message deletion, account controls, and a usage display.
- Express API with cookie-based JWT authentication, request rate limits, Zod validation, and ownership checks on chat/message reads.
- MongoDB persistence for users, chats, and messages.
- Redis-backed rate limiting, token-window accounting, and token blocklist lookup.
- Google Gemini integration for assistant replies and conversation summaries. An OpenRouter adapter also exists in the codebase but is not currently used by the message controller.
- A prompt builder that combines a system instruction, saved summary, unsummarized history, and the new user message.

## Repository layout

```text
backend/
  config/       MongoDB, Redis, Gemini, and OpenRouter clients
  controllers/  HTTP request handlers for users, chats, and messages
  middlewares/  authentication, user loading, rate/token limits
  model/        Mongoose User, Chat, and Message schemas
  routes/       Express route definitions
  services/     AI provider adapters and conversation summarization
  utils/        Prompt construction and token accounting helpers
  index.js      API startup and middleware registration
frontend/
  src/pages/        Home/chat shell, login, signup, validation schemas
  src/components/   ChatRoom and ChatSidebar
  src/store/        Zustand auth and chat-message state
  src/api.js        Axios client
  vite.config.js    Vite, React, and Tailwind setup
```

## Technology

- Frontend: React 19, Vite, React Router, Zustand, Axios, React Hook Form, Zod, Tailwind CSS 4.
- Backend: Node.js ES modules, Express 5, Mongoose, Redis, JWT, bcrypt, Zod.
- AI: `@google/genai` and `@openrouter/sdk`.

## Requirements

- A Node.js version compatible with the installed Vite 8 and backend dependencies.
- MongoDB and Redis instances.
- A Google Gemini API key. The active message path uses Gemini.
- An OpenRouter key is currently required at backend import time by `backend/config/openRouter.js`, even though the message path uses Gemini. This coupling should be checked if OpenRouter is not configured.

## Configuration

Create `backend/.env` locally. Do not commit secrets. The code references these environment variables:

| Variable | Purpose |
| --- | --- |
| `PORT` | Express listening port |
| `Mongo_url` | MongoDB connection URI (case-sensitive name in code) |
| `redis` | Redis connection URL (case-sensitive name in code) |
| `JWT_key` | JWT signing/verification secret |
| `GEMINI_API_KEY` | Gemini API key |
| `OPENROUTER_API_KEY` | OpenRouter SDK key; module currently throws if missing |
| `Token` | Redis token-window limit and response limit value |
| `TokenTime` | Token-window TTL in seconds |

The frontend Axios client currently targets `http://localhost:3000`; CORS permits `http://localhost:5173` and `http://localhost:5174`. Update both for a different local or deployed origin. Cookie options are currently development-oriented (`secure: false`).

## Install and run

Install dependencies in each application directory:

```bash
cd backend && npm install
cd ../frontend && npm install
```

Start MongoDB and Redis, configure `backend/.env`, then run the API and frontend in separate terminals:

```bash
cd backend && node index.js
```

```bash
cd frontend && npm run dev
```

The frontend dev server normally runs at `http://localhost:5173`; the API defaults to the value of `PORT` and the checked-in frontend client expects port `3000`.

Frontend scripts:

```bash
npm run dev      # Vite development server
npm run build    # Production bundle
npm run preview  # Serve the production bundle locally
npm run lint     # oxlint
```

No backend scripts or automated test suite are currently defined in `backend/package.json`.

## Main API surface

All routes are mounted by `backend/index.js`. Most chat/message routes require the JWT cookie.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/user/signup` | Validate and create an account, then set a token cookie |
| `POST` | `/user/login` | Authenticate credentials and set a token cookie |
| `POST` | `/user/logout` | Clear/revoke the current session (implementation needs review) |
| `GET` | `/user/profile` | Return current account and usage information |
| `DELETE` | `/user/delete` | Delete account and related data (implementation needs review) |
| `POST` | `/message` | Create a chat implicitly and send the first user message |
| `POST` | `/message/:chatId` | Send a message in an existing chat |
| `GET` | `/message/:chatId` | Load messages for a chat owned by the current user |
| `GET` | `/chat/getRecentChat` | List up to 20 recent chats |
| `GET` | `/chat/:chatId` | Get a single chat's metadata |
| `DELETE` | `/chat/:chatId` | Delete a chat and associated messages (implementation needs review) |
| `POST` | `/chat/createChat` | Create an empty chat (not used by the current frontend path) |

Message send body currently expects `{ "content": "...", "model": "..." }`. The frontend hardcodes `gemini-3.5-flash-lite` in `ChatRoom.jsx`.

## Request and data flow

1. The frontend submits signup/login data after client-side Zod validation. The backend validates again, hashes passwords with bcrypt, and issues an HttpOnly JWT cookie.
2. The home page requests `/user/profile` to restore session state. It then loads recent chats; selecting a chat loads its messages into a Zustand store.
3. Sending a message posts its content and model. The backend checks authentication, applies rate/token middleware, loads the user, verifies chat ownership (for existing chats), and builds the prompt.
4. Gemini returns a completed reply. The backend stores user and assistant messages, updates chat/user token totals and Redis usage, and responds with the reply. The frontend reveals the returned text with a short typing effect and updates the sidebar.
5. When enough messages have accumulated, `UpdateSummaryIfNeeded` summarizes a batch of 20 messages and stores a summary on the chat. Future prompts include that summary and messages after the summarized range.

## Data model overview

- **User**: name, optional age, unique email, password hash, aggregate `usage.TotalTokenUsed`.
- **Chat**: owner (`userId`), topic, model, summary and summary position, message count, aggregate token usage, timestamps.
- **Message**: owner, chat ID, role (`user` or `assistant`), content, usage fields, timestamps.

The frontend keeps the authenticated user and chat messages in in-memory Zustand stores. Chat messages are fetched from MongoDB when first opening a chat in the current page session; the store is not persisted across reloads.

## Security and operational notes

- Keep `.env` out of version control and rotate keys if they are exposed.
- Cookies are HttpOnly but currently configured with `secure: false`; production deployment needs HTTPS-compatible cookie settings and an explicit allowed-origin configuration.
- CORS and API base URL are hardcoded for local development.
- Rate limits depend on Redis. Middleware currently calls `next()` if Redis fails, so Redis outages disable these limits rather than failing requests closed.
- Error handlers log server errors but return generic 500 responses. Avoid logging credentials, tokens, or private conversation content.
- This project currently has no documented deployment configuration, backend test command, or migration process.

## Known gaps and cautions

These are observations from the current source, not claims that the features work end-to-end:

- The frontend imports `./pages/Signup`, while the listed file is `SignUp.jsx`; case-sensitive environments may fail to build. Confirm the path/casing before deploying.
- Signup currently responds only with a success message, while the signup page expects `name`, `age`, and `email` in that response and immediately enters the home screen. The home screen will need a working profile restore or the signup response should return the required profile.
- `UserSchema` defines `TotalTokenUsed` but not `TokenLimit` or `TokenUsed`, while other code reads/writes those properties. The usage display and summary accounting need a consistent schema contract.
- `msgSchema` defines usage properties with names such as `promptTokens` and `TotalTokens`, while the send handler stores a provider-normalized object using `prompt_token`, `completion_token`, and `total_tokens`. Check which values Mongoose persists and which the UI reads.
- Logout references `token` without defining it locally and computes expiry from a JWT payload field that standard `jsonwebtoken` tokens do not provide as `expiresIn`. The blocklist key spelling also differs between logout and authentication (`Blocked:` vs `blocklist:`).
- Chat deletion uses `Chat.find` without awaiting and then treats the result as one chat; the resulting ownership check and message cleanup are not reliable as written.
- Account deletion uses `req.userID` while related operations and loaded user data have their own conventions; verify identity and cascade behavior.
- `summaryService.js` increments `chat.usage.completionTokens`, while the schema field is `CompletionToken`. Summarization is invoked without awaiting from the message handler, so failures may not be surfaced to that request.
- Chat/message controller ownership checks are present on reads and message creation. Keep equivalent ownership checks for every mutation.
- `backend/controllers/ chatController.js` has a leading space in its filename/import path. Renaming it requires updating the import exactly, especially on case-sensitive filesystems.

## Further context

See [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) for the detailed architecture, behavioral flow, code conventions, invariants, and guidance for an AI agent continuing this project.
