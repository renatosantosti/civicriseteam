import type { Handler } from '@netlify/functions'

interface RetrievedChunk {
  sourceName: string
  snippet: string
  note?: string
}

// Retrieval endpoint used by the LLM layer to fetch verified city context.
export const handler: Handler = async (event) => {
  const query = event.queryStringParameters?.query?.trim()
  if (!query) {
    return {
      statusCode: 400,
      body: JSON.stringify({ ok: false, message: 'Missing query parameter.' }),
    }
  }

  // TODO: Replace stub with actual vector search (Convex vector index or external DB).
  const chunks: RetrievedChunk[] = [
    {
      sourceName: 'Montgomery Public Works Bulletin',
      snippet: `No verified record found for query: ${query}`,
      note: 'RAG backend not yet connected to live index.',
    },
  ]

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, chunks }),
  }
}
