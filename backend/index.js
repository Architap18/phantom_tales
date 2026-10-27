
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { fileURLToPath } from 'node:url';

const envPath = fileURLToPath(new URL('./.env', import.meta.url));
dotenv.config({ path: envPath });

const app = express();

const PORT = Number(process.env.PORT) || 5001;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL;

const fearDescriptions = {
  mild: 'mild suspense, an eerie atmosphere, and a mysterious ending',
  moderate: 'strong suspense, unsettling details, and a frightening ending',
  high: 'intense psychological horror, a terrifying atmosphere, and a disturbing ending without excessive gore',
};

app.use(
  cors({
    origin: 'http://localhost:5174',
  })
);

app.use(express.json({ limit: '10kb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    backend: 'running',
    groqConfigured: Boolean(GROQ_API_KEY),
    model: GROQ_MODEL || null,
    port: PORT,
  });
});

// Extract title and story from the AI response.
function parseStory(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    return null;
  }

  const text = raw.trim();

  // Preferred format: TITLE: ... STORY: ...
  const formatted = text.match(
    /^\s*TITLE:\s*(.+?)\s*STORY:\s*([\s\S]+?)\s*$/i
  );

  if (formatted) {
    const title = formatted[1].trim();
    const content = formatted[2].trim();

    if (title && content) {
      return { title, content };
    }
  }

  // Fallback: accept plain text if the model ignores the format.
  const cleaned = text
    .replace(/^```(?:text|markdown)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  const lines = cleaned.split('\n');
  const firstLine = lines[0]?.trim();

  if (
    firstLine &&
    lines.slice(1).join('\n').trim().length > 0 &&
    firstLine.length <= 150
  ) {
    return {
      title: firstLine.replace(/^#+\s*/, '').replace(/^["']|["']$/g, ''),
      content: lines.slice(1).join('\n').trim(),
    };
  }

  // Last resort: use the response as the story with a generic title.
  if (cleaned.length > 20) {
    return {
      title: 'Phantom Tales',
      content: cleaned,
    };
  }

  return null;
}

// Generate an AI horror story.
app.post('/api/stories/generate', async (req, res) => {
  try {
    const { location, character, fear = 'moderate' } = req.body || {};

    if (typeof location !== 'string' || !location.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a location.',
      });
    }

    if (typeof character !== 'string' || !character.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a main character.',
      });
    }

    if (location.trim().length > 150 || character.trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Location and character must each be 150 characters or fewer.',
      });
    }

    if (
      typeof fear !== 'string' ||
      !Object.prototype.hasOwnProperty.call(fearDescriptions, fear)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Choose a valid fear level: mild, moderate, or high.',
      });
    }

    if (!GROQ_API_KEY) {
      console.error('GROQ_API_KEY is missing.');

      return res.status(503).json({
        success: false,
        message: 'AI is not configured. Add GROQ_API_KEY to backend/.env.',
      });
    }

    if (!GROQ_MODEL) {
      console.error('GROQ_MODEL is missing.');

      return res.status(503).json({
        success: false,
        message: 'AI model is not configured. Add GROQ_MODEL to backend/.env.',
      });
    }

    const prompt = `
Write an original horror story of approximately 150-300 words.

Location: ${location.trim()}
Main character: ${character.trim()}
Fear level: ${fearDescriptions[fear]}

Write an immersive story with a beginning, suspenseful middle, and memorable ending.

Use this format:

TITLE: Your original story title

STORY:
Your story in paragraphs.

Return the title and story. Do not return JSON or code fences.
`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    let response;

    try {
      response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
              {
                role: 'system',
                content:
                  'You are Phantom Tales, a creative horror fiction writer. Return an original story and follow the requested format.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.8,
            max_tokens: 1200,
          }),
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const providerMessage =
        data?.error?.message || 'Unknown Groq API error';

      console.error(
        'Groq API error:',
        response.status,
        providerMessage
      );

      if (response.status === 401 || response.status === 403) {
        return res.status(502).json({
          success: false,
          message: 'Groq rejected the API key. Check that it is valid and active.',
        });
      }

      if (response.status === 429) {
        return res.status(503).json({
          success: false,
          message: 'Groq rate limit or quota reached. Please try again later.',
        });
      }

      if (response.status === 400 || response.status === 404) {
        return res.status(502).json({
          success: false,
          message: 'Groq rejected the model or request. Check GROQ_MODEL in backend/.env.',
        });
      }

      return res.status(502).json({
        success: false,
        message: 'The AI provider could not generate a story. Please try again.',
      });
    }

    const choice = data?.choices?.[0];
    const message = choice?.message;
    const raw = message?.content;

    // Log response metadata, not the API key.
    console.error(
      'Groq response diagnostics:',
      JSON.stringify(
        {
          model: data?.model,
          finishReason: choice?.finish_reason,
          messageKeys: message ? Object.keys(message) : [],
          contentType: typeof raw,
          contentLength:
            typeof raw === 'string' ? raw.length : null,
          refusal: message?.refusal || null,
          hasToolCalls: Boolean(message?.tool_calls?.length),
          usage: data?.usage || null,
        },
        null,
        2
      )
    );

    if (typeof raw !== 'string' || !raw.trim()) {
      console.error(
        'Groq returned no text. Response choices:',
        JSON.stringify(data?.choices ?? [])
      );

      return res.status(502).json({
        success: false,
        message: 'Groq returned no story text. Check the backend terminal diagnostics.',
      });
    }

    const story = parseStory(raw);

    if (!story) {
      console.error(
        'Unable to parse Groq response:',
        raw.slice(0, 500)
      );

      return res.status(502).json({
        success: false,
        message: 'The AI returned an incomplete story. Please try again.',
      });
    }

    return res.json({
      success: true,
      title: story.title,
      content: story.content,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        message: 'Story generation timed out. Please try again.',
      });
    }

    console.error('Story generation error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred while generating your story.',
    });
  }
});

// Unknown API endpoints
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found.',
  });
});

// Handle malformed JSON and other Express errors
app.use((error, req, res, next) => {
  console.error('Express error:', error.message);

  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON request body.',
    });
  }

  return res.status(500).json({
    success: false,
    message: 'An unexpected server error occurred.',
  });
});

app.listen(PORT, () => {
  console.log(`Phantom Tales backend: http://localhost:${PORT}`);
  console.log(`Groq model: ${GROQ_MODEL || 'NOT CONFIGURED'}`);
  console.log(`Groq API key configured: ${Boolean(GROQ_API_KEY)}`);
});
