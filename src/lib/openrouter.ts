import OpenAI from 'openai'

function getKeys(): string[] {
  return [
    process.env.OPENROUTER_API_KEY_1,
    process.env.OPENROUTER_API_KEY_2,
    process.env.OPENROUTER_API_KEY_3,
    process.env.OPENROUTER_API_KEY_4,
    process.env.OPENROUTER_API_KEY,
  ].filter((k): k is string => !!k && k !== 'your_key_here')
}

export function hasOpenRouterKey(): boolean {
  return getKeys().length > 0
}

export async function withOpenRouter<T>(
  callback: (client: OpenAI) => Promise<T>
): Promise<T> {
  const keys = getKeys()
  if (keys.length === 0) throw new Error('no_api_key')

  let lastError: unknown
  for (const key of keys) {
    try {
      const client = new OpenAI({ apiKey: key, baseURL: 'https://openrouter.ai/api/v1' })
      return await callback(client)
    } catch (err) {
      const status = (err as { status?: number })?.status
      const message = (err as { message?: string })?.message ?? ''
      if (status === 402 || message.includes('402') || message.toLowerCase().includes('credit')) {
        lastError = err
        continue
      }
      throw err
    }
  }
  throw lastError
}
