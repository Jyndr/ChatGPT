# Chat-GPT-light — Codebase Field Guide and Reuse Manual

This file is meant to help a person or coding agent understand this codebase deeply enough to work in it, learn from it, or reuse its patterns in a different project. It is a map and teaching guide, not a substitute for reading the source files. Source code is authoritative when this document and implementation disagree.

## 1. What this project is

Chat-GPT-light is a browser-based AI chat app built as two applications:

- A **React frontend** that renders signup/login forms and a chat workspace.
- An **Express API** that authenticates users, stores chats/messages in MongoDB, calls an AI provider, and uses Redis for request/token limits.

The central design idea is a normal client/server request cycle: the UI sends a request, the API validates and authenticates it, application logic coordinates database/provider calls, and a JSON response updates the UI. The assistant response is generated completely on the server, then the frontend animates the already-complete text to look like typing; it is not currently streamed token-by-token.

## 2. Repository map: where to look first

```text
backend/
  index.js                         Express app setup and startup
  package.json                     Backend dependencies (no scripts currently)
  config/
    database.js                    Mongoose connection
    redis.js                       Redis client/connection
    gemini.js                       Google GenAI client
    openRouter.js                   OpenRouter SDK client
  routes/
    userRouter.js                   User/auth endpoint map + middleware order
    chatRouter.js                   Chat endpoint map + middleware order
    msgRouter.js                    Message endpoint map + middleware order
  controllers/
    userController.js               Signup/login/profile/logout/account deletion
    msgController.js                 Read/send message orchestration
    ' chatController.js'             Chat listing/metadata/create/delete
  model/
    UserSchema.js                   Account persistence shape
    ChatSchema.js                   Conversation metadata, summary, usage
    msgSchema.js                    Individual turn persistence shape
  middlewares/
    authUserMiddleware.js            JWT cookie verification
    LoadUserMiddleware.js            Load Mongo user into req.user
    unauthenticatedRateLimiter.js    IP request limit for auth endpoints
    authenticatedRateLimiter.js      Per-user request limit
    TokenUsageMiddleware.js          Redis token window guard
  services/
    geminiRouterService.js            Active Gemini generation adapter
    openRouterservice.js              Alternate adapter (currently unused)
    summaryService.js                 Summarize older turns
  utils/
    chatContext.js                    Build provider context from history/summary
    ChatToken.js                      Add usage totals to a chat
    userUsage.js                      Add usage totals to a user
  validators/
    userValidator.js                  Server signup/login Zod schemas

frontend/
  package.json                       Frontend scripts and dependencies
  vite.config.js                     Vite + React + Tailwind plugins
  index.html                         Browser document and app mount node
  src/
    main.jsx                         React bootstrap + BrowserRouter
    App.jsx                          Route-to-page mapping
    api.js                           Shared Axios client and cookie setting
    index.css                        Tailwind import
    pages/
      Home.jsx                       Authenticated shell and profile restore
      Login.jsx                      Login form and submit flow
      SignUp.jsx                     Signup form and submit flow
      Schemas/AuthSchema.js           Client-side form validation
    components/
      ChatRoom.jsx                   Active conversation UI and send flow
      ChatSidebar.jsx                Recent chats, navigation, account actions
    store/
      useAuthStore.js                 In-memory current user
      useChatStore.js                 In-memory messages indexed by chat ID
```

The chat controller filename starts with a literal space. This is unusual and can make shell commands/imports confusing. The router import currently includes that space; treat a rename as a coordinated source/import change.

## 3. Runtime architecture

```text
Browser (React)
  ├─ React Router selects Home, Login, or Signup
  ├─ Zustand holds current user + fetched message arrays in memory
  └─ Axios sends credentialed HTTP requests
        │ JSON + HttpOnly cookie
        ▼
Express API (backend/index.js)
  ├─ CORS, JSON parsing, cookie parsing
  ├─ /user, /chat, /message routers
  ├─ auth/rate/token middleware
  ├─ controllers coordinate work
  ├─ Mongoose reads/writes MongoDB
  ├─ services call Gemini (or alternate OpenRouter adapter)
  └─ Redis stores limits and intended temporary session/token state
```

### Backend boot sequence

`backend/index.js` creates Express, enables CORS for an explicit list of Vercel origins with credentials, parses JSON and cookies, mounts three routers, and then `startServer()` connects MongoDB and Redis before calling `app.listen(process.env.PORT)`. Startup depends on valid environment configuration and both data services being reachable. The allowed origin list changes as deployment URLs change; check the current file rather than relying on an old URL list in memory.

### Frontend boot sequence

`frontend/index.html` provides the `root` element. `src/main.jsx` creates a React root, imports global CSS, wraps `<App />` in `<BrowserRouter>`, and renders under `StrictMode`. `App.jsx` maps the URL to the screen. Router imports currently come from `react-router`.

## 4. Frontend anatomy and practical patterns

### Route and page responsibilities

- `/signup` renders `SignUp.jsx`.
- `/login` renders `Login.jsx`.
- `/` renders `Home.jsx` with no selected `chatId` (new-chat state).
- `/chat/:chatId` renders the same `Home.jsx`, with the active conversation selected by URL.

Keeping the selected chat in the URL means reloads and copied links can reopen a chat, provided the server session remains valid. The actual messages are still fetched from the API; the URL does not contain conversation data.

### Shared API client

`src/api.js` centralizes API transport:

```js
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});
```

Practical pattern: put the base URL, credential behavior, and (if needed) shared response/error handling in one API module. Components then call `api.get(...)`, `api.post(...)`, or `api.delete(...)` with relative paths. `withCredentials: true` is required for the browser to send the HttpOnly session cookie cross-origin. For a deployable app, use an environment-based base URL and configure matching backend CORS/cookie settings.

### Form pattern

`Login.jsx` and `SignUp.jsx` demonstrate this sequence:

