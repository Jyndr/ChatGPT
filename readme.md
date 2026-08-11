# ChatGPT Backend API

This is a backend API for a ChatGPT-style chat app. It handles user signup/login, protected chat routes, message history, AI replies, conversation summaries, and token usage tracking.

The project supports two AI providers:

- Gemini through `@google/genai`
- OpenRouter through `@openrouter/sdk`

The current active provider is Gemini.

## What This Project Does

This backend lets a user:

- Create an account
- Log in using email and password
- Store authentication in an HTTP-only cookie
- Create chat sessions
- Send messages inside a chat
- Get AI responses from Gemini
- Save both user and assistant messages in MongoDB
- Track token usage per user and per chat
- Summarize older messages when a chat becomes long
- Delete chats or delete the whole account

## Tech Stack

- `Node.js`: JavaScript runtime
- `Express.js`: API routing and middleware
- `MongoDB`: database
- `Mongoose`: MongoDB schema/model layer
- `JWT`: user authentication
- `bcrypt`: password hashing
- `cookie-parser`: reading auth cookies
- `Zod`: request validation
- `@google/genai`: Gemini SDK
- `@openrouter/sdk`: OpenRouter SDK
- `dotenv`: environment variables

## Folder And File Explanation

```text
index.js
```

Main server file. It creates the Express app, enables JSON parsing and cookies, connects route files, connects MongoDB, and starts the server.

```text
config/database.js
```

Connects the backend to MongoDB using `process.env.Mongo_url`.

```text
config/gemini.js
```

Creates the Gemini SDK client using `process.env.GEMINI_API_KEY`.

```text
config/openRouter.js
```

Creates the OpenRouter SDK client using `process.env.OPENROUTER_API_KEY`.

```text
routes/userRouter.js
```

Defines all `/user` routes: signup, login, logout, profile, and delete account.

```text
routes/chatRouter.js
```

Defines all `/chat` routes: create chat, get recent chats, get one chat, and delete chat.

```text
routes/msgRouter.js
```

Defines all `/message` routes: get messages and send a message.

```text
controllers/userController.js
```

Contains the actual logic for signup, login, logout, profile, and account deletion.

```text
controllers/ chatController.js
```

Contains chat logic. The filename currently has a space before `chatController.js`, so imports must match that exact filename.

```text
controllers/msgController.js
```

Main message flow. It validates message input, checks token limits, loads chat history, builds AI context, calls the AI service, saves user and assistant messages, updates token usage, and starts summary generation.

```text
model/UserSchema.js
```

MongoDB schema for users. Stores name, age, email, hashed password, and usage data.

```text
model/ChatSchema.js
```

MongoDB schema for chats. Stores user ID, topic, selected model, summary, message count, summarized message number, and chat token usage.

```text
model/msgSchema.js
```

MongoDB schema for messages. Stores user ID, chat ID, role, content, and token usage.

```text
middlewares/authUserMiddleware.js
```

Protects routes. It reads the JWT from the cookie, verifies it, finds the user, and attaches the user to `req.user`.

```text
validators/userValidator.js
```

Uses Zod to validate signup and login input.

```text
services/geminiRouterService.js
```

Calls Gemini and returns a normalized object:

```js
{
  ai_reply,
  usage: {
    prompt_token,
    completion_token,
    total_tokens
  }
}
```

```text
services/openRouterservice.js
```

Calls OpenRouter and returns the same kind of normalized AI response object.

```text
services/summaryService.js
```

Summarizes older messages after enough unsummarized messages exist in a chat.

```text
utils/chatContext.js
```

Builds the message context that will be sent to the AI. It adds the system prompt, previous summary, old messages, and current user message.

```text
utils/userUsage.js
```

Handles user token reset, token limit checking, and updating user token usage.

```text
utils/ChatToken.js
```

Updates token usage on the chat document.

## Environment Variables

Create a `.env` file in the project root.

