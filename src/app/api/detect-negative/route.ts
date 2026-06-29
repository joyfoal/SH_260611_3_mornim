import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json() as { text: string }

    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'your_key_here') {
      return NextResponse.json({ isNegative: false, alternative: null })
    }

    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: 'https://openrouter.ai/api/v1' })

    const completion = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            `한국어 텍스트를 분석하고 JSON만 응답하세요.

규칙:
1. 욕설·비속어·혐오표현이 포함된 경우 → {"isNegative": true, "alternative": null}
2. 욕설은 없지만 부정적 언어(못, 않, 없, 싫, 걱정, 두려움, 안 돼 등)가 포함된 경우 → {"isNegative": true, "alternative": "성공의 말"}
   - alternative는 반드시 "나는..." 또는 "나의..."로 시작하는 현재형 1인칭 긍정 확언이어야 합니다
   - 원문의 감정적 맥락을 반영해 강력하고 희망적인 문장으로 만들어주세요
   - 단순히 부정어를 제거하는 게 아니라 진짜 성공의 말로 바꿔주세요
   - 예시: "기분이 좋지 않다" → "나는 언제나 밝고 긍정적인 에너지로 가득 차 있다"
3. 정상적인 문장 → {"isNegative": false, "alternative": null}`,
        },
        { role: 'user', content: `텍스트: "${text}"` },
      ],
      temperature: 0.3,
      max_tokens: 150,
    })

    const content = completion.choices[0]?.message?.content ?? ''
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) {
      return NextResponse.json({ isNegative: false, alternative: null })
    }
    const result = JSON.parse(match[0]) as { isNegative: boolean; alternative: string | null }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ isNegative: false, alternative: null })
  }
}