1. Define field rules in `pages/Schemas/AuthSchema.js` with Zod.
2. Connect rules to React Hook Form through `zodResolver`.
3. Render field-level errors from `formState.errors`.
4. Submit validated form data to the matching API endpoint.
5. Show server errors separately from client validation errors.
6. On success, update the auth store and navigate to the home page.

The backend has parallel schemas in `backend/validators/userValidator.js`. This duplication is intentional: client validation improves feedback, while server validation protects the API. Keep both in sync when changing rules. Current schemas differ in special-character password requirements (frontend requires one; backend does not), so validation parity is a known issue.

### Auth state pattern

`useAuthStore` is a minimal Zustand store:

```js
{ user: null, setUser: (user) => set({ user }) }
```

It is memory-only. The cookie is the durable session credential; the store is just UI state. `Home.jsx` calls `/user/profile` on mount to restore state after a reload. When switching accounts or logging out, clear user-specific chat state too.

### Chat message state pattern

`useChatStore` stores:

```js
messagesByChatId: {
  [chatId]: [message, ...]
}
```

`undefined` for a chat key means the messages have not been fetched into this client session; an empty array means fetched and currently empty. This distinction prevents repeated fetches. Actions set an array, remove one chat's cached entry, or clear all cached chats.

### Home shell and coordination

`Home.jsx` does not own the conversation messages. It coordinates session restore, user/logout state, usage display, the sidebar, and `ChatRoom`. A counter (`refreshChats`) changes after mutations; `ChatSidebar` watches that counter and reloads its list. `chatBusy` is passed into child components so navigation/deletion can be disabled while sending or deleting. This is a lightweight parent-child coordination pattern; for larger apps, a query/cache library or domain store may be easier to maintain.

### ChatRoom send lifecycle

The practical flow in `ChatRoom.jsx` is:

1. Prevent the browser's default form submit.
2. Trim the draft and return early for empty content or conflicting operations.
3. Set sending/busy state, clear prior errors, retain a pending-question display, and clear the textarea.
4. POST `{ content, model }` to `/message` for a new chat or `/message/:chatId` for an existing chat.
5. Validate that a `chatId` and string `reply` came back.
6. Update usage from response fields.
7. Reveal the complete reply in timed character chunks with `revealReply`.
8. Add temporary user/assistant messages to Zustand and refresh recent chats.
9. If this was the first message, navigate to `/chat/:newId`.
10. On failure, clear pending UI, restore the draft, and show an error; on 401 clear the user.
11. Always release busy/sending state in `finally`.

This is a useful async UI pattern: show an optimistic/pending question, keep a recoverable draft, differentiate authentication errors, and use `finally` for lock cleanup. Note that the chat page's `messages` value comes from the current chat key; when creating a new chat, it is initially `undefined`, so verify how cached prior turns are merged if modifying this flow.

### ChatSidebar behavior

It fetches recent chats from `/chat/getRecentChat`, displays loading/empty/error states, links each row to `/chat/:id`, and calls `/chat/:id` DELETE after confirmation. It owns local chat metadata state, while message arrays live in the chat store. It also renders profile/account actions (inspect the rest of this file before editing those UI details). Delete/logout/account deletion controls use local busy flags and confirmation dialogs; the server must still enforce all authorization.

### Chat rendering and deletion

Messages render based on `role`; user turns align right and assistant turns use the full conversation width. `ChatRoom` currently calls `DELETE /message/:chatId/:messageId` for message deletion, but `msgRouter.js` defines no DELETE endpoint. The UI request therefore has no matching route in the current backend. Resolve the contract on both sides before relying on message deletion.

## 5. Backend anatomy and reusable Express patterns

### Routes as middleware pipelines

Routes do more than map a URL: they define the sequence of checks before a controller. Current ordering:

```text
User signup/login:
  unauthenticatedRateLimiter → controller

User profile/logout/delete:
  authUserMiddleware → authenticatedRateLimiter → LoadUser → controller

Chat endpoints:
  router-level authUserMiddleware → authenticatedRateLimiter → LoadUser
  → endpoint controller

Message GET:
  router auth → authenticatedRateLimiter → LoadUser → getMessage

Message POST:
  router auth → authenticatedRateLimiter → TokenUsage → LoadUser → sendMessage
```

In Express, middleware calls `next()` to pass control or returns a response to stop the pipeline. Route order matters. `authUserMiddleware` must run before authenticated rate limiting because that limiter reads `req.userID`. Middleware that needs the actual Mongo record runs after `LoadUser`.

### Request context conventions

After auth middleware, handlers may use:

- `req.userID`: Mongo ID from the verified JWT payload.
- `req.token`: raw token from the cookie.
- `req.payload`: decoded JWT claims.
- `req.key`: Redis usage key, set by token middleware for message POST.
- `req.user`: loaded Mongoose user document, set by `LoadUser`.

These properties do not all exist on every route. When adding a controller, inspect its route middleware chain first. Prefer one consistent identity source and do not read `req.user` unless `LoadUser` runs earlier.

### Controller pattern

A controller generally follows:

1. Read route params/body and request context.
2. Validate required input and resource ownership.
3. Read/write models and invoke service/helper functions.
4. Return a status code and JSON contract.
5. Catch operational errors and return a generic server error.

Example shape (illustrative, not copied from one exact handler):

```js
export async function handler(req, res) {
  try {
    const { id } = req.params;
    const record = await Model.findOne({ _id: id, userId: req.userID });
    if (!record) return res.status(404).json({ message: "Not found" });
    return res.status(200).json({ record });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
```

The important reusable part is scoping the database query by both identifier and owner. A front-end route or ID is never proof of ownership.

### Database model patterns

