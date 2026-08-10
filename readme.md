# GPT Backend API

Backend API for a GPT-style chat application. It provides user authentication, chat management, message history, AI responses through OpenRouter, and token usage tracking.

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT authentication with HTTP-only cookies
- OpenRouter API
- Zod validation

## Project Structure

```text
config/          Database and OpenRouter configuration
controllers/     Route handler logic
middlewares/     Authentication middleware
model/           Mongoose schemas
routes/          API route definitions
services/        OpenRouter and summary services
utils/           Chat context and token usage helpers
validators/      Request validation schemas
index.js         Server entry point
```

## Installation

```bash
npm install
```

## Environment Variables

This project uses a local `.env` file. Do not commit or share this file because it contains private configuration values.

Required keys:

- `Mongo_url`
- `PORT`
- `JWT_key`
- `Token`
- `TokenTime`
- `OPENROUTER_API_KEY`

## Run Server

For normal run:

```bash
node index.js
```

For development with auto restart:

```bash
npx nodemon index.js
```

Server will start on:

```text
http://localhost:PORT
```

## Authentication

Signup and login create a JWT token and store it in an HTTP-only cookie named `token`.

Protected routes require this cookie:

- `/user/profile`
- `/user/delete`
- all `/chat` routes
- all `/message` routes

## API Endpoints

### User Routes

Base path:

```text
/user
```

#### Signup

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

#### Login

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

#### Logout

```http
POST /user/logout
```

#### Profile

```http
GET /user/profile
```

#### Delete Account

```http
DELETE /user/delete
```

This deletes the user account, user chats, and user messages.

### Chat Routes

Base path:

```text
/chat
```

All chat routes are protected.

#### Create Chat

```http
POST /chat/createChat
```

Body:

```json
{
  "model": "openai/gpt-4o-mini"
}
```

#### Get Recent Chats

```http
GET /chat/getRecentChat
```

Returns the latest 20 chats for the logged-in user.

#### Get Single Chat

```http
GET /chat/:chatId
```

#### Delete Chat

```http
DELETE /chat/:chatId
```

### Message Routes

Base path:

```text
/message
```

All message routes are protected.

#### Get Messages

```http
GET /message/:chatId
```

Returns all messages for a chat in oldest-to-newest order.

#### Send Message

```http
POST /message/:chatId
```

Body:

```json
{
  "content": "Explain closures in JavaScript",
  "model": "openai/gpt-4o-mini"
}
```

Response includes the user message, assistant message, chat ID, and user ID.

## Validation Rules

Signup:

- `name`: 3 to 30 characters
- `age`: optional, 10 to 100
- `email`: valid email
- `password`: 8 to 30 characters, must include uppercase, lowercase, and number

Login:

- `email`: valid email
- `password`: same password rules as signup

## Notes

- MongoDB must be running before starting the server.
- OpenRouter API key is required for AI message responses.
- Keep `.env` private.
- Cookies are currently configured with `secure: false`, which is suitable for local development.
