import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { text, category, context } = await req.json() as { text: string; category?: string; context?: 'roomName' | 'general' }

    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'your_key_here') {
      return NextResponse.json({ isNegative: false, alternative: null, suggestedDesc: null, suggestedCategory: '나 자신' })
    }

    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: 'https://openrouter.ai/api/v1' })

    const isRoomName = context === 'roomName'
    const AFFIRMATION_CATEGORIES = ['나 자신', '일과 커리어', '돈과 풍요', '관계와 사랑', '건강과 몸', '용기와 도전', '마음과 평온', '오늘 하루']

    const systemPrompt = isRoomName
      ? `한국어 방 이름 텍스트를 분석하고 JSON만 응답하세요.

규칙:
1. 욕설·비속어·혐오표현이 포함된 경우 → {"isNegative": true, "alternative": null, "suggestedDesc": null}
2. 부정적 언어(못, 않, 없, 싫, 걱정, 두려움, 안 돼 등)가 포함된 경우 → {"isNegative": true, "alternative": "방 이름", "suggestedDesc": "한 줄 소개"}
   - alternative: 반드시 3단어 이하의 짧고 긍정적인 방 이름 (예: "자존감 키우기", "아침 확언 클럽", "성장하는 우리")
   - suggestedDesc: alternative 방 이름에 어울리는 한 문장 소개 (20자 내외, "~해요" 또는 "~모임이에요" 형식)
   - 두 필드 모두 원문의 주제나 감정 맥락을 긍정적으로 반영할 것
3. 정상적인 문장 → {"isNegative": false, "alternative": null, "suggestedDesc": null}`
      : `한국어 텍스트를 분석하고 JSON만 응답하세요.
카테고리 목록: ${AFFIRMATION_CATEGORIES.join(', ')}

규칙:
1. 욕설·비속어·혐오표현이 포함된 경우 → {"isNegative": true, "alternative": null, "suggestedDesc": null, "suggestedCategory": "나 자신"}
2. 욕설은 없지만 부정적 언어(못, 않, 없, 싫, 걱정, 두려움, 안 돼 등)가 포함된 경우 → {"isNegative": true, "alternative": "성공의 말", "suggestedDesc": null, "suggestedCategory": "카테고리명"}
   - alternative는 반드시 "나는..." 또는 "나의..."로 시작하는 현재형 1인칭 긍정 확언이어야 합니다
   - 원문의 감정적 맥락을 반영해 강력하고 희망적인 문장으로 만들어주세요
   - 카테고리가 제공된 경우 해당 카테고리 맥락을 반드시 반영할 것
3. 정상적인 문장 → {"isNegative": false, "alternative": null, "suggestedDesc": null, "suggestedCategory": "카테고리명"}
   - 텍스트 내용을 바탕으로 카테고리 목록 중 가장 적합한 것을 선택할 것`

    const completion = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `텍스트: "${text}"${category ? `\n카테고리: "${category}"` : ''}` },
      ],
      temperature: 0.3,
      max_tokens: 200,
    })

    const content = completion.choices[0]?.message?.content ?? ''
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) {
      return NextResponse.json({ isNegative: false, alternative: null, suggestedDesc: null })
    }
    const result = JSON.parse(match[0]) as { isNegative: boolean; alternative: string | null; suggestedDesc?: string | null; suggestedCategory?: string | null }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }
}