Mongoose schemas provide required fields, defaults, enums, references, timestamps, and indexes. Timestamps supply `createdAt`/`updatedAt`; recent chat listing sorts by `updatedAt`. The chat model indexes `{ userId: 1, updatedAt: -1 }`, and message model indexes support chat chronology and user chronology.

When adding a field, ask:

1. Is it required, optional, or derived?
2. What default should old/new records receive?
3. Who writes it, and who reads it?
4. Does it need an index?
5. Is this a persisted field rename that needs migration/backward compatibility?

Mongoose strictness and nested schema behavior mean a value with the wrong key may not persist as expected. Exact casing in these models matters.

## 6. Detailed end-to-end request flows

### Signup

Frontend: `SignUp.jsx` → client Zod parse via React Hook Form → `api.post('/user/signup', data)`.

Backend: `userRouter.js` → unauthenticated IP limiter → `SignUp` → server `signupSchema.safeParse` → duplicate email check → bcrypt hash → `User.create` → JWT signed with `JWT_key` → `res.cookie('token', ...)` → 201 JSON.

Current integration concern: backend returns only `{ message }`; frontend destructures `{ name, age, email }`, stores those values, and navigates. The values are therefore undefined until a profile fetch/reconciliation occurs. Also frontend/backend password rules differ.

### Login and profile restore

Login follows client validation → `/user/login` → server validation → user lookup → bcrypt comparison → JWT cookie and response. Frontend stores returned identity and navigates home. On reload, `Home.jsx` asks `/user/profile`; the browser attaches the cookie via Axios credentials; auth middleware verifies it; `LoadUser` fetches the user; the controller returns profile fields. Home then reads usage fields and renders the application.

Current concern: `Home.jsx` invokes `/user/profile` once to restore the user and then makes another profile request to populate usage when no user was present. Also profile usage expects a limit field that the current User schema does not define.

### Send message, first turn

```text
ChatRoom form
  → POST /message { content, model }
  → auth → per-user request limit → Redis token window → LoadUser
  → sendMessage: validate → create owned Chat
  → fetch history (empty) → build system + current user prompt
  → Gemini service → save user Message + assistant Message
  → increment chat.messageCount by 2 and usage totals
  → increment user totals + Redis window
  → return chatId/reply/usage/window totals
  → frontend animate response → cache pair → navigate to chat URL
```

Both persisted turns count toward `messageCount`, which is why the summary threshold is expressed as 20 messages (10 user/assistant exchanges if every exchange has exactly two records). The first `Chat.Topic` is initialized from the first 20 characters of the user's input. The subsequent `if (chat.Topic == 'New Chat')` branch is unlikely to run for a just-created chat because it was initialized from content.

### Send message, existing chat

The controller first finds the chat using `{ userId: req.user._id, _id: chatId }`. It fetches prior message records sorted by `createdAt`, skips the amount marked summarized, and builds context with any summary. It calls the provider, stores the new user and assistant records, increments counts and usage, updates Redis, and returns the answer. The frontend then appends temporary records to the current in-memory array.

Current concern: message history query uses `.skip(chat.summarizedTillmessageNumber)`, but if deleting turns changes the record sequence, the numeric boundary can point at the wrong place. The UI can delete individual turns but backend has no matching route at present.

### Read existing chat

URL `/chat/:chatId` gives `Home` the ID. `ChatRoom` checks whether the store already has an entry; if not, it calls `GET /message/:chatId`. The backend finds the chat scoped to `req.user._id`; only then does it query messages by `chatId` and sort ascending. On success the UI caches the records. On 401 the UI clears user state; other failures show a chat-load error.

### Delete chat

Sidebar confirms, sends `DELETE /chat/:id`, removes that key from the Zustand message cache, filters the local recent-chat list, tells Home to refresh, and navigates to `/` if the deleted chat was active.

The controller intends to find an owned chat, delete messages, then delete the chat. Current source uses `Chat.find(...)` without `await`/single-record lookup and then accesses `chat._id`; this is a broken/incomplete path and should be fixed before depending on cascade behavior.

### Summary generation

After returning the message response, the controller calls `UpdateSummaryIfNeeded(chat._id)` without awaiting it. The summary service loads the chat, compares message count to summarized count, and if at least 20 records are pending, selects the next 20, includes the old summary, calls Gemini, stores the new summary/boundary/timestamp, and adds summary-call usage to chat and user. This background-ish call is not queued or protected against concurrent sends; errors may become unhandled and updates may race.

## 7. Exact file reference guide

### Frontend

- `frontend/src/main.jsx`: root mount, global stylesheet, router wrapper.
- `frontend/src/App.jsx`: routes only; keep page-level route table here.
- `frontend/src/api.js`: Axios base URL and credential transport. API configuration belongs here, not scattered across components.
- `frontend/src/pages/Home.jsx`: session restore and authenticated layout; redirects unauthenticated users to `/signup` currently.
- `frontend/src/pages/Login.jsx`: login form; clears chat cache before setting the user.
- `frontend/src/pages/SignUp.jsx`: signup form; currently assumes signup returns profile fields.
- `frontend/src/pages/Schemas/AuthSchema.js`: frontend-only field validation. Age input is converted to number; optional blank age becomes undefined.
- `frontend/src/components/ChatRoom.jsx`: fetch/send/delete message UI, pending states, local reply reveal.
- `frontend/src/components/ChatSidebar.jsx`: recent chats, chat delete, profile/logout/delete-account UI.
- `frontend/src/store/useAuthStore.js`: one in-memory user value.
- `frontend/src/store/useChatStore.js`: message arrays keyed by chat ID and clear/remove actions.
- `frontend/src/index.css`: Tailwind import; most UI styles are utility classes in components.
- `frontend/vite.config.js`: React and Tailwind Vite plugins.

### Backend

