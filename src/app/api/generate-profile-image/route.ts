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
    const { mode, imageStyle, faceImageBase64, faceData, text } = await req.json() as {
      mode: 'face+text' | 'face' | 'text'
      imageStyle?: 'ghibli' | 'realistic'
      faceImageBase64?: string
      faceData?: FaceData
      text?: string
    }
    const style = imageStyle ?? 'ghibli'

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_key_here') {
      return NextResponse.json({ error: 'API 키가 설정되지 않았어요.' }, { status: 400 })
    }

    const { default: OpenAI, toFile } = await import('openai')
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    let b64: string | null | undefined

    if (mode === 'text') {
      const mood = text?.trim() ?? ''
      const hasText = mood.length > 0

      const prompt = style === 'realistic'
        ? `Create a high-quality photorealistic image of a confident, radiant person${hasText ? ` in a scene that captures the feeling of: "${mood}"` : ' standing in a bright, uplifting environment'}.
Cinematic composition, warm natural lighting, professional DSLR photography quality.
The person's expression shows genuine joy, inner strength, and deep fulfillment.
Soft background bokeh, detailed textures, vibrant yet natural colors.
The overall atmosphere is deeply positive, hopeful, and inspiring — like a motivational life image.
NO TEXT OR LETTERS in the image.`
        : hasText
        ? `Create an illustration where the art style, color palette, and visual atmosphere are entirely shaped by this mood: "${mood}".
IMPORTANT: Do NOT use Studio Ghibli style. Choose the illustration or cartoon style that best matches this specific mood — the mood defines the style.
For example: a cyberpunk mood → neon-lit urban cartoon; a dreamy pastel mood → soft watercolor illustration; a bold energetic mood → vibrant comic style.
A joyful character who embodies this mood, radiating positivity and inner strength.
The image is deeply positive, uplifting, and inspiring. Style and colors follow the mood.
NO TEXT OR LETTERS in the image.`
        : `Create a beautiful Studio Ghibli anime character illustration.
Classic Ghibli aesthetic: soft watercolor tones, warm golden sunlight, gentle breeze, enchanting nature scene.
A cheerful person with a peaceful, joyful smile surrounded by cherry blossoms, lush green trees, and soft light.
The scene radiates warmth, hope, and deep positivity — a heartwarming and uplifting image.
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
      const moodLine = (mode === 'face+text' && text?.trim())
        ? `\nThe scene captures the mood and feeling of: "${text.trim()}".`
        : ''

      const prompt = style === 'realistic'
        ? `Create a stunning photorealistic portrait of this ${genderLabel}.
Character reference: ${faceDesc}
CRITICAL: Preserve their exact facial features, face shape, eye shape, skin tone, and identity. ${eyewearRule}${moodLine}
Warm golden natural light, cinematic composition, professional photography quality.
Their expression radiates genuine joy, confidence, deep fulfillment, and radiant positive energy.
The image is uplifting, beautiful, and deeply inspiring.
NO TEXT OR LETTERS in the image.`
        : `Transform this ${genderLabel} into a Studio Ghibli anime character with their exact facial features preserved.
Character reference: ${faceDesc}
CRITICAL: Maintain their face shape, eye shape, skin tone, and identity exactly. ${eyewearRule}${moodLine}
Beautiful magical Ghibli world: warm golden sunlight filtering through trees, cherry blossoms, soft watercolor tones.
The character radiates joy, warmth, positivity, and hope — a deeply uplifting and heartwarming scene.
NO TEXT OR LETTERS in the image.`

      const response = await openai.images.edit({
        model: 'gpt-image-1',
        image: imageFile,
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
