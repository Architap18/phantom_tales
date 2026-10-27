
import { useState } from 'react';
import './theme.css';

const fearOptions = [
  { value: 'mild', label: 'Mild', subtitle: 'Chilling', color: 'green' },
  { value: 'moderate', label: 'Moderate', subtitle: 'Creepy', color: 'orange' },
  { value: 'high', label: 'High', subtitle: 'Terrifying', color: 'red' }
];

const suggestions = [
  'A forest at midnight',
  'A mysterious train',
  'An abandoned school',
  'A small town',
  'A mirror that talks'
];

const sampleStory = {
  title: 'Room 304',
  content: `The new hostel wing was supposed to be empty, but on the first night, I kept hearing someone pacing in the corridor.

At 3:04 AM, the footsteps stopped outside my door. When I peeked through the gap, no one was there — only a single wet footprint on the floor.

The next morning, I checked the room number again.

There was no Room 304 in this building.`
};

async function readJsonResponse(response) {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(
      `The server returned an empty response (HTTP ${response.status}). Check the backend and Vite proxy.`
    );
  }

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `The server returned a non-JSON response (HTTP ${response.status}). Check the backend URL and terminal logs.`
    );
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed with HTTP ${response.status}.`);
  }

  return data;
}

export default function PhantomApp() {
  const [location, setLocation] = useState('');
  const [character, setCharacter] = useState('');
  const [fear, setFear] = useState('moderate');
  const [story, setStory] = useState(sampleStory);
  const [isExample, setIsExample] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');

  async function handleGenerate(event) {
    event.preventDefault();
    setError('');
    setCopyMessage('');

    if (!location.trim() || !character.trim()) {
      setError('Please enter both a location and a main character.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/stories/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: location.trim(),
          character: character.trim(),
          fear
        })
      });

      const data = await readJsonResponse(response);

      if (
        typeof data.title !== 'string' ||
        typeof data.content !== 'string' ||
        !data.title.trim() ||
        !data.content.trim()
      ) {
        throw new Error('The server response did not contain a valid story.');
      }

      setStory({ title: data.title, content: data.content });
      setIsExample(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate a story.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!story) return;

    const text = `${story.title}\n\n${story.content}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage('Story copied!');
    } catch {
      setCopyMessage('Clipboard access failed. Please copy the story manually.');
    }
  }

  return (
    <div className="app-container" id="home">
      <header className="site-header">
        <a className="brand" href="#home" aria-label="Phantom Tales home">
          <span className="brand-ghost" aria-hidden="true">👻</span>
          <span>Phantom Tales</span>
        </a>

        <nav className="site-nav" aria-label="Main navigation">
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#how-it-works">How It Works</a>
        </nav>
      </header>

      <section className="hero" id="about">
        <div className="hero-ghost" aria-hidden="true">👻</div>
        <p className="eyebrow">A LITTLE SOMETHING FROM THE OTHER SIDE</p>
        <h1>Phantom Tales</h1>
        <p className="hero-subtitle">AI-powered ghost story generator</p>
        <p className="hero-description">
          Enter a few details and let the spirits weave a story...
        </p>
      </section>

      <main className="main-content" id="how-it-works">
        <section className="panel generator-panel">
          <h2>✦ Generate a Ghost Story</h2>

          <form onSubmit={handleGenerate}>
            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                id="location"
                name="location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="e.g. an old hostel"
                maxLength={150}
                required
              />
              <p className="field-hint">
                A haunted house, forest, train, or abandoned school
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="character">Main Character</label>
              <input
                id="character"
                name="character"
                value={character}
                onChange={(event) => setCharacter(event.target.value)}
                placeholder="e.g. a college student"
                maxLength={150}
                required
              />
              <p className="field-hint">
                A curious explorer, a detective, or someone like you
              </p>
            </div>

            <fieldset className="fear-group">
              <legend>Fear Level</legend>
              <div className="fear-options">
                {fearOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`fear-card ${option.color} ${
                      fear === option.value ? 'selected' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="fear"
                      value={option.value}
                      checked={fear === option.value}
                      onChange={() => setFear(option.value)}
                    />
                    <span className="fear-indicator" aria-hidden="true" />
                    <span className="fear-title">{option.label}</span>
                    <span className="fear-subtitle">{option.subtitle}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <button className="generate-btn" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  The spirits are gathering...
                </>
              ) : (
                '👻 Generate Story'
              )}
            </button>

            {error && (
              <p className="error-msg" role="alert">{error}</p>
            )}
          </form>
        </section>

        <section className="panel story-panel" aria-live="polite">
          <div className="story-header">
            <h2>📖 Your Ghost Story</h2>
            <button
              className="copy-btn"
              type="button"
              onClick={handleCopy}
              disabled={!story}
            >
              Copy
            </button>
          </div>

          {isExample && (
            <p className="example-label">EXAMPLE STORY · NOT AI-GENERATED</p>
          )}

          {story && (
            <article className="story-content">
              <h3>{story.title}</h3>
              <div className="story-divider" aria-hidden="true">✧ ── ✧</div>
              <p className="story-text">{story.content}</p>
            </article>
          )}

          {copyMessage && (
            <p className="copy-message" role="status">{copyMessage}</p>
          )}
        </section>
      </main>

      <section className="suggestions" aria-label="Suggested locations">
        <p>✦ Try these ideas:</p>
        <div className="suggestion-list">
          {suggestions.map((suggestion) => (
            <button
              type="button"
              className="suggestion-chip"
              key={suggestion}
              onClick={() => {
                setLocation(suggestion);
                document.getElementById('location')?.focus();
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        Phantom Tales · Stories from the other side
      </footer>
    </div>
  );
}
