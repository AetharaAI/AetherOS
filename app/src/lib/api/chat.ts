// Lightweight search mock for local UI testing.
// Chat/model requests now go directly to LiteLLM in useChatStream + ModelSelector.

declare global {
  interface Window {
    __aetherosFetchIntercepted?: boolean;
  }
}

export async function mockSearch(query: string): Promise<{
  context: string;
  answer?: string;
  results: Array<{ title: string; url: string; content: string }>;
}> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const mockResults = [
    {
      title: `${query} - Wikipedia`,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
      content: `This is a comprehensive article about ${query}. It covers history, development, and current state.`,
    },
    {
      title: `${query} - Official Documentation`,
      url: `https://docs.example.com/${encodeURIComponent(query)}`,
      content: `Official references for ${query}, including tutorials, API docs, and best practices.`,
    },
    {
      title: `${query} - Research Paper`,
      url: `https://arxiv.org/abs/${Math.floor(Math.random() * 10000)}`,
      content: `Recent academic work related to ${query}, highlighting advances and open questions.`,
    },
  ];

  return {
    context: mockResults
      .map((result) => `Source: ${result.title} (${result.url})\n${result.content}`)
      .join('\n\n'),
    answer: `Search summary for ${query}.`,
    results: mockResults,
  };
}

export function setupApiInterceptors() {
  if (window.__aetherosFetchIntercepted) {
    return;
  }

  window.__aetherosFetchIntercepted = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString();

    if (url.includes('/api/search')) {
      const body = JSON.parse((init?.body as string) || '{}');
      const results = await mockSearch(body.query ?? '');

      return new Response(JSON.stringify(results), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return originalFetch(input, init);
  };
}
