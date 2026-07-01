import { NextRequest, NextResponse } from 'next/server'
import { hasOpenRouterKey, withOpenRouter } from '@/lib/openrouter'

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
    const { messages, generateAffirmations, initialContext } = await req.json() as {
      messages: Message[]
      generateAffirmations?: boolean
      initialContext?: string
    }

    if (!hasOpenRouterKey()) {
      return NextResponse.json({
        reply: generateAffirmations
          ? '우리의 대화를 바탕으로 당신만을 위한 성공의 말을 준비했어요 ✨ 아래에서 확인해 보세요!'
          : '이야기를 들려주셔서 감사해요. 조금 더 여쭤봐도 될까요?',
        affirmations: generateAffirmations ? FALLBACK_AFFIRMATIONS : undefined,
        suggestedCategory: generateAffirmations ? '나 자신' : undefined,
      })
    }

    const ctxLine = initialContext ? `\n사용자의 고민: "${initialContext}"` : ''

    let systemPrompt: string
    const CATEGORIES = ['나 자신', '일과 커리어', '돈과 풍요', '관계와 사랑', '건강과 몸', '용기와 도전', '마음과 평온', '오늘 하루']
    if (generateAffirmations) {
      systemPrompt = `당신은 따뜻한 성공 코치입니다.${ctxLine}

지금까지의 대화 내용을 바탕으로, 사용자에게 딱 맞는 한국어 성공의 말(긍정 확언) 5개를 만들고, 가장 적합한 카테고리를 선택하세요.
카테고리 목록: ${CATEGORIES.join(', ')}
반드시 다음 JSON 형식으로만 응답하세요:
{"reply": "우리의 대화를 바탕으로 당신만을 위한 성공의 말을 준비했어요 ✨ 아래에서 확인해 보세요!", "affirmations": ["성공의 말1","성공의 말2","성공의 말3","성공의 말4","성공의 말5"], "suggestedCategory": "카테고리명"}
성공의 말은 반드시 현재형, 1인칭('나는...' 또는 '나의...')으로 작성하고, 짧고 강력하게 써주세요.`
    } else {
      systemPrompt = `당신은 따뜻하고 용기를 주는 성공 코치입니다.${ctxLine}

이 고민을 더 깊이 이해하기 위해 진심 어린 질문을 하나씩 해주세요.
규칙:
- 한 번에 하나의 질문만 하세요
- 짧은 공감 한 마디(1문장) 후 질문을 이어주세요
- 이전 답변을 참고해 더 구체적으로 파고드세요
- 판단하지 말고 공감해주세요
- 응답은 2~3문장으로 짧게 (질문 포함)
- 절대 성공의 말을 지금 생성하지 마세요`
    }

    const completion = await withOpenRouter((openai) => openai.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...(messages as Array<{ role: 'user' | 'assistant'; content: string }>),
      ],
      temperature: 0.8,
      max_tokens: 250,
    }))

    const content = completion.choices[0]?.message?.content ?? ''

    if (generateAffirmations) {
      const match = content.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0]) as { reply: string; affirmations?: string[]; suggestedCategory?: string }
        const validCategory = parsed.suggestedCategory && CATEGORIES.includes(parsed.suggestedCategory)
          ? parsed.suggestedCategory
          : '나 자신'
        return NextResponse.json({ ...parsed, suggestedCategory: validCategory })
      }
      return NextResponse.json({
        reply: '성공의 말을 만들었어요!',
        affirmations: FALLBACK_AFFIRMATIONS,
        suggestedCategory: '나 자신',
      })
    }

    return NextResponse.json({ reply: content })
  } catch {
    return NextResponse.json({
      reply: '지금 당신의 이야기를 듣고 있어요.',
    })
  }
}