- `backend/index.js`: app setup. Add global middleware here only if it applies to all routes.
- `backend/routes/userRouter.js`: auth endpoints and user middleware chains.
- `backend/routes/chatRouter.js`: all chat endpoints; router-level middleware applies to every route.
- `backend/routes/msgRouter.js`: message endpoint mapping; add a DELETE handler here if implementing the UI's message deletion.
- `backend/controllers/userController.js`: password/session/account handlers. JWT and cookie options live here currently.
- `backend/controllers/msgController.js`: message read/send orchestration and usage updates.
- `backend/controllers/ chatController.js`: chat list/read/create/delete logic; filename has a leading space.
- `backend/model/UserSchema.js`: user fields and aggregate lifetime-like token usage.
- `backend/model/ChatSchema.js`: conversation metadata, summary position, and usage totals.
- `backend/model/msgSchema.js`: turn content and per-message usage fields.
- `backend/services/geminiRouterService.js`: converts role/content messages into a text prompt, calls Google GenAI, normalizes returned usage.
- `backend/services/openRouterservice.js`: alternate provider adapter, not active in `msgController.js`.
- `backend/services/summaryService.js`: rolling summary threshold and persistence.
- `backend/utils/chatContext.js`: fixed system prompt and conversation history composition.
- `backend/utils/ChatToken.js`, `backend/utils/userUsage.js`: aggregate counter helpers.
- `backend/middlewares/authUserMiddleware.js`: JWT verification and intended blocklist check.
- `backend/middlewares/LoadUserMiddleware.js`: `req.user` lookup.
- `backend/middlewares/authenticatedRateLimiter.js`: 20 requests per user per 60 seconds.
- `backend/middlewares/unauthenticatedRateLimiter.js`: 10 auth requests per IP per 60 seconds.
- `backend/middlewares/TokenUsageMiddleware.js`: compares Redis window usage with `process.env.Token`; currently calls `next()` if Redis errors.
- `backend/config/database.js`, `redis.js`, `gemini.js`, `openRouter.js`: external client configuration.
- `backend/validators/userValidator.js`: backend signup/login validation schemas.

## 8. Environment and local operation

The backend source references these environment variables (names are case-sensitive):

| Variable | Used for |
| --- | --- |
| `PORT` | API listen port |
| `Mongo_url` | MongoDB URI |
| `redis` | Redis connection URL |
| `JWT_key` | JWT secret |
| `GEMINI_API_KEY` | Active generation provider credential |
| `OPENROUTER_API_KEY` | OpenRouter module throws during import if missing |
| `Token` | Redis window token maximum and response limit |
| `TokenTime` | Redis usage key expiration in seconds |

Frontend uses `http://localhost:3000` as API base URL. Backend CORS permits `http://localhost:5173` and `http://localhost:5174`. Signup/login cookie is HttpOnly, currently `secure: false`, max age five hours. These values are development-specific.

Install/run:

```bash
cd backend && npm install
# create backend/.env and run MongoDB + Redis
node index.js
```

In another terminal:

```bash
cd frontend && npm install
npm run dev
```

Frontend scripts: `dev`, `build`, `preview`, `lint`. Backend currently defines no npm scripts. There is no automated test suite evident in the repository listing.

## 9. Data model and API contracts

### User document

`UserSchema`: `name` (required), `age` (optional number), `email` (required unique), `password` (required hash), `usage.TotalTokenUsed` (default 0), timestamps.

### Chat document

`ChatSchema`: `userId`, `Topic` (default `New Chat`), `model`, `summary`, `summaryUpdatedAt`, `summarizedTillmessageNumber`, `messageCount`, nested `usage.PromptToken`, `usage.CompletionToken`, `usage.TotalTokens`, timestamps. Index `{ userId: 1, updatedAt: -1 }`.

### Message document

`msgSchema`: `userId`, `chatId`, `role` enum (`user`, `assistant`), `content`, `tokens`, nested usage keys `promptTokens`, `completionToken`, `TotalTokens`, timestamps. Indexes `{ chatId: 1, createdAt: 1 }` and `{ userId: 1, createdAt: -1 }`.

### API table

| Verb and path | Auth? | Current purpose / request |
| --- | --- | --- |
| `POST /user/signup` | No; IP limiter | `{ name, age?, email, password }`; create account + cookie |
| `POST /user/login` | No; IP limiter | `{ email, password }`; login + cookie |
| `GET /user/profile` | Yes | Current profile and usage |
| `POST /user/logout` | Yes | Revoke/clear session (currently broken) |
| `DELETE /user/delete` | Yes | Delete account and child data (needs review) |
| `GET /chat/getRecentChat` | Yes | Up to 20 recent chat records |
| `GET /chat/:chatId` | Yes | One chat's metadata |
| `POST /chat/createChat` | Yes | `{ model }`; empty chat (not used by frontend) |
| `DELETE /chat/:chatId` | Yes | Delete chat and messages (currently broken) |
| `GET /message/:chatId` | Yes | Ordered message records |
| `POST /message` | Yes + token window | `{ content, model }`; starts chat and sends first turn |
| `POST /message/:chatId` | Yes + token window | `{ content, model }`; adds a turn |
| `DELETE /message/:chatId/:messageId` | Frontend expects auth | Frontend calls it, but backend has no route currently |

Actual response property names are inconsistent in capitalization. For message send, frontend reads `chatId`, `reply`, `usage`, `TokensUsed`, and `Token_limit`. Profile UI reads `usage.TotalTokenUsed` and a `usage.TokenLimit` fallback. Treat these as current observations, not a recommended permanent contract.

## 10. Current inconsistencies / debug checklist

Before extending these features, inspect and likely repair:

1. **Signup module path:** prior production commits corrected the path to the `SignUp.jsx` file. The current import uses a longer relative path than necessary; it resolves from the source file's directory, so simplify only if carefully verified on Linux and locally.
2. **Signup response mismatch:** backend does not return identity fields expected by `SignUp.jsx`.
3. **Password rule mismatch:** frontend requires a special character; backend validator does not.
4. **Logout:** controller references undefined `token`, expects a nonstandard `payload.expiresIn`, and blocklist key prefixes do not match auth middleware (`Blocked:` vs `blocklist:`).
5. **Chat delete:** controller's `Chat.find` returns a query/result collection pattern, but code treats it like one awaited chat; child cleanup is unreliable.
6. **Message delete:** frontend calls a route missing from `msgRouter.js`.
7. **Account delete:** controller has aliases and ID fields that should be standardized; check `req.userID` and loaded user ownership.
8. **Usage fields:** model/user/controller/summary/frontend differ on `TokenUsed`, `TokenLimit`, `CompletionToken`, `completionTokens`, `TotalTokens`, and snake_case provider counters.
9. **Message usage persistence:** the send controller writes `usage` shaped by provider adapter but `msgSchema` declares differently named nested properties.
10. **Summary usage casing:** summary code increments `chat.usage.completionTokens`; schema declares `CompletionToken`.
11. **Summary asynchronous failures/races:** function is not awaited/queued and may race another send; errors may not be surfaced.
12. **History boundary:** summary uses numeric `.skip()` while message deletion can change the relationship between count and ordering.
13. **OpenRouter env coupling:** `openRouter.js` throws at import when key missing; find whether it is imported indirectly during backend startup, even though current message controller uses Gemini.
14. **Token window behavior:** Redis middleware allows the request if Redis errors; decide whether limits should fail open or closed.
15. **Auth redirect:** unauthenticated home currently navigates to signup, regardless of whether an existing user might prefer login.
16. **Deployment configuration maintenance:** `api.js` currently depends on `VITE_API_URL`, and backend CORS uses explicit Vercel origins. Confirm both stay current when deployment URLs change; Vite env changes require a new frontend build.
17. **Backend parse check:** the missing final brace in `userController.js` was repaired in commit `6c355d4`. Keep syntax validation in the deployment workflow so a future edit does not reintroduce the startup failure.

## 11. Reusable patterns for future projects

These are the general lessons this codebase can teach, independent of chat/AI:

### A. Build a vertical slice

For a feature, trace one thin path from UI to persistence and back:

```text
Form/component → API client → route → middleware → controller
→ service/model → JSON response → frontend state/render
```

This catches missing endpoints and mismatched field names earlier than editing a single layer in isolation.

### B. Separate transport from business logic

Routes describe URLs and checks. Controllers translate HTTP inputs into actions and HTTP outputs. Services encapsulate external systems (AI, email, payments). Models describe stored data. Utilities handle reusable pure transformations. Avoid putting an SDK call directly inside a React component or a database query inside a route declaration.

### C. Treat contracts as shared interfaces

An endpoint contract includes method, URL, auth requirements, request fields, success response, error statuses, and side effects. If one field changes, update backend schema/controller and every frontend consumer together. A short table in docs or a typed schema can prevent drift.

### D. Separate persistent state, session state, and UI state

- Persistent state: Mongo records.
- Session credential: HttpOnly JWT cookie.
- Client cache: Zustand values for current rendering session.
- Transient UI state: loading/error/draft/pending flags in React component state.

Knowing which layer owns a value tells you where it should be restored, invalidated, or updated.

### E. Design ownership into queries

Instead of loading by ID and checking later, scope the lookup directly: `{ _id: resourceId, userId: currentUserId }`. Apply that to updates/deletes too. This makes the authorization condition part of the database operation.

### F. Normalize external provider output

Provider SDKs return provider-specific shapes. Convert them once in a service into a stable internal result such as `{ text, usage: { promptTokens, completionTokens, totalTokens } }`. Controllers and schemas should use the internal contract, not SDK-specific property names.

### G. Design asynchronous states deliberately

For every network operation, define what the UI shows while waiting, on success, on unauthorized response, on rate limit, and on general failure. Keep user input recoverable after a failed mutation. Use `try/catch/finally` so busy indicators cannot become stuck.

### H. Keep summaries/checkpoints tied to records

Any feature that says “processed through item N” must stay aligned if items can be inserted/deleted/reordered. A persisted sequence number or last-processed record ID is often safer than array offsets.

### I. Prefer explicit environment configuration

Keep external URLs, ports, secrets, limits, and cookie policy in environment config. Validate required configuration at startup and document exact names and examples without actual secret values.

## 12. Step-by-step recipe: add a feature to this project

Use this process for something like adding a chat title edit, a new profile field, or a provider selector:

1. **State the contract.** Who can do it? What input arrives? What should response look like? What errors are possible?
2. **Inspect adjacent patterns.** Read the existing component, `api.js`, corresponding router/controller, schema, and any stores.
3. **Trace middleware context.** Confirm whether the controller receives `req.userID`, `req.user`, and any other fields it needs.
4. **Update persistence deliberately.** Add/adjust model fields with defaults and determine whether old records need compatibility handling.
5. **Implement server behavior.** Validate inputs, scope records to owner, perform the operation, return a stable JSON response.
6. **Implement client behavior.** Add API call, loading/success/error handling, and update/invalidate relevant store data.
7. **Handle lifecycle edge cases.** Reload, unauthorized session, duplicate submit, active chat changes, deletion, and stale cached state.
8. **Verify what is available.** If asked, run build/lint or targeted checks. Do not claim integration success without the required services and credentials.
9. **Update documentation.** Change README for setup/API changes and this context file for architecture/pattern changes.

## 13. A practical AI-agent prompt for this repository

Copy and adapt this when asking an AI agent to work here:

