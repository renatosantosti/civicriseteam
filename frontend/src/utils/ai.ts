import { createServerFn } from '@tanstack/react-start'
import { Anthropic } from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { retrieveFromRag } from '../server/rag'

const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-5-20250929'
const DEFAULT_OPENAI_MODEL = 'gpt-4o'

export type AppMode = 'citizen' | 'dispatcher'

export interface Citation {
  sourceName: string
  note?: string
}

export interface IncidentWarning {
  title: string
  area: string
  summary: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  incidentWarning?: IncidentWarning
}

/** Thrown when the server function returns a non-ok response (e.g. 503). */
export class ChatApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detail?: string
  ) {
    super(message)
    this.name = 'ChatApiError'
  }
}

interface AIResponsePayload {
  answer: string
  citations?: Citation[]
  incidentWarning?: IncidentWarning
}

const BASE_GUARDRAILS = `You are Montgomery Civic Copilot.

Rules:
- Stay factual and grounded in verified data only.
- Never fabricate city schedules, incidents, ticket statuses, or policies.
- If verified information is missing, say: "I don't have verified information on that yet, but here's the correct next step."
- Keep responses concise and actionable.
- Use plain language.
- Include structured call-to-action bullets when helpful.

Output strictly as JSON with this exact shape:
{
  "answer": "string",
  "citations": [{ "sourceName": "string", "note": "optional string" }],
  "incidentWarning": { "title": "string", "area": "string", "summary": "string" } | null
}

Use an empty array for citations when no verified source is available.
Use null for incidentWarning when there is no verified active disruption.`

const CITIZEN_SYSTEM_PROMPT = `Citizen-facing mode.
- Help residents with city services and 311 guidance.
- Keep tone warm and resident-friendly.
- If user reports an issue, suggest category and next step for Snap & Submit.`

const DISPATCHER_SYSTEM_PROMPT = `Dispatcher mode.
- Help city workers summarize, triage, and sequence incident clusters.
- Keep tone operational and concise.
- Do not publish incidents, dispatch crews, or alter records.`

function buildSystemPrompt(mode: AppMode): string {
  const modePrompt = mode === 'dispatcher' ? DISPATCHER_SYSTEM_PROMPT : CITIZEN_SYSTEM_PROMPT
  return `${BASE_GUARDRAILS}\n\n${modePrompt}`
}

interface RagDebugPayload {
  provider: string
  apiKeySet: boolean
  apiKeyLength: number
  resolvedModel: string
  envModelSet: boolean
}

function getRagDebugHeaders(debug: RagDebugPayload): Record<string, string> {
  if (process.env.NODE_ENV === 'production') return {}
  return { 'X-RAG-Debug': JSON.stringify(debug) }
}

/** Load .env and .env.local from frontend root (same order as test-openai-key.mjs). Only runs on server. */
async function loadRagEnvFromFiles(): Promise<Record<string, string>> {
  const path = await import('path')
  const fs = await import('fs')
  const { fileURLToPath } = await import('url')
  const hasEnvFiles = (dir: string) =>
    fs.existsSync(path.join(dir, '.env')) ||
    fs.existsSync(path.join(dir, '.env.local'))
  const candidates = [
    typeof process !== 'undefined' ? process.cwd() : '',
    typeof process !== 'undefined' ? path.join(process.cwd(), 'frontend') : '',
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../..'
    ),
  ].filter(Boolean)
  let frontendRoot = typeof process !== 'undefined' ? process.cwd() : ''
  for (const dir of candidates) {
    if (dir && hasEnvFiles(dir)) {
      frontendRoot = dir
      break
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    console.log('[RAG] Loaded env from: %s', frontendRoot)
  }
  const loadEnvFile = (filePath: string): Record<string, string> => {
    const out: Record<string, string> = {}
    try {
      if (!fs.existsSync(filePath)) return out
      const content = fs.readFileSync(filePath, 'utf8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eq = trimmed.indexOf('=')
        if (eq === -1) continue
        const key = trimmed.slice(0, eq).trim()
        let val = trimmed.slice(eq + 1).trim()
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        )
          val = val.slice(1, -1)
        out[key] = val
      }
    } catch {
      // ignore
    }
    return out
  }
  const fromEnv = loadEnvFile(path.join(frontendRoot, '.env'))
  const fromEnvLocal = loadEnvFile(path.join(frontendRoot, '.env.local'))
  return { ...fromEnv, ...fromEnvLocal }
}

function parseAIResponse(text: string): AIResponsePayload {
  const normalized = text.trim()
  const blockMatch = normalized.match(/```json\s*([\s\S]*?)```/i)
  const candidate = blockMatch?.[1] ?? normalized

  try {
    const parsed = JSON.parse(candidate) as AIResponsePayload
    return {
      answer: parsed.answer?.trim() || 'I could not produce a verified answer right now.',
      citations: Array.isArray(parsed.citations) ? parsed.citations : [],
      incidentWarning: parsed.incidentWarning ?? undefined,
    }
  } catch {
    return {
      answer: normalized || 'I could not produce a verified answer right now.',
      citations: [],
    }
  }
}

