
# Phantom Tales 👻

An AI-powered ghost story generator built with React, Vite, Express, and Groq.

Users enter a location and main character, choose a fear level, and generate an original horror story.

## Features

- Responsive, spooky Halloween interface.
- Location and character inputs.
- Mild, Moderate, and High fear levels.
- AI-generated horror stories using Groq.
- Copyable story output.
- Suggested locations.
- Helpful API and validation errors.

## Tech stack

- React and Vite
- Node.js and Express
- Groq Chat Completions API
- Plain CSS

## Requirements

- Node.js 20.19+ or a compatible newer version
- npm
- A Groq account and API key for live AI generation

## Setup

### 1. Configure the backend

Open a terminal at the project root:

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:

```env
GROQ_API_KEY=your_new_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
PORT=5001
```

Use a model currently supported by your Groq account.

### 2. Start the backend

From the `backend` directory:

```bash
npm start
```

The backend should listen on `http://localhost:5001`.

### 3. Start the frontend

Open another terminal at the project root:

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5174`.

### 4. Test the backend

Health check:

```bash
curl http://localhost:5001/api/health
```

Generate a story:

```bash
curl -X POST http://localhost:5001/api/stories/generate \
  -H "Content-Type: application/json" \
  -d '{"location":"an abandoned school","character":"a college student","fear":"moderate"}'
```

## API

### GET /api/health

Reports backend status and whether the API key is configured. It does not validate the key with Groq.

### POST /api/stories/generate

Request:

```json
{
  "location": "an abandoned school",
  "character": "a college student",
  "fear": "moderate"
}
```

Success response:

```json
{
  "success": true,
  "title": "The Last Bell",
  "content": "The generated story..."
}
```

## Troubleshooting

- **Missing API key:** Check `backend/.env` and restart the backend.
- **Port 5000 occupied:** Use port 5001.
- **Port 5001 occupied:** Find the conflicting process or select another port and update the Vite proxy.
- **Invalid model:** Configure a model supported by your Groq account.
- **Rate limit:** Wait and retry according to your account limits.
- **Empty or invalid JSON:** Inspect the backend terminal and browser Network tab.
- **Frontend cannot reach backend:** Check the Vite proxy target and restart Vite.

## Privacy

The frontend sends story requests to the application's backend. The backend sends prompts to Groq for inference. Do not enter confidential or sensitive information into prompts. Never expose your API key in frontend code or commit it to Git.

## Open innovation

The application uses a model available through Groq's hosted inference service. Model availability and licensing depend on the selected model. Hosted inference is not local or guaranteed to work offline. Review the model's own license and usage terms.

## License

The application is distributed under the MIT License. See `LICENSE`.