> You are working in the Chat-GPT-light repository. First read `README.md` and `PROJECT_CONTEXT.md`, then inspect the relevant source files; the docs explain the architecture but source code is authoritative. This is a React/Vite frontend plus an Express/Mongoose/Redis backend for a cookie-authenticated AI chat app. Before coding, trace the requested feature end-to-end: component → API client → route/middleware → controller → service/model → response → frontend state. Check the actual request/response names and middleware-provided `req` fields. Validate all untrusted input on the backend and scope every chat/message query or mutation to the authenticated owner. Preserve the project's separation between routes, controllers, services, models, utilities, and UI. Keep schemas, controllers, frontend consumers, and docs consistent. The codebase has known incomplete/broken areas listed in the context document, so do not assume a feature works just because the UI exists. Make a focused coherent change, explain files/contracts changed and any migration or environment implications, and only claim verification you actually ran.

## 14. How to use this guide to learn syntax and flow

When learning a syntax or feature, use this order:

1. **Start in the UI.** Find the event handler (for example `handleSend` in `ChatRoom.jsx`). Identify its inputs and state updates.
2. **Follow the API call.** Note method, path, body, and response fields. The API base URL/credentials are in `api.js`.
3. **Find the route.** Check which middleware executes and in what order.
4. **Read the controller.** Track each variable from request through database/service operations to the response.
5. **Inspect the schema.** Confirm actual persisted names and defaults.
6. **Inspect helper/service.** Understand any transformation, provider call, or side effect.
7. **Return to the UI.** See how response/errors change rendering and stores.

For a new project, reuse the flow and boundaries that fit your needs, not every dependency or current implementation detail. Start with one working vertical slice and establish stable contracts before adding caching, rate limits, summaries, or multiple providers.

## 15. Scope and confidence

This guide was derived from the source files present in this repository. It does not claim that MongoDB, Redis, Gemini, account deletion, logout, chat deletion, or deployment have been exercised at runtime. No API keys or local `.env` contents are included. When the code changes, update this guide so future work starts from the current state rather than stale assumptions.

## 16. Deployment debugging lessons from this project's Git history

This section records the actual deployment path visible in Git history, especially the sequence around commits `90972b7`, `00e9a82`, `6ce7601`, `1ee8d6a`, and `6c355d4`. It is useful as a checklist for future projects. The incidents were separate layers of the deployment stack; fixing one did not automatically fix the others.

### What happened in this deployment

1. **The frontend API URL was changed from local development to a Vite environment variable.** Commit `90972b7` changed `api.js` to use `import.meta.env.VITE_API_URL` with a localhost fallback; commit `1ee8d6a` removed that fallback. The Vercel project must define `VITE_API_URL` for the correct environment and be redeployed after changing it. Vite environment variables are compiled into the frontend bundle at build time; changing a Render variable will not update the Vercel bundle.
2. **The backend CORS policy moved from localhost origins to an explicit Vercel origin list.** Commit `00e9a82` introduced exact hosted origins; a subsequent commit added another preview hostname. CORS compares the browser's `Origin` with the allowlist. Scheme, hostname, and port must match exactly. A new Vercel preview URL can therefore fail CORS even when the production domain works. Prefer a stable production domain for normal use; add a preview origin deliberately when testing a preview.
3. **The cookie needed cross-site settings.** Commit `6ce7601` changed the auth cookie to `secure: true`, `sameSite: "none"`, and `path: "/"`, and made logout clear it with matching attributes. This is separate from CORS. CORS lets browser JavaScript read a credentialed response; cookie attributes and Axios `withCredentials` determine whether the browser stores/sends the cookie. A login response can be 200 while a later profile request is 401 if the cookie was not stored/sent.
4. **The running browser used Brave.** Browser privacy controls can block third-party cookies. Render and Vercel are different sites, so even correct server CORS/cookie headers may still be affected by browser policy. Inspect `Set-Cookie` on login and `Cookie` on the next request; check the browser's blocked-cookie reason before changing backend auth logic.
5. **Linux import paths needed exact spelling.** Commits `22e69bb` and `4c102ea` adjusted the signup import after a production path/casing issue. Render runs Linux, where file path casing must match exactly. The source file is `SignUp.jsx`; references such as `Signup.jsx` or `signup.jsx` are not equivalent. Relative paths should be calculated from the importing file's directory; don't add `../src` without confirming the actual resolved path.
6. **Redis environment variable casing had to match.** Commit `eb64b24` changed the code from `process.env.redis` to `process.env.Redis`. Environment variable names are case-sensitive. The Render dashboard name and the source reference must be identical. This specific code currently expects `Redis`.
7. **The backend later crashed at module parse time.** Render's log checked out commit `1ee8d6a` and showed `SyntaxError: Unexpected end of input` at the end of `backend/controllers/userController.js`. The cookie-settings edit in `6ce7601` had removed the final closing brace from `deleteAccount`; commit `6c355d4` restored it. The Render build command was only `npm install`, which can succeed without parsing application modules. The failure surfaced only when `node index.js` loaded the controller. A syntax check caught it locally after the missing brace was identified.

### What to avoid repeating

