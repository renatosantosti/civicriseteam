import type { Handler } from '@netlify/functions'

interface CrawlRecord {
  sourceName: string
  capturedAt: string
  payload: string
}

// Scheduled entry point for crawling verified Montgomery city sources via Bright Data.
export const handler: Handler = async () => {
  const endpoint = process.env.BRIGHTDATA_CRAWLER_ENDPOINT;
  const token = process.env.BRIGHTDATA_TOKEN;

  if (!endpoint || !token) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        message: 'Missing Bright Data configuration. Set BRIGHTDATA_CRAWLER_ENDPOINT and BRIGHTDATA_TOKEN.',
      }),
    }
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataset: 'montgomery-official-sources',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        statusCode: 502,
        body: JSON.stringify({ ok: false, message: errorText }),
      }
    }

    const result = (await response.json()) as { records?: CrawlRecord[] }

    // TODO: push normalized chunks to vector index after adding embeddings provider.
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, recordCount: result.records?.length ?? 0 }),
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        message: error instanceof Error ? error.message : 'Unexpected crawler failure',
      }),
    }
  }
}
