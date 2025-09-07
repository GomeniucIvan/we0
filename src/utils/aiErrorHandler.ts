import { getAppBaseUrl } from './appBaseUrl';

/**
 * Ask the currently selected AI model for a suggestion to fix the provided error.
 * Uses the same chat endpoint as the main application, supporting both local and
 * cloud models.
 */
export async function getErrorFixSuggestion(error: Error): Promise<string> {
  // Determine which model to use based on the user's current selection.
  const model = (() => {
    try {
      const stored = localStorage.getItem('selectedModel');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed?.value || 'gpt-4o-mini';
      }
    } catch (e) {
      console.error('Failed to read selected model', e);
    }
    return 'gpt-4o-mini';
  })();

  const baseUrl = getAppBaseUrl();

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        mode: 'chat',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that fixes runtime errors.' },
          { role: 'user', content: `Fix the following error: ${error.message}` },
        ],
        otherConfig: { isBackEnd: false, backendLanguage: '', extra: {} },
      }),
    });

    if (!response.body) {
      return 'No suggestion received from AI.';
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let suggestion = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const dataStr = line.slice(5).trim();
          if (!dataStr || dataStr === '[DONE]') continue;
          try {
            const json = JSON.parse(dataStr);
            if (typeof json.text === 'string') {
              suggestion += json.text;
            }
            if (typeof json.content === 'string') {
              suggestion += json.content;
            }
          } catch {
            // Ignore parse errors for non-JSON lines
          }
        }
      }
    }

    return suggestion.trim() || 'No suggestion received from AI.';
  } catch (e) {
    console.error('AI suggestion request failed', e);
    return 'Failed to retrieve suggestion from AI.';
  }
}