- **Don't diagnose every browser error as “CORS.”** A missing CORS header, a 401, a 404, a blocked cookie, and a Render process crash have different causes. Read the earliest failing request and Render startup log; fix the layer that produced it.
- **Don't deploy a frontend without confirming its built API base URL.** In Vercel project settings, set `VITE_API_URL` to the backend origin (for example, `https://<render-service>.onrender.com`, without `/user` or another route suffix). Rebuild/redeploy after changing it. Inspect the browser Network request URL to confirm.
- **Don't assume changing environment settings changes an already-built Vite bundle.** Frontend `VITE_*` values are baked in at build time; backend environment values are read by the running Node process. Redeploy the corresponding service after changing the corresponding setting.
- **Don't mix up CORS and session cookies.** For cross-origin cookie auth, all of these need to agree: frontend Axios `withCredentials: true`; backend CORS `credentials: true`; exact allowed origin (not `*`); cookie `Secure`, `SameSite=None`, and path/domain settings that apply to the deployment. The browser must also permit the cookie.
- **Don't use a short-lived preview domain as the only allowed frontend origin.** Preview hostnames can change. Keep the stable production frontend URL in the backend allowlist. Only allow additional preview hosts that are actually needed, and avoid a permissive wildcard when credentialed access is involved.
- **Don't assume an endpoint 404 is caused by CORS or cookies.** A 404 means a server answered but the requested route was not found there. Confirm the request went to the intended Render service, that `/user/login` is the exact path and method, that the deployed commit mounts `userRouter` at `/user`, and that Render is running the expected service/root directory. This repository's route is `POST /user/login`.
- **Don't rely on `npm install` as a backend build check.** It installs dependencies but does not guarantee every imported module parses or that startup configuration is valid. Before deployment, run `node --check` on changed backend files and start the server with suitable environment variables when practical. For a more robust project, add a deliberate backend check/build script and configure Render to run it.
- **Don't make broad last-minute edits while debugging production.** Change one layer at a time, commit the fix with a specific message, and check the resulting deployment before moving on. This preserves a clear link between symptom and fix.
- **Don't make multiple casing or path edits by guesswork.** Check the actual filename and resolve the relative import from the importing file. A developer machine may hide casing errors if its filesystem is case-insensitive; Linux deployment will not.
- **Don't change env variable capitalization casually.** Search every `process.env.*` reference and make the Render key match exactly. Keep a short env-variable table in the README and update it when code names change.
- **Don't change cookie set options without matching cookie clear options.** Browser cookie identity includes attributes such as path and domain. Logout should clear the same cookie scope used at login.
- **Don't treat a commit as proof the deployed service runs.** The deployment log showed code was fetched and dependencies installed, but the process still failed on startup. Verify the runtime startup and a real endpoint after deploy.

### A reusable deployment checklist

Before deploying a split frontend/backend app, verify each layer independently:

1. **Source and paths:** confirm import paths, filename casing, and changed files; run syntax/build checks.
2. **Backend startup:** confirm the Render root directory, install/build/start commands, and required environment variable names. Read logs through the `listening` message, not just “build successful.”
3. **Backend routes:** confirm the deployed service mounts the expected router and method/path (here, `POST /user/login`, `GET /user/profile`).
4. **Frontend bundle:** confirm `VITE_API_URL` is set to the backend origin in the correct Vercel environment and inspect the built site's Network request URL.
5. **CORS:** compare the browser's exact `Origin` header with backend allowlist entries; keep `credentials: true` on the server and `withCredentials: true` on Axios.
6. **Cookie:** after login, inspect `Set-Cookie`, then inspect whether the next API request sends `Cookie`. If absent, look at cookie flags, domain/path, HTTPS, and browser privacy blocking.
7. **Status interpretation:** CORS failure means the browser rejected cross-origin access; 401 means the request reached auth without a usable session; 404 means the requested route was not found on the server reached; startup syntax/configuration errors mean the API process never became available.
8. **Verify after each correction:** redeploy the service whose source/config changed, then repeat the same Network/log inspection. Avoid changing the frontend, CORS, cookies, and auth code all at once.

### Debugging sequence to reuse in a future project

When a deployed login flow loops back to signup/login:

```text
1. Check Render logs: is the backend process actually running?
2. Check the login request URL/method/status: is it reaching the intended service and route?
3. If login is successful, inspect Set-Cookie and browser cookie-block reason.
4. Inspect the next profile request: correct Origin? Cookie sent? What exact status/body?
5. If the browser reports CORS, compare exact origin and credential settings.
6. If 401, debug session issuance/transport/verification; don't change route wiring first.
7. If 404, debug base URL, deployed version, route path/method, and service root.
```

This sequence narrows the fault by evidence and avoids changing unrelated application code while diagnosing a hosting/configuration problem.

### The whole incident in very plain language

Think of the deployment as a chain of separate doors. The browser has to know the backend address, the backend has to allow the browser's website, the browser has to carry the login cookie, and the backend process has to start. If any one door is closed, the user may see a login loop, but the fix depends on which door failed.

In this incident, several things happened close together, so the browser symptoms looked like one giant problem:

| What you saw | What it means in everyday language | What the history/logs tell us |
| --- | --- | --- |
| CORS says there is no `Access-Control-Allow-Origin` | The browser asked the backend, “Is this exact website allowed to read this response?” and did not see permission for the active Vercel URL. | The backend used an exact origin list. Vercel preview URLs changed, so the new URL had to be added or the stable production URL used. |
| Login says 200, then profile/recent chats say 401 | Login endpoint answered successfully, but the next request arrived without a session the backend could verify. | Cross-site cookie delivery was the relevant layer. Cookie settings were changed to `Secure` + `SameSite=None`, and Axios already needed `withCredentials`. Browser privacy settings can still block cookies. |
| `/user/login` sometimes says 404 | The server that received that request did not find that route at that exact URL/method. | The source route is `POST /user/login`. The history does not prove the precise 404 cause; likely checks are wrong/stale API base URL, wrong deployed service/version, or a method/path mismatch. A cookie fix would not turn a 404 into a route. |
| Render says `npm install` succeeded | Dependencies downloaded; it does not mean the app code was parsed or the server started. | Render's later runtime command, `node index.js`, parsed the backend imports and found a syntax error. |
| Render says `SyntaxError: Unexpected end of input` at the end of `userController.js` | JavaScript reached the end of the file while still waiting for a closing `}`. | `deleteAccount` had a `try`, `catch`, and exported arrow function, so it needed two closing braces at the end: one for `catch`, one for the function. The function-closing brace was missing. |

#### What was the actual coding mistake behind the Render crash?

The file's final structure should have been:

