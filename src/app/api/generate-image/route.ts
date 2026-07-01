import { NextRequest, NextResponse } from 'next/server'
import { hasOpenRouterKey, withOpenRouter } from '@/lib/openrouter'

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

[Youth & Beauty Enhancement — MANDATORY]
CRITICAL: Render Ch_RegisteredFace as significantly younger and more beautiful/handsome than they appear in the source photo.
- Target appearance age: MAXIMUM 25 years old — do NOT exceed this under any circumstances
- Skin: completely smooth, flawless, radiant — zero wrinkles, zero age lines, zero spots
- Women: elegant beauty, luminous glowing skin, graceful refined features
- Men: sharp handsome features, strong jawline, vibrant charismatic energy
- Overall: their most ideal, attractive, confident version at peak youth
This is a visualization of their ideal successful future self — youthful transformation is intentional and essential.

[Current Scene & Situation]
Ch_RegisteredFace is now in a scene that embodies: ${scene}
Ch_RegisteredFace is wearing appropriate attire for this success theme and making a genuinely joyful, warm, confident, deeply fulfilled expression — radiating positivity from within.
The art style must be Photorealistic with warm golden light.

Maintain the exact same facial structure, identity, and features of Ch_RegisteredFace across this new setting.
The facial features, eye shape, nose structure, and skin tone must remain identical — only the background, clothing, and environment change.
NO TEXT OR LETTERS of any kind in the image.`
}

type ImagePart = { type?: string; image_url?: { url?: string }; text?: string }

async function resolveUrl(url: string): Promise<string> {
  if (url.startsWith('data:image/')) return url
  if (url.startsWith('https://')) {
    const res = await fetch(url)
    const buf = await res.arrayBuffer()
    const b64 = Buffer.from(buf).toString('base64')
    const mime = res.headers.get('content-type') ?? 'image/png'
    return `data:${mime};base64,${b64}`
  }
  return url
}

async function extractImageDataUrl(message: Record<string, unknown>): Promise<string | null> {
  const content = message?.content
  const images = message?.images as ImagePart[] | undefined

  // OpenRouter Gemini: 이미지가 message.images 배열에 반환됨
  if (Array.isArray(images)) {
    for (const part of images) {
      if (part?.type === 'image_url' && part.image_url?.url) return resolveUrl(part.image_url.url)
    }
  }

  // content가 문자열인 경우
  if (typeof content === 'string') {
    if (content.startsWith('data:image/') || content.startsWith('https://')) return resolveUrl(content)
  }

  // content가 배열인 경우
  if (Array.isArray(content)) {
    for (const part of content as ImagePart[]) {
      if (part?.type === 'image_url' && part.image_url?.url) return resolveUrl(part.image_url.url)
      if (part?.type === 'text' && part.text?.startsWith('data:image/')) return part.text
    }
  }

  return null
}

export async function POST(req: NextRequest) {
  try {
    const { affirmations, faceData, faceImageBase64, profileImageBase64, profileDescription, imageStyle } = await req.json() as {
      affirmations: string[]
      faceData?: FaceData
      faceImageBase64?: string
      faceMaskBase64?: string
      profileImageBase64?: string
      profileDescription?: string
      imageStyle?: 'cartoon' | 'realistic'
    }

    if (!hasOpenRouterKey()) {
      return NextResponse.json({ error: 'API 키가 설정되지 않았어요.' }, { status: 400 })
    }

    const affText = affirmations.join(', ')
    const sceneContext = [affText, profileDescription].filter(Boolean).join('. Personal vision: ')
    let imageDataUrl: string | null = null

    if (profileImageBase64) {
      const rules = `[SYSTEM OVERRIDE — HIGHEST PRIORITY RULES — FOLLOW EXACTLY]

━━━ RULE 1: GENDER (ABSOLUTE — NO EXCEPTIONS) ━━━
Study the person's face and body carefully.
• If the photo shows a WOMAN → you MUST generate a beautiful WOMAN. Never make her look male.
• If the photo shows a MAN → you MUST generate a handsome MAN. Never make him look female.
Generating the wrong gender is a critical failure. Prioritize gender correctness above all else.

━━━ RULE 2: AGE (HARD MAXIMUM — NO EXCEPTIONS) ━━━
Estimate the person's apparent age from the photo:
• Appears 40 or older → MAXIMUM 28 years old in output (smooth youthful face, no age signs)
• Appears 30–39 → MAXIMUM 25 years old in output
• Appears 20–29 → MAXIMUM 20 years old in output
• Appears 19 or younger → keep actual age
The output face MUST have flawless smooth skin, zero wrinkles, zero age lines.
If unsure → go YOUNGER. Never render older than the limit above.

━━━ RULE 3: BEAUTY (MANDATORY ENHANCEMENT) ━━━
Render this person as the most attractive, radiant version of themselves:
• Preserve their unique facial identity, bone structure, and hair color
• Enhance: luminous skin, bright eyes, healthy vibrant hair, confident posture
• Women → elegant, beautiful, graceful. Men → handsome, strong, charismatic.
• Expression: genuine joy, deep confidence, inner peace — they have achieved everything.

