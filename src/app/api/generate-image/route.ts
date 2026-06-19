import { NextRequest, NextResponse } from 'next/server'

interface FaceData {
  gender: string
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

function buildIdentityMatrix(fd: FaceData, scene: string): string {
  const eyeDesc = [fd.eyeShape, fd.eyeColor, fd.eyeSpacing]
    .filter((v) => v && v !== 'unknown').join(', ')

  const nosemouth = [
    fd.noseShape && fd.noseShape !== 'unknown' ? `${fd.noseShape} nose` : '',
    fd.lipShape && fd.lipShape !== 'unknown' ? `${fd.lipShape} lips` : '',
  ].filter(Boolean).join(', ')

  const structure = [
    fd.jawlineType && fd.jawlineType !== 'unknown' ? `${fd.jawlineType} jawline` : '',
    fd.cheekbonePosition && fd.cheekbonePosition !== 'unknown' ? `${fd.cheekbonePosition} cheekbones` : '',
  ].filter(Boolean).join(', ')

  const eyewearRule =
    fd.eyewear === 'glasses' ? 'MUST wear the exact same glasses. Never remove them.' :
    fd.eyewear === 'sunglasses' ? 'MUST wear the exact same sunglasses. Never remove them.' :
    'NO glasses or eyewear — do NOT add any.'

  const genderLabel = fd.gender === 'female' ? 'Female (woman)' : fd.gender === 'male' ? 'Male (man)' : 'unknown'

  return `[Identity Matrix: System Overwrite]
Character Name: [Ch_RegisteredFace]
Strict Rule: Maintain 100% facial consistency, bone structure, and identity of Ch_RegisteredFace. Do not distort the face.

[Facial Features Data]
- Gender: ${genderLabel} — CRITICAL: this person is ${fd.gender === 'female' ? 'a WOMAN. Generate female appearance only.' : fd.gender === 'male' ? 'a MAN. Generate male appearance only.' : 'of unspecified gender.'}
- Face Shape: ${fd.faceShape} face with ${structure || 'natural bone structure'}
- Eyes: ${eyeDesc || fd.eyeShape}
- Nose & Mouth: ${nosemouth || fd.generationPrompt}
- Skin Tone: ${fd.skinTone}
- Distinguishing Marks: ${fd.distinctiveFeatures && fd.distinctiveFeatures !== 'none' ? fd.distinctiveFeatures : 'none'}
- Eyewear: ${eyewearRule}
- Full description: ${fd.generationPrompt}

[Current Scene & Situation]
Ch_RegisteredFace is now in a scene that embodies: ${scene}
Ch_RegisteredFace is wearing appropriate attire for this success theme and making a genuinely joyful, warm, confident, deeply fulfilled expression — radiating positivity from within.
The art style must be Photorealistic with warm golden light.
Keep their current young appearance — do NOT age the face.

Maintain the exact same facial structure, identity, and features of Ch_RegisteredFace across this new setting.
The facial features, eye shape, nose structure, and skin tone must remain identical — only the background, clothing, and environment change.
NO TEXT OR LETTERS of any kind in the image.`
}

export async function POST(req: NextRequest) {
  try {
    const { affirmations, faceData, faceImageBase64, faceMaskBase64, profileImageBase64 } = await req.json() as {
      affirmations: string[]
      faceData?: FaceData
      faceImageBase64?: string   // "data:image/png;base64,..."
      faceMaskBase64?: string    // 얼굴 타원 = 불투명(보존), 나머지 = 투명(편집)
      profileImageBase64?: string // AI 생성 프로필 이미지 (마스크 없이 전체 편집)
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_key_here') {
      return NextResponse.json({ error: 'API 키가 설정되지 않았어요.' }, { status: 400 })
    }

    const { default: OpenAI, toFile } = await import('openai')
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const affText = affirmations.join(', ')
    let b64: string | null | undefined

    if (profileImageBase64) {
      // 프로필 이미지(지브리 캐릭터) 기반 성공 이미지 생성
      const base64Data = profileImageBase64.replace(/^data:image\/\w+;base64,/, '')
      const imageBuffer = Buffer.from(base64Data, 'base64')
      const imageFile = await toFile(imageBuffer, 'profile.png', { type: 'image/png' })

      const prompt = `Keep this character's appearance, face, style, and identity EXACTLY as shown.
Place them in a beautiful, inspiring success scene that visually embodies: ${affText}
The character is radiating genuine joy, deep fulfillment, confidence, and inner peace.
Maintain the exact same art style and visual aesthetic. Warm golden light, uplifting and heartwarming atmosphere.
The image must be deeply positive, encouraging, and filled with hope and warmth.
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
    } else if (faceImageBase64) {
      // 얼굴 사진 있음: gpt-image-1 이미지 편집
      const base64Data = faceImageBase64.replace(/^data:image\/\w+;base64,/, '')
      const imageBuffer = Buffer.from(base64Data, 'base64')
      const imageFile = await toFile(imageBuffer, 'face.png', { type: 'image/png' })

      // 마스크: 얼굴 타원 = 불투명(보존), 나머지 = 투명(편집)
      let maskFile: Awaited<ReturnType<typeof toFile>> | undefined
      if (faceMaskBase64) {
        const maskBase64Data = faceMaskBase64.replace(/^data:image\/\w+;base64,/, '')
        const maskBuffer = Buffer.from(maskBase64Data, 'base64')
        maskFile = await toFile(maskBuffer, 'mask.png', { type: 'image/png' })
      }

      const prompt = faceData
        ? buildIdentityMatrix(faceData, affText)
        : `Reproduce this person's appearance with absolute fidelity. Keep their current young appearance — do NOT age the face.
Place them in a beautiful, uplifting scene that visually embodies: ${affText}
The person radiates genuine joy, confidence, and deep fulfillment.
The image must be deeply positive, hopeful, and inspiring.
NO TEXT OR LETTERS. Style: warm golden light, photorealistic.`

      const editParams: Parameters<typeof openai.images.edit>[0] = {
        model: 'gpt-image-1',
        image: imageFile,
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'high',
      }
      if (maskFile) editParams.mask = maskFile

      const response = await openai.images.edit(editParams)
      b64 = response.data?.[0]?.b64_json
    } else if (faceData) {
      // 얼굴 데이터만 있음: Identity Matrix 텍스트 기반 생성
      const prompt = buildIdentityMatrix(faceData, affText)

      const response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'high',
      })
      b64 = response.data?.[0]?.b64_json
    } else {
      // 얼굴 정보 없음: 일반 생성
      const prompt = `A beautiful, heartwarming scene of a radiant, confident person whose face glows with genuine joy, fulfillment, and inner peace.
The scene visually embodies these positive themes: ${affText}
Surround them with symbolic elements and an environment that represents hope, growth, and success.
The person's warm, joyful expression radiates positivity and is the emotional heart of the image.
The atmosphere is deeply uplifting, encouraging, and filled with warmth and hope.
NO TEXT OR LETTERS of any kind in the image.
Style: warm golden light, painterly, Korean aesthetic sensibility, cinematic and deeply positive.`

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