export const genAIResponse = createServerFn({ method: 'GET', response: 'raw' } as { method: 'GET'; response?: 'raw' })
  .inputValidator(
    (d: {
      messages: Array<Message>
      mode: AppMode
      residentZip?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    const fileEnv = await loadRagEnvFromFiles()
    const provider = (
      fileEnv.RAG_LLM_PROVIDER ??
      process.env.RAG_LLM_PROVIDER ??
      'anthropic'
    ).toLowerCase()
    const apiKey = (
      fileEnv.RAG_LLM_API_KEY ??
      process.env.RAG_LLM_API_KEY
    )?.trim()
    const modelOverride = (
      fileEnv.RAG_LLM_MODEL ??
      process.env.RAG_LLM_MODEL
    )?.trim()
    const resolvedModel =
      provider === 'openai'
        ? (modelOverride || DEFAULT_OPENAI_MODEL)
        : (modelOverride || DEFAULT_ANTHROPIC_MODEL)
    const envModelSet = !!modelOverride
    const apiKeyLength = apiKey?.length ?? 0

    console.log(
      '[RAG] Server: provider=%s, apiKeySet=%s, apiKeyLength=%s, resolvedModel=%s, envModelSet=%s',
      provider,
      !!apiKey,
      apiKeyLength,
      resolvedModel,
      envModelSet
    )

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          answer: 'Missing API key: set RAG_LLM_API_KEY in your environment.',
          citations: [],
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            ...getRagDebugHeaders({
              provider,
              apiKeySet: false,
              apiKeyLength: 0,
              resolvedModel,
              envModelSet,
            }),
          },
        }
      )
    }

    const formattedMessages = data.messages
      .filter(
        (msg) =>
          msg.content.trim() !== '' &&
          !msg.content.startsWith('Sorry, I encountered an error'),
      )
      .map((msg) => ({
        role: msg.role,
        content: msg.content.trim(),
      }))

    if (formattedMessages.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid messages to send' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...getRagDebugHeaders({
            provider,
            apiKeySet: true,
            apiKeyLength,
            resolvedModel,
            envModelSet,
          }),
        },
      })
    }

    const userQuery = formattedMessages[formattedMessages.length - 1]?.content || ''
    const retrievedContext = await retrieveFromRag({
      query: userQuery,
      mode: data.mode,
      residentZip: data.residentZip,
    })
    const contextBlock = retrievedContext
      .map((chunk, index) => `Source ${index + 1}: ${chunk.sourceName}${chunk.note ? ` (${chunk.note})` : ''}\n${chunk.snippet}`)
      .join('\n\n')

    const zipContext = data.residentZip
      ? `User ZIP context: ${data.residentZip}. Add incidentWarning only when verified context supports it.`
      : 'No ZIP context supplied.'
    const ragContext = contextBlock
      ? `Verified retrieved context:\n${contextBlock}`
      : 'Verified retrieved context: none available.'
    const systemPrompt = `${buildSystemPrompt(data.mode)}\n\n${zipContext}\n\n${ragContext}`

    try {
      let rawText: string

      if (provider === 'openai') {
        const openai = new OpenAI({ apiKey, timeout: 30000 })
        const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          { role: 'system', content: systemPrompt },
          ...formattedMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        ]
        const completion = await openai.chat.completions.create({
          model: resolvedModel,
          messages: openaiMessages,
          max_tokens: 1200,
        })
        rawText = completion.choices[0]?.message?.content ?? ''
      } else {
        const anthropic = new Anthropic({ apiKey, timeout: 30000 })
        const completion = await anthropic.messages.create({
          model: resolvedModel,
          max_tokens: 1200,
          system: systemPrompt,
          messages: formattedMessages,
        })
        rawText = completion.content
          .filter((block) => block.type === 'text')
          .map((block) => ('text' in block ? block.text : ''))
          .join('\n')
      }

      const parsed = parseAIResponse(rawText)
      if ((!parsed.citations || parsed.citations.length === 0) && retrievedContext.length > 0) {
        parsed.citations = retrievedContext.map((chunk) => ({
          sourceName: chunk.sourceName,
          note: chunk.note,
        }))
      }

      return new Response(JSON.stringify(parsed), {
        headers: {
          'Content-Type': 'application/json',
          ...getRagDebugHeaders({
            provider,
            apiKeySet: true,
            apiKeyLength,
            resolvedModel,
            envModelSet,
          }),
        },
      })
    } catch (error) {
      console.error('Error in genAIResponse:', error)

      let errorMessage = 'Failed to get AI response'
      let statusCode = 500
      const providerLabel = provider === 'openai' ? 'OpenAI' : 'Anthropic'

      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          errorMessage = 'Rate limit exceeded. Please try again in a moment.'
        } else if (error.message.includes('Connection error') || error.name === 'APIConnectionError') {
          errorMessage = `Connection to ${providerLabel} API failed. Please check your internet connection and API key.`
          statusCode = 503
        } else if ((error as { status?: number }).status === 401 || error.name === 'AuthenticationError' || error.message.includes('authentication') || error.message.includes('invalid_api_key') || error.message.includes('Incorrect API key')) {
          errorMessage = `Authentication failed. Please check your RAG_LLM_API_KEY.`
          statusCode = 401
        } else {
          errorMessage = error.message
        }
      } else if (error && typeof error === 'object' && (error as { status?: number }).status === 401) {
        errorMessage = 'Authentication failed. Please check your RAG_LLM_API_KEY.'
        statusCode = 401
      }

      return new Response(
        JSON.stringify({
          answer: errorMessage,
          citations: [],
          details: error instanceof Error ? error.name : undefined,
        }),
        {
          status: statusCode,
          headers: {
            'Content-Type': 'application/json',
            ...getRagDebugHeaders({
              provider,
              apiKeySet: true,
              apiKeyLength,
              resolvedModel,
              envModelSet,
            }),
          },
        }
      )
    }
  })