ALL THREE RULES are mandatory. Apply them before writing anything else.

`
      const prompt = imageStyle === 'cartoon'
        ? `${rules}Transform this person into a warm anime/illustration style character (Studio Ghibli style), preserving their facial features, hair color, and identity.

[SUCCESS SCENE — THIS IS THE HEART OF THE IMAGE]
Their affirmations: ${sceneContext}
Read each affirmation carefully and translate it into a vivid, specific visual moment:
• Health/fitness affirmation → show them running freely in golden sunlight, vibrant and energetic
• Wealth/abundance affirmation → surround them with a beautiful flourishing environment, elegant lifestyle
• Career/achievement affirmation → capture a peak moment of recognition and accomplishment
• Relationship/love affirmation → warm connection, joy, belonging
• Inner peace/happiness → serene radiant smile, glowing aura of fulfillment
The scene should feel like a REAL moment — not a pose, not a symbol — but an actual lived second in their dream life.
Every element in the background must reinforce that their affirmations have come true.

Art style: Studio Ghibli anime — warm golden light, painterly brushwork, deeply emotional and heartwarming.
NO TEXT OR LETTERS in the image.
FINAL CHECK: correct gender ✓ under age limit ✓ beautiful/handsome ✓ success scene vivid ✓`
        : `${rules}Preserve this person's facial bone structure, identity, hair color, and distinctive features exactly.

[SUCCESS SCENE — THIS IS THE HEART OF THE IMAGE]
Their affirmations: ${sceneContext}
Read each affirmation and build a powerful, cinematic scene around them:
• What does their life look like NOW that these affirmations are all true?
• Where are they? What have they achieved? What surrounds them?
• Capture ONE powerful moment: the look in their eyes, the environment they inhabit, the energy they radiate
• Let the setting tell the story — every detail of the scene proves their success is real
The image should feel like a cinematic still from the best day of their life.

Style: Photorealistic, warm golden cinematic light, shallow depth of field.
Expression: genuine triumph, deep fulfillment, quiet confidence — success feels natural to them now.
NO TEXT OR LETTERS in the image.
FINAL CHECK: correct gender ✓ under age limit ✓ beautiful/handsome ✓ success scene vivid ✓`

      const response = await withOpenRouter((openai) => openai.chat.completions.create({
        model: 'google/gemini-2.5-flash-image',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: profileImageBase64 } },
          ],
        }],
      }))
      imageDataUrl = await extractImageDataUrl(response.choices[0]?.message as unknown as Record<string, unknown>)
    } else if (faceImageBase64) {
      const prompt = faceData
        ? buildIdentityMatrix(faceData, sceneContext)
        : `Render this person as a significantly younger and more beautiful version of themselves — target appearance age: 20–28 years old. Smooth flawless skin, youthful facial volume, radiant glow, and peak attractiveness. Preserve their facial identity, bone structure, and distinctive features.
Place them in a beautiful, uplifting scene that visually embodies: ${sceneContext}
The person radiates genuine joy, confidence, and deep fulfillment.
The image must be deeply positive, hopeful, and inspiring.
NO TEXT OR LETTERS. Style: warm golden light, photorealistic.`

      const response = await withOpenRouter((openai) => openai.chat.completions.create({
        model: 'google/gemini-2.5-flash-image',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: faceImageBase64 } },
          ],
        }],
      }))
      imageDataUrl = await extractImageDataUrl(response.choices[0]?.message as unknown as Record<string, unknown>)
    } else if (faceData) {
      const prompt = buildIdentityMatrix(faceData, sceneContext)
      const response = await withOpenRouter((openai) => openai.chat.completions.create({
        model: 'google/gemini-2.5-flash-image',
        messages: [{ role: 'user', content: prompt }],
      }))
      imageDataUrl = await extractImageDataUrl(response.choices[0]?.message as unknown as Record<string, unknown>)
    } else {
      const prompt = `A beautiful, heartwarming scene of a radiant, youthful person in their mid-20s — glowing skin, vibrant energy, peak attractiveness — whose face shines with genuine joy, fulfillment, and inner peace.
The scene visually embodies these positive themes: ${sceneContext}
Surround them with symbolic elements and an environment that represents hope, growth, and success.
The person's warm, joyful expression radiates positivity and is the emotional heart of the image.
The atmosphere is deeply uplifting, encouraging, and filled with warmth and hope.
NO TEXT OR LETTERS of any kind in the image.
Style: warm golden light, painterly, Korean aesthetic sensibility, cinematic and deeply positive.`

      const response = await withOpenRouter((openai) => openai.chat.completions.create({
        model: 'google/gemini-2.5-flash-image',
        messages: [{ role: 'user', content: prompt }],
      }))
      imageDataUrl = await extractImageDataUrl(response.choices[0]?.message as unknown as Record<string, unknown>)
    }

    if (!imageDataUrl) {
      return NextResponse.json({ error: '이미지 생성에 실패했어요.' }, { status: 500 })
    }

    return NextResponse.json({ url: imageDataUrl })
  } catch (err) {
    const msg = err instanceof Error ? err.message : '알 수 없는 오류'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
