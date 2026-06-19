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

      const prompt = `Preserve this person's face with absolute fidelity — identical facial structure, skin tone, eye shape, nose, lips, jawline, and hair.
Keep their current young appearance exactly as it is. Do NOT age the face — maintain their youthful look.
If the person wears glasses, keep the exact same glasses on their face.
The person's expression should be genuinely joyful, warm, confident, and deeply fulfilled — radiating positivity from within.
Place them in a meaningful scene that visually embodies these themes: ${affText}
The environment and surroundings should reflect those themes through symbolic objects and settings — no text, no words, no letters anywhere in the image.
Style: warm golden light, photorealistic, uplifting, rich with meaningful visual detail.
NO TEXT OR LETTERS of any kind in the image.`

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
Keep their young, current-age appearance — do NOT age the face at all.
The person's expression is genuinely joyful, warm, confident, and deeply fulfilled — radiating positivity.
Place them in a rich scene that visually embodies these themes: ${affText}
The environment and surroundings reflect those themes through symbolic objects and settings.
No text, no words, no letters anywhere in the image.
Style: warm golden light, professional photography quality, uplifting atmosphere.`
        : `An inspiring scene of a happy, radiant, confident person whose face glows with genuine joy and fulfillment.
The scene visually embodies these themes: ${affText}
Surround them with symbolic objects and environments that represent those themes.
The person's warm, positive expression is the emotional center of the image.
No text, no words, no letters anywhere in the image.
Style: warm golden light, painterly, Korean aesthetic sensibility, uplifting and deeply positive.`

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
