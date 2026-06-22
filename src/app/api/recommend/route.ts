import { NextRequest, NextResponse } from 'next/server'

const CATEGORY_FALLBACKS: Record<string, string[]> = {
  '나 자신': [
    '나는 나를 있는 그대로 사랑한다',
    '나는 충분히 가치 있는 사람이다',
    '나는 매일 더 나다운 삶을 살아가고 있다',
  ],
  '일과 커리어': [
    '나는 내 일에서 의미와 보람을 찾는다',
    '나는 나의 재능과 능력을 충분히 발휘하고 있다',
    '나는 원하는 일을 하며 성공하고 있다',
  ],
  '돈과 풍요': [
    '나는 풍요로운 삶을 누릴 자격이 있다',
    '돈은 내 삶에 자연스럽게 흘러들어온다',
    '나는 경제적 자유를 향해 나아가고 있다',
  ],
  '관계와 사랑': [
    '나는 진심으로 사랑하고 사랑받는 사람이다',
    '나는 따뜻하고 깊은 관계를 만들어간다',
    '내 주변에는 나를 응원하는 사람들이 있다',
  ],
  '건강과 몸': [
    '나는 매일 건강하고 활기찬 에너지로 가득하다',
    '내 몸은 나를 위해 최선을 다하고 있다',
    '나는 나의 몸을 소중히 돌보고 있다',
  ],
  '용기와 도전': [
    '나는 두려움을 넘어 한 발씩 나아갈 수 있다',
    '나는 새로운 도전 앞에서 더 강해진다',
    '나는 실패해도 다시 일어나는 힘이 있다',
  ],
}

const DEFAULT_FALLBACKS = [
  '나는 오늘도 충분히 잘하고 있다',
  '나는 내가 하는 일에서 가치를 만든다',
  '나는 두려워도 한 발 내딛을 수 있다',
]

export async function POST(req: NextRequest) {
  let category: string | undefined
  try {
    const body = await req.json() as { prompt?: string; category?: string }
    const { prompt } = body
    category = body.category

    const fallback = (category && CATEGORY_FALLBACKS[category]) ?? DEFAULT_FALLBACKS

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_key_here') {
      return NextResponse.json({ affirmations: fallback })
    }

    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const categoryPart = category ? ` 카테고리: ${category}.` : ''
    const userMessage = `${prompt || ''}${categoryPart} 한국어 긍정 확언 5개를 JSON 배열로만 응답하세요. 예: ["확언1","확언2","확언3","확언4","확언5"]`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            '당신은 긍정 확언 전문가입니다. 사용자의 고민이나 감정에 맞는 한국어 긍정 확언을 생성하세요. 확언은 반드시 현재형, 1인칭(\'나는...\')으로 작성하세요. JSON 배열 형식으로만 응답하세요.',
        },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.8,
    })

    const content = completion.choices[0]?.message?.content ?? ''
    const match = content.match(/\[[\s\S]*\]/)
    if (!match) {
      return NextResponse.json({ affirmations: fallback })
    }
    const parsed: unknown = JSON.parse(match[0])
    const affirmations =
      Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')
        ? (parsed as string[])
        : fallback
    return NextResponse.json({ affirmations })
  } catch {
    const fallback = (category && CATEGORY_FALLBACKS[category]) ?? DEFAULT_FALLBACKS
    return NextResponse.json({ affirmations: fallback })
  }
}
