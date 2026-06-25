import { NextRequest, NextResponse } from 'next/server'

const FALLBACK_AFFIRMATIONS = [
  '나는 반드시 성공한다',
  '나는 매일 더 나은 나로 성장하고 있다',
  '나는 내가 하는 일에서 가치를 만든다',
  '나는 풍요와 기쁨을 받아들일 준비가 되어 있다',
  '나는 두려워도 한 발 내딛을 수 있다',
]

interface Message {
  role: string
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const { messages, generateAffirmations } = await req.json() as {
      messages: Message[]
      generateAffirmations?: boolean
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_key_here') {
      return NextResponse.json({
        reply: generateAffirmations
          ? '대화 내용을 바탕으로 성공의 말을 만들었어요!'
          : '지금 당신의 이야기를 듣고 있어요. 조금 더 말씀해 주시겠어요?',
        affirmations: generateAffirmations ? FALLBACK_AFFIRMATIONS : undefined,
      })
    }

    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    let systemPrompt: string
    if (generateAffirmations) {
      systemPrompt = `당신은 따뜻한 성공 코치입니다. 지금까지의 대화 내용을 바탕으로, 사용자에게 딱 맞는 한국어 성공의 말(긍정 확언) 5개를 만들어주세요.
반드시 다음 JSON 형식으로만 응답하세요:
{"reply": "대화 내용을 바탕으로 성공의 말을 준비했어요 ✨", "affirmations": ["성공의 말1","성공의 말2","성공의 말3","성공의 말4","성공의 말5"]}
성공의 말은 반드시 현재형, 1인칭('나는...' 또는 '나의...')으로 작성하고, 짧고 강력하게 써주세요.`
    } else {
      systemPrompt = `당신은 따뜻하고 용기를 주는 성공 코치입니다. 사용자의 이야기를 경청하고 공감하며 더 깊은 이야기를 이끌어내세요.
규칙:
- 짧고 따뜻하게 응답하세요 (2-3문장)
- 판단하지 말고 공감해주세요
- 구체적인 상황이나 감정을 더 물어보세요
- 응원과 긍정 에너지를 담아주세요
- 절대 성공의 말을 지금 생성하지 마세요 (사용자가 버튼을 누를 때 생성합니다)`
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...(messages as Array<{ role: 'user' | 'assistant'; content: string }>),
      ],
      temperature: 0.8,
      max_tokens: 250,
    })

    const content = completion.choices[0]?.message?.content ?? ''

    if (generateAffirmations) {
      const match = content.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0]) as { reply: string; affirmations?: string[] }
        return NextResponse.json(parsed)
      }
      return NextResponse.json({
        reply: '성공의 말을 만들었어요!',
        affirmations: FALLBACK_AFFIRMATIONS,
      })
    }

    return NextResponse.json({ reply: content })
  } catch {
    return NextResponse.json({
      reply: '지금 당신의 이야기를 듣고 있어요.',
    })
  }
}
