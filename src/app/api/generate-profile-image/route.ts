import { NextRequest, NextResponse } from 'next/server'

interface FaceData {
  gender: string
  faceShape: string
  eyeShape: string
  eyeColor: string
  eyeSpacing: string
  noseShape: string
  lipShape: string
  jawlineType: string
  cheekbonePosition: string
  skinTone: string
  distinctiveFeatures: string
  eyewear: string
  generationPrompt: string
}

export async function POST(req: NextRequest) {
  try {
    const { mode, faceImageBase64, faceData, text } = await req.json() as {
      mode: 'face+text' | 'face' | 'text'
      faceImageBase64?: string
      faceData?: FaceData
      text?: string
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_key_here') {
      return NextResponse.json({ error: 'API 키가 설정되지 않았어요.' }, { status: 400 })
    }

    const { default: OpenAI, toFile } = await import('openai')
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    let b64: string | null | undefined

    if (mode === 'text') {
      const prompt = `Create a beautiful, inspiring character illustration that captures the mood and feeling of: "${text ?? '긍정과 행복'}".
Studio Ghibli anime art style. Warm golden light, soft watercolor tones, magical atmosphere.
A person radiating joy, warmth, positivity, and inner peace.
Lush nature scene with soft sunlight.
NO TEXT OR LETTERS in the image.`

      const response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'medium',
      })
      b64 = response.data?.[0]?.b64_json
    } else if (faceImageBase64) {
      const base64Data = faceImageBase64.replace(/^data:image\/\w+;base64,/, '')
      const imageBuffer = Buffer.from(base64Data, 'base64')
      const imageFile = await toFile(imageBuffer, 'face.png', { type: 'image/png' })

      const genderLabel = faceData?.gender === 'female' ? 'woman' : faceData?.gender === 'male' ? 'man' : 'person'
      const faceDesc = faceData?.generationPrompt ?? `the ${genderLabel} in this photo`
      const eyewearRule =
        faceData?.eyewear === 'glasses' ? 'Keep their glasses exactly.' :
        faceData?.eyewear === 'sunglasses' ? 'Keep their sunglasses exactly.' :
        'No glasses or eyewear.'

      const moodLine = (mode === 'face+text' && text)
        ? `\nThe scene captures the mood and feeling of: "${text}".`
        : ''

      const prompt = `Transform this ${genderLabel} into a Studio Ghibli anime character.
Character reference: ${faceDesc}
CRITICAL: Maintain their face shape, eye shape, skin tone, and identity exactly. ${eyewearRule}${moodLine}
Place them in a warm, magical, uplifting nature scene filled with soft golden light.
Detailed Ghibli art style with soft watercolor tones.
The character radiates positivity, joy, and inner peace.
NO TEXT OR LETTERS in the image.`

      const response = await openai.images.edit({
        model: 'gpt-image-1',
        image: imageFile,
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'high',
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
