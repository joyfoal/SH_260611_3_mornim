import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { affirmations, faceDescription, faceImageBase64 } = await req.json() as {
      affirmations: string[]
      faceDescription?: string
      faceImageBase64?: string   // "data:image/png;base64,..."
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_key_here') {
      return NextResponse.json({ error: 'API 키가 설정되지 않았어요.' }, { status: 400 })
    }

    const { default: OpenAI, toFile } = await import('openai')
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const affText = affirmations.join(', ')
    let b64: string | null | undefined

    if (faceImageBase64) {
      // 얼굴 사진 있음: gpt-image-1 이미지 편집 (원본 얼굴 유지)
      const base64Data = faceImageBase64.replace(/^data:image\/\w+;base64,/, '')
      const imageBuffer = Buffer.from(base64Data, 'base64')
      const imageFile = await toFile(imageBuffer, 'face.png', { type: 'image/png' })

      const prompt = `Keep this person's exact face, facial features, skin tone, and hair completely unchanged.
Transform the setting into a bright, inspiring professional environment with warm golden light.
Make them look confident, successful, and radiant with a warm fulfilled smile.
Change their clothing to professional, elegant attire.
Add a soft bokeh background that feels uplifting and aspirational.
Context from their personal affirmations: ${affText}`

      const response = await openai.images.edit({
        model: 'gpt-image-1',
        image: imageFile,
        prompt,
        n: 1,
        size: '1024x1024',
      })
      b64 = response.data?.[0]?.b64_json
    } else {
      // 얼굴 없음: gpt-image-1 텍스트 기반 생성
      const prompt = faceDescription
        ? `A photorealistic success portrait of a person with these exact facial features: ${faceDescription}.
The person looks confident, successful and radiant. Expression: warm, fulfilled smile.
Bright inspiring setting with soft bokeh background.
Context from personal affirmations: ${affText}
Style: warm golden light, professional photography quality, uplifting atmosphere.`
        : `An inspiring, warm, and uplifting illustration of a successful person radiating confidence and joy.
The scene embodies these affirmations: ${affText}
Style: warm golden light, painterly, positive and empowering atmosphere, soft bokeh background, Korean aesthetic sensibility.
The person looks happy, fulfilled, and successful. Watercolor and digital art mixed style. Warm golden tones.`

      const response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'medium',
      })
      b64 = response.data?.[0]?.b64_json
    }

    if (!b64) {
      return NextResponse.json({ error: '이미지 생성에 실패했어요.' }, { status: 500 })
    }

    return NextResponse.json({ url: `data:image/png;base64,${b64}` })
  } catch (err) {
    const msg = err instanceof Error ? err.message : '알 수 없는 오류'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
