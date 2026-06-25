import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json() as { text: string }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_key_here') {
      return NextResponse.json({ isNegative: false, alternative: null })
    }

    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            '한국어 확언 텍스트가 부정적 언어(못, 않, 없, 싫, 걱정, 두려움 등)를 포함하는지 분석하세요. JSON으로 응답: {"isNegative": true/false, "alternative": "긍정적 대안 문장 또는 null"}',
        },
        { role: 'user', content: `텍스트: "${text}"` },
      ],
      temperature: 0.3,
      max_tokens: 80,
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
