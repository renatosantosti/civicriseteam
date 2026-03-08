export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const getApiBase = (): string => {
  const url = import.meta.env.VITE_API_URL
  return typeof url === 'string' && url.trim() ? url.trim().replace(/\/$/, '') : 'http://localhost:8000'
}

/**
 * Calls the Python backend chat stream endpoint. Returns the raw Response
 * so the consumer can read the NDJSON stream (content_block_delta with delta.text).
 */
export async function genAIResponse(params: {
  data: {
    messages: Array<Message>
    systemPrompt?: { value: string; enabled: boolean }
  }
}): Promise<Response> {
  const { messages, systemPrompt } = params.data
  const base = getApiBase()
  const res = await fetch(`${base}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: messages.map((m) => ({ id: m.id, role: m.role, content: m.content })),
      systemPrompt: systemPrompt ?? undefined,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? 'Failed to get AI response')
  }
  return res
}
