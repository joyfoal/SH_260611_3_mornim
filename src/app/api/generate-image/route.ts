import { NextRequest, NextResponse } from 'next/server'

interface FaceData {
  faceShape: string
  faceAngle: string
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

function buildFaceRules(fd: FaceData): string {
  const rules: string[] = []

  rules.push(`Face shape: ${fd.faceShape} — preserve exactly.`)

  if (fd.eyeShape && fd.eyeShape !== 'unknown')
    rules.push(`Eyes: ${fd.eyeShape} shape, ${fd.eyeColor}, ${fd.eyeSpacing} — preserve exactly.`)

  if (fd.noseShape && fd.noseShape !== 'unknown')
    rules.push(`Nose: ${fd.noseShape} — preserve exactly.`)

  if (fd.lipShape && fd.lipShape !== 'unknown')
    rules.push(`Lips: ${fd.lipShape} — preserve exactly.`)

  if (fd.jawlineType && fd.jawlineType !== 'unknown')
    rules.push(`Jawline: ${fd.jawlineType} — preserve exactly.`)

  if (fd.cheekbonePosition && fd.cheekbonePosition !== 'unknown')
    rules.push(`Cheekbones: ${fd.cheekbonePosition} — preserve exactly.`)

  rules.push(`Skin tone: ${fd.skinTone} — preserve exactly.`)

  if (fd.distinctiveFeatures && fd.distinctiveFeatures !== 'none')
    rules.push(`Distinctive features (${fd.distinctiveFeatures}) — preserve exactly.`)

  if (fd.eyewear === 'glasses')
    rules.push(`EYEWEAR: This person IS wearing glasses — MUST keep the exact same glasses. Never remove them.`)
  else if (fd.eyewear === 'sunglasses')
    rules.push(`EYEWEAR: This person IS wearing sunglasses — MUST keep the exact same sunglasses. Never remove them.`)
  else if (fd.eyewear === 'none')
    rules.push(`EYEWEAR: This person has NO glasses or eyewear — do NOT add any glasses or eyewear.`)

  return rules.map((r) => `• ${r}`).join('\n')
}

export async function POST(req: NextRequest) {
  try {
    const { affirmations, faceData, faceImageBase64 } = await req.json() as {
      affirmations: string[]
      faceData?: FaceData
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
      // 얼굴 사진 있음: gpt-image-1 이미지 편집
      const base64Data = faceImageBase64.replace(/^data:image\/\w+;base64,/, '')
      const imageBuffer = Buffer.from(base64Data, 'base64')
      const imageFile = await toFile(imageBuffer, 'face.png', { type: 'image/png' })

      const faceRules = faceData ? buildFaceRules(faceData) : ''

      const prompt = `Reproduce this person's appearance with absolute fidelity. The following features MUST be preserved exactly as in the registered photo:
${faceRules}

Keep their current young appearance — do NOT age the face.
The person's expression should be genuinely joyful, warm, confident, and deeply fulfilled — radiating positivity from within.
Place them in a meaningful scene that visually embodies these themes: ${affText}
The environment and surroundings should reflect those themes through symbolic objects and settings.
NO TEXT OR LETTERS of any kind in the image.
Style: warm golden light, photorealistic, uplifting, rich with meaningful visual detail.`

      const response = await openai.images.edit({
        model: 'gpt-image-1',
        image: imageFile,
        prompt,
        n: 1,
        size: '1024x1024',
      })
      b64 = response.data?.[0]?.b64_json
    } else if (faceData) {
      // 얼굴 데이터만 있음: 텍스트 기반 생성
      const faceRules = buildFaceRules(faceData)

      const prompt = `A photorealistic portrait. The person MUST have these exact features — preserve all of them:
${faceRules}
Full face description: ${faceData.generationPrompt}

Keep their current young appearance — do NOT age the face.
The person's expression is genuinely joyful, warm, confident, and deeply fulfilled — radiating positivity.
Place them in a rich scene that visually embodies these themes: ${affText}
The environment and surroundings reflect those themes through symbolic objects and settings.
NO TEXT OR LETTERS of any kind in the image.
Style: warm golden light, professional photography quality, uplifting atmosphere.`

      const response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'medium',
      })
      b64 = response.data?.[0]?.b64_json
    } else {
      // 얼굴 정보 없음: 일반 생성
      const prompt = `An inspiring scene of a happy, radiant, confident person whose face glows with genuine joy and fulfillment.
The scene visually embodies these themes: ${affText}
Surround them with symbolic objects and environments that represent those themes.
The person's warm, positive expression is the emotional center of the image.
NO TEXT OR LETTERS of any kind in the image.
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
