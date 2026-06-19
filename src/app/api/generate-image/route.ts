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

      const prompt = `Keep this person's exact face, facial features, skin tone, hair, and any glasses completely unchanged.
Create a rich scene that visually tells the story of these affirmations: ${affText}
The environment, objects, and setting should symbolize and represent the themes of these affirmations.
Include meaningful visual elements: relevant objects, environments, achievements, or situations that embody the affirmations.
The person looks confident, radiant, and fulfilled — surrounded by a world that reflects their affirmations becoming real.
Style: warm golden light, uplifting, rich with meaningful detail, professional quality.`

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
        ? `A photorealistic portrait of a person with these exact facial features: ${faceDescription}.
Create a rich visual scene that tells the story of these affirmations: ${affText}
The setting, objects, and environment should symbolize and embody the themes of the affirmations.
Include meaningful visual elements — relevant achievements, objects, or environments that represent the affirmations.
The person looks confident, successful and radiant with a warm fulfilled smile.
Style: warm golden light, professional photography quality, uplifting and meaningful atmosphere.`
        : `An inspiring illustrated scene that tells the visual story of these affirmations: ${affText}
Show a successful person AND the rich world their affirmations have created around them.
Include symbolic objects, environments, achievements, and meaningful visual elements that embody: ${affText}
Do not just show a person — show their story, their world, their success made visible.
Style: warm golden light, painterly, Korean aesthetic sensibility, rich with meaningful detail, uplifting and empowering.`

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