```js
export const deleteAccount = async (req, res) => { // opens the function
  try {
    // work
  } catch (error) { // closes try, opens catch
    // error response
  } // closes catch block
}; // closes the function (a final `}` is required; semicolon is optional)
```

The committed file ended after the brace that closed `catch`, but did not have the brace that closed the exported `deleteAccount` function. That is why Node reported the error at the end of the file rather than pointing at a broken line inside the function: the parser kept waiting for the missing close until there was no more file to read. The repair added that final `}`. No feature logic needed to change to fix this particular Render crash.

This was an easy-to-miss editing mistake during the cookie change. The cookie change itself was intended to make cross-site login work; while editing near the bottom of the same file, the function's closing brace was accidentally removed. So there were two independent things in one controller history: a cookie configuration fix near the top and an accidental syntax regression at the bottom. The cookie fix addressed browser session transport; the brace fix addressed whether Node could load the server at all.

#### What part was “your mistake,” and what part was just a deployment condition?

It is more useful to call these **things to check next time** than personal mistakes. The work involved several independent concepts:

- Adding one more Vercel hostname was a configuration update because the browser was using a preview hostname absent from the exact allowlist.
- Setting cross-site cookie attributes was needed because the frontend and API use different sites. Correct CORS alone does not carry a login session.
- Matching `Redis` capitalization was required because environment variable names are exact strings.
- Matching `SignUp.jsx` spelling was required because Render's Linux filesystem distinguishes uppercase and lowercase letters.
- Keeping the final brace was ordinary syntax correctness. The edit unintentionally removed it, and the install step didn't catch it.
- A 404 still needed its own URL/deployment diagnosis; the history does not establish that it was caused by CORS or by the cookie.

The main process lesson is: when several symptoms show up at once, don't try to solve “deployment” as one issue. Write each symptom down, identify the layer it belongs to, and verify that layer before editing another. The browser console can show CORS and HTTP statuses together, while Render can separately show that the API is not even running. Start with the Render startup log because a stopped backend cannot serve any route reliably.

#### Why the first fixes felt like they did not work

Each fix moved the chain forward but did not automatically complete all the other parts:

1. **Adding an origin** lets the browser read responses from that one exact Vercel hostname. It does not make the browser store a cookie, fix a wrong API URL, or fix server syntax.
2. **Setting cookie attributes** makes a cross-site cookie eligible to be sent. It does not allow an unlisted CORS origin, and some browser privacy settings can still block it.
3. **Changing `VITE_API_URL`** points the frontend at a server. It does not prove the server has started or that the path/method is correct. Because Vite bakes this value during build, a new Vercel deployment is required after changing it.
4. **Fixing imports/env names** lets a Linux server resolve files and services correctly. It does not check every other module for syntax errors.
5. **A successful `npm install`** means dependencies installed. It is not a production-ready signal. The process must start, connect to required services, and answer a real endpoint.

That is why it could seem like you had “fixed CORS” but still got 401, or had a “successful build” but Render still crashed. Those messages were about different steps of the chain.

#### A simple request trace to use next time

For login, follow the data in order:

```text
Vercel page
  1. Which URL does the browser call?             (VITE_API_URL + /user/login)
  2. Does the browser send the exact site origin?  (Origin request header)
        ↓
Render API
  3. Is the Node process running?                  (Render startup logs)
  4. Does POST /user/login exist?                  (userRouter + mounted /user)
  5. Does login return success and Set-Cookie?     (Network response headers)
        ↓
Browser stores cookie, then calls profile
  6. Did browser accept the cookie?                (Application/Storage cookie view)
  7. Does GET /user/profile include Cookie?        (Network request headers)
  8. Does backend verify it?                       (JWT/auth middleware)
```

Only edit the failing step. For example, if step 5 returns 200 and step 7 has no cookie, look at cookie settings/browser policy; do not rewrite the profile route. If step 3 fails, fix startup first; CORS debugging can wait because there is no healthy server to answer requests.

### Beginner glossary for deployment and code review

- **Origin:** the website address that opened the request, including protocol and hostname (and port locally). `https://example.vercel.app` and `https://another.vercel.app` are different origins.
- **CORS:** a browser rule that asks the server whether JavaScript running at one origin may read a response from another origin. CORS is enforced by browsers; it is not user login/authentication.
- **Cookie:** a small value stored by the browser and automatically sent to a matching server. This project stores a JWT in an HttpOnly cookie so frontend JavaScript cannot read the token directly.
- **`withCredentials`:** Axios option telling the browser to include credentials such as cookies on cross-origin requests.
- **`SameSite=None`:** permits a cookie to be sent in cross-site contexts; browsers require `Secure` with it, which means HTTPS transport.
- **401 Unauthorized:** the server received the request but did not accept the supplied authentication (often no cookie, expired/invalid JWT, or rejected token).
- **404 Not Found:** the server reached by the request did not match the requested route. Check URL, HTTP method, service, and deployed version.
- **Build step:** a platform command that prepares an app. `npm install` downloads packages; it does not necessarily compile or parse your app source.
- **Start/runtime step:** the command that actually launches the app, here `node index.js`. Import/syntax/runtime errors can happen here even after installation succeeds.
- **Environment variable:** a named setting supplied outside source code, such as `VITE_API_URL` or `JWT_key`. Names are exact and often case-sensitive.
- **Preview deployment:** a temporary or branch-specific Vercel URL. Its hostname can differ from the stable production hostname, so exact CORS lists may need separate entries.

### Practical debugging worksheet

When something breaks in another project, fill this in before changing code:

```text
Symptom (copy exact text):
First failing request (method + full URL):
Browser origin:
HTTP status or browser-level error:
Response body/headers:
Did the backend process start successfully?
Which layer does this point to: URL / route / CORS / cookie / auth / database / provider?
One small change to test:
How will I know that change worked?
```

This makes debugging less overwhelming. It turns “the app is broken” into one testable question at a time.