```env
PORT=3000
Mongo_url=your_mongodb_connection_string
JWT_key=your_jwt_secret
Token=50000
TokenTime=18000000
GEMINI_API_KEY=your_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

Explanation:

- `PORT`: backend port
- `Mongo_url`: MongoDB connection string
- `JWT_key`: secret key used to sign JWT tokens
- `Token`: token limit for a user
- `TokenTime`: time in milliseconds before usage reset
- `GEMINI_API_KEY`: key for Gemini API
- `OPENROUTER_API_KEY`: key for OpenRouter API

Keep `.env` private. Do not push it to GitHub.

## Installation

```bash
npm install
```

## Run The Server

Normal run:

```bash
node index.js
```

Development run with auto restart:

```bash
npx nodemon index.js
```

Server URL:

```text
http://localhost:3000
```

## Request Flow

### Signup Flow

1. Client sends `POST /user/signup`.
2. `userRouter.js` sends request to `SignUp`.
3. `SignUp` validates body using `signupSchema`.
4. Backend checks if email already exists.
5. Password is hashed with `bcrypt`.
6. User is saved in MongoDB.
7. JWT token is created.
8. Token is stored in an HTTP-only cookie.
9. Response is sent back.

### Login Flow

1. Client sends `POST /user/login`.
2. `loginSchema` validates email and password.
3. Backend finds user by email.
4. `bcrypt.compare` checks password.
5. JWT token is created.
6. Token is saved in cookie.
7. User info is returned.

### Protected Route Flow

1. Request goes to a protected route.
2. `authUserMiddleware` reads `token` from cookies.
3. JWT is verified with `JWT_key`.
4. User is found in MongoDB.
5. User is attached to `req.user`.
6. Controller can now use `req.user._id`.

### Send Message Flow

1. Client sends `POST /message/:chatId`.
2. `authUserMiddleware` confirms the user is logged in.
3. `sendMessage` reads `content` and `model` from request body.
4. Backend checks if content and model exist.
5. User usage reset is checked.
6. Token limit is checked.
7. Chat is found using `chatId` and `req.user._id`.
8. Old messages are loaded from MongoDB.
9. `buildMessageForAi` builds AI context.
10. `genAIresponse` calls Gemini.
11. User message is saved.
12. Assistant message is saved.
13. Chat message count is updated.
14. Token usage is updated.
15. Response returns user message and assistant message.
16. Summary update runs after the response.

## AI Provider Setup

## Gemini Current Setup

Current message controller import:

```js
import { genAIresponse } from "../services/geminiRouterService.js";
```

Use Gemini model names:

```text
gemini-2.5-flash
gemini-2.5-pro
```

Example message body:

```json
{
  "content": "Explain closures in JavaScript",
  "model": "gemini-2.5-flash"
}
```

Gemini does not use OpenAI/OpenRouter model names. Do not send this to Gemini:

```text
google/gemini-2.5-flash
```

## OpenRouter Optional Setup

OpenRouter files are already present:

```text
config/openRouter.js
services/openRouterservice.js
```

To use OpenRouter instead of Gemini, the message controller import should point to:

```js
import { genAIresponse } from "../services/openRouterservice.js";
```

OpenRouter model names look like:

```text
openai/gpt-4o-mini
google/gemini-2.5-flash
anthropic/claude-3.5-sonnet
```

## API Endpoints

## User Routes

Base path:

```text
/user
```

### Signup

```http
POST /user/signup
```

Body:

```json
{
  "name": "Jatin",
  "age": 21,
  "email": "jatin@example.com",
  "password": "Password123"
}
```

### Login

```http
POST /user/login
```

Body:

```json
{
  "email": "jatin@example.com",
  "password": "Password123"
}
```

### Logout

```http
POST /user/logout
```

### Profile

```http
GET /user/profile
```

### Delete Account

```http
DELETE /user/delete
```

## Chat Routes

Base path:

```text
/chat
```

All chat routes require login.

### Create Chat

```http
POST /chat/createChat
```

Body:

```json
{
  "model": "gemini-2.5-flash"
}
```

### Get Recent Chats

```http
GET /chat/getRecentChat
```

### Get One Chat

```http
GET /chat/:chatId
```

### Delete Chat

```http
DELETE /chat/:chatId
```

## Message Routes

Base path:

```text
/message
```

All message routes require login.

### Get Messages

```http
GET /message/:chatId
```

### Send Message

```http
POST /message/:chatId
```

Body:

```json
{
  "content": "What is Node.js?",
  "model": "gemini-2.5-flash"
}
```

## Database Models

## User Model

Stores:

- `name`
- `age`
- `email`
- `password`
- `usage.TokenUsed`
- `usage.TokenLimit`
- `usage.ResetAt`
- `usage.TotalTokenUsed`

Purpose:

- Save user account data
- Save hashed password
- Track user token usage

## Chat Model

Stores:

- `userId`
- `Topic`
- `model`
- `summary`
- `summaryUpdatedAt`
- `summarizedTillmessageNumber`
- `messageCount`
- `usage.PromptToken`
- `usage.CompletionToken`
- `usage.TotalTokens`

Purpose:

- Save one conversation
- Track which AI model is used
- Store summary for long conversations
- Track chat-level token usage

## Message Model

Stores:

- `userId`
- `chatId`
- `role`
- `content`
- `tokens`
- `usage`

Purpose:

- Save every user message
- Save every assistant response
- Load old conversation history

## Validation Rules

Signup:

- `name`: minimum 3 characters, maximum 30
- `age`: optional, minimum 10, maximum 100
- `email`: valid email
- `password`: 8 to 30 characters
- `password`: must contain uppercase letter
- `password`: must contain lowercase letter
- `password`: must contain number

Login:

- `email`: valid email
- `password`: same password rules

## Common Errors And Meaning

### Gemini Role Error

Error:

```text
Role in turn must be 'user' or 'model'
```

Meaning:

Gemini received OpenAI-style messages with roles like `system` or `assistant`. Gemini only accepts `user` and `model` in structured role input. Convert the messages to a plain prompt string or convert roles before sending.

### Wrong Model Name

If Gemini is active, use:

```text
gemini-2.5-flash
```

If OpenRouter is active, use:

```text
google/gemini-2.5-flash
```

### Environment Variable Missing

If API key or database connection fails, check `.env` and restart the server.

### Mongoose NaN Error

If you see a `Cast to Number failed for value "NaN"` error, check numeric fields and default values in schemas.

## Prompts You Can Give AI To Generate More Features

Use these prompts with ChatGPT/Codex to continue this project.

### Frontend Prompt

```text
Build a React frontend for this backend. It should include signup, login, logout, profile, chat list, create chat, message screen, and send message UI. Use cookies for authentication and call the backend routes exactly as documented in readme.md.
```

### Provider Switch Prompt

```text
Add a clean provider switch so the backend can use either Gemini or OpenRouter based on an environment variable AI_PROVIDER. Keep the response format from both providers the same: ai_reply, prompt_token, completion_token, total_tokens.
```

### Streaming Prompt

```text
Add streaming AI responses to the message route. Keep the existing non-streaming route working, but add a new route for streaming Gemini responses.
```

### Better Error Handling Prompt

```text
Improve error handling in this Express backend. Add clear error responses for validation errors, auth errors, AI provider errors, MongoDB errors, and token limit errors.
```

### Testing Prompt

```text
Add automated tests for user signup, login, protected routes, chat creation, sending messages, and token limit behavior.
```

### Documentation Prompt

```text
Read this backend code and update readme.md with route examples, request bodies, response examples, environment variables, and setup steps.
```

### Refactor Prompt

```text
Refactor this backend to make the AI provider layer cleaner. Create one aiService.js file that chooses Gemini or OpenRouter internally and keeps controllers independent of provider-specific code.
```

### Security Prompt

```text
Review this backend for security issues. Check JWT usage, cookie settings, password hashing, environment variables, MongoDB queries, input validation, and account deletion.
```

## Future Improvements

- Add frontend
- Add provider switch using `.env`
- Add streaming responses
- Add better global error middleware
- Add request logging
- Add tests
- Add rate limiting
- Add refresh tokens
- Add production cookie settings
- Add chat rename endpoint
- Add message delete endpoint
- Add model list endpoint

## Important Notes

- Restart the server after changing `.env`.
- Restart the server after changing provider imports.
- Use Gemini model names when Gemini service is active.
- Use OpenRouter model names when OpenRouter service is active.
- Keep `.env` private.
- MongoDB must be connected before routes work.
- Protected routes require the login cookie.
