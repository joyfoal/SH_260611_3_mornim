import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json() as { imageBase64: string }

    if (!imageBase64) {
      return NextResponse.json({ error: '이미지가 없어요.' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_key_here') {
      return NextResponse.json({ error: 'API 키가 설정되지 않았어요.' }, { status: 400 })
    }

    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a face analysis expert. Analyze the face in the photo and return ONLY a valid JSON object — no markdown, no explanation, no code fences — with exactly these 12 fields:
{
  "faceShape": "oval|round|square|heart|diamond|oblong",
  "eyeShape": "almond|round|hooded|monolid|upturned|downturned",
  "eyeColor": "descriptive color string (e.g. dark brown, black, hazel)",
  "eyeSpacing": "close-set|average|wide-set",
  "noseShape": "straight|button|wide|narrow|prominent|snubbed",
  "lipShape": "full|thin|bow-shaped|wide|narrow",
  "jawlineType": "defined|soft|angular|rounded|square",
  "cheekbonePosition": "high|average|low",
  "skinTone": "light warm|light cool|medium warm|medium cool|olive|tan|deep warm|deep cool",
  "distinctiveFeatures": "comma-separated notable features or none",
  "eyewear": "glasses|sunglasses|none",
  "generationPrompt": "a person with [all above features described naturally in one English sentence, including eyewear if present]"
}
If no face is visible in the photo, return: {"error": "no face detected"}`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageBase64, detail: 'low' },
            },
            {
              type: 'text',
              text: 'Analyze this face and return the JSON.',
            },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 400,
    })

    const content = completion.choices[0]?.message?.content ?? ''
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) {
      return NextResponse.json({ error: '얼굴을 찾을 수 없어요. 얼굴이 잘 보이는 정면 사진을 사용해 주세요.' }, { status: 500 })
    }

    const parsed = JSON.parse(match[0]) as Record<string, string>

    if (parsed.error) {
      return NextResponse.json({ error: '얼굴을 찾을 수 없어요. 얼굴이 잘 보이는 정면 사진을 사용해 주세요.' }, { status: 400 })
    }

    if (!parsed.generationPrompt) {
      return NextResponse.json({ error: '얼굴 분석 결과를 읽을 수 없어요.' }, { status: 500 })
    }

    return NextResponse.json({
      faceData: {
        faceShape: parsed.faceShape ?? '',
        eyeShape: parsed.eyeShape ?? '',
        eyeColor: parsed.eyeColor ?? '',
        eyeSpacing: parsed.eyeSpacing ?? '',
        noseShape: parsed.noseShape ?? '',
        lipShape: parsed.lipShape ?? '',
        jawlineType: parsed.jawlineType ?? '',
        cheekbonePosition: parsed.cheekbonePosition ?? '',
        skinTone: parsed.skinTone ?? '',
        distinctiveFeatures: parsed.distinctiveFeatures ?? 'none',
        eyewear: parsed.eyewear ?? 'none',
        generationPrompt: parsed.generationPrompt,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : '알 수 없는 오류'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
