import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { affirmations, faceDescription } = await req.json() as {
      affirmations: string[]
      faceDescription?: string
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_key_here') {
      return NextResponse.json({ error: 'API 키가 설정되지 않았어요.' }, { status: 400 })
    }

    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const affText = affirmations.join(', ')
    const prompt = faceDescription
      ? `A photorealistic success portrait of a person with these exact facial features: ${faceDescription}.
The person looks confident, successful and radiant. Expression: warm, fulfilled smile.
Bright inspiring setting with soft bokeh background.
Context from personal affirmations: ${affText}
Style: warm golden light, professional photography quality, uplifting atmosphere, shallow depth of field.
DO NOT alter any facial features. Maintain exact face shape, eyes, nose, lips and skin tone as described.`
      : `An inspiring, warm, and uplifting illustration of a successful person radiating confidence and joy.
The scene embodies these affirmations: ${affText}
Style: warm golden light, painterly, positive and empowering atmosphere, soft bokeh background, Korean aesthetic sensibility.
The person looks happy, fulfilled, and successful. Watercolor and digital art mixed style. Warm golden tones.`

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    })

    const imageUrl = response.data?.[0]?.url
    if (!imageUrl) {
      return NextResponse.json({ error: '이미지 생성에 실패했어요.' }, { status: 500 })
    }

    const imageRes = await fetch(imageUrl)
    const buffer = await imageRes.arrayBuffer()
    const b64 = Buffer.from(buffer).toString('base64')

    return NextResponse.json({ url: `data:image/png;base64,${b64}` })
  } catch (err) {
    const msg = err instanceof Error ? err.message : '알 수 없는 오류'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
