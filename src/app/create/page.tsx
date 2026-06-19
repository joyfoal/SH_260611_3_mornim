'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/ui/AppLayout'
import { ArrowLeft } from 'lucide-react'
import type { CategoryName } from '@/lib/categories'
import { saveAffirmation, getCategories, type AffirmationCategory } from '@/lib/storage'

type Tab = '직접 입력' | 'AI 추천' | 'Talk Mode'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export default function CreatePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('직접 입력')
  const [categories, setCategories] = useState<string[]>([])
  const chatBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCategories(getCategories())
  }, [])

  // Direct input state
  const [directText, setDirectText] = useState('')
  const [directCategory, setDirectCategory] = useState<CategoryName | null>(null)
  const [directSaving, setDirectSaving] = useState(false)
  const [negativeBanner, setNegativeBanner] = useState<{ alternative: string } | null>(null)
  const [savedMsg, setSavedMsg] = useState('')

  // AI recommend state
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiCategory, setAiCategory] = useState<CategoryName | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResults, setAiResults] = useState<string[]>([])

  // Talk mode state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatAffirmations, setChatAffirmations] = useState<string[]>([])

  const handleDirectSave = async (textToSave?: string) => {
    const text = textToSave ?? directText
    if (!text.trim() || !directCategory) return
    setDirectSaving(true)
    try {
      const res = await fetch('/api/detect-negative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json() as { isNegative: boolean; alternative: string | null }
      if (data.isNegative && data.alternative) {
        setNegativeBanner({ alternative: data.alternative })
        setDirectSaving(false)
        return
      }
    } catch {
      // proceed without check
    }
    doSave(text, directCategory)
    setDirectSaving(false)
  }

  const doSave = (text: string, category: CategoryName) => {
    saveAffirmation({
      id: `aff-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text,
      category: category as AffirmationCategory,
      createdAt: new Date().toISOString(),
      completedDates: [],
    })
    setDirectText('')
    setNegativeBanner(null)
    setSavedMsg('저장되었어요!')
    setTimeout(() => setSavedMsg(''), 2000)
  }

  const handleAIRecommend = async () => {
    if (!aiPrompt.trim()) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, category: aiCategory }),
      })
      const data = await res.json() as { affirmations: string[] }
      setAiResults(data.affirmations)
    } catch {
      //
    }
    setAiLoading(false)
  }

  const handleAISave = (text: string) => {
    if (!aiCategory && !directCategory) {
      const cat = '나 자신' as CategoryName
      saveAffirmation({
        id: `aff-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        text,
        category: cat as AffirmationCategory,
        createdAt: new Date().toISOString(),
        completedDates: [],
      })
    } else {
      saveAffirmation({
        id: `aff-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        text,
        category: (aiCategory ?? '나 자신') as AffirmationCategory,
        createdAt: new Date().toISOString(),
        completedDates: [],
      })
    }
    setSavedMsg('저장되었어요!')
    setTimeout(() => setSavedMsg(''), 2000)
  }

  const handleChatSend = async () => {
    if (!chatInput.trim()) return
    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: chatInput }]
    setChatMessages(newMessages)
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await fetch('/api/talk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, generateAffirmations: false }),
      })
      const data = await res.json() as { reply: string; affirmations?: string[] }
      setChatMessages([...newMessages, { role: 'assistant', content: data.reply }])
    } catch {
      setChatMessages([
        ...newMessages,
        { role: 'assistant', content: '죄송해요, 잠시 후 다시 시도해주세요.' },
      ])
    }
    setChatLoading(false)
  }

  const handleGenerateAffirmations = async () => {
    if (chatMessages.length === 0) return
    setChatLoading(true)
    try {
      const res = await fetch('/api/talk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatMessages, generateAffirmations: true }),
      })
      const data = await res.json() as { reply: string; affirmations?: string[] }
      if (data.reply) {
        setChatMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
      }
      if (data.affirmations) {
        setChatAffirmations(data.affirmations)
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    } catch {
      //
    }
    setChatLoading(false)
  }

  return (
    <AppLayout activeTab="성공의 말">
      <div style={{ padding: '20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <button
            onClick={() => router.push('/affirmations')}
            style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={16} color="var(--color-text-primary)" />
          </button>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            성공의 말 만들기
          </h1>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 mb-6"
          style={{
            background: 'var(--color-bg-card)',
            borderRadius: '12px',
            padding: '4px',
          }}
        >
          {(['직접 입력', 'AI 추천', 'Talk Mode'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '8px 4px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                background: activeTab === tab ? 'var(--color-accent-primary)' : 'transparent',
                color: activeTab === tab ? 'white' : 'var(--color-text-muted)',
                transition: 'all 0.2s ease',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {savedMsg && (
          <div
            style={{
              padding: '12px',
              background: '#E8F5E9',
              borderRadius: '10px',
              color: '#2E7D32',
              fontSize: '14px',
              marginBottom: '12px',
              textAlign: 'center',
            }}
          >
            {savedMsg}
          </div>
        )}

        {/* Direct input tab */}
        {activeTab === '직접 입력' && (
          <div>
            <textarea
              value={directText}
              onChange={(e) => setDirectText(e.target.value)}
              placeholder="나는 오늘도 충분히 잘하고 있다"
              rows={3}
              style={{
                width: '100%',
                padding: '14px',
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                fontSize: '15px',
                color: 'var(--color-text-primary)',
                resize: 'none',
                outline: 'none',
                marginBottom: '16px',
                lineHeight: 1.6,
              }}
            />

            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
              카테고리
            </p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setDirectCategory(cat)}
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    border: directCategory === cat
                      ? '2px solid var(--color-accent-primary)'
                      : '1px solid var(--color-border)',
                    background: directCategory === cat
                      ? 'var(--color-bg-card)'
                      : 'transparent',
                    color: directCategory === cat
                      ? 'var(--color-accent-primary)'
                      : 'var(--color-text-muted)',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {negativeBanner && (
              <div
                style={{
                  padding: '14px',
                  background: '#FFF3CD',
                  borderRadius: '12px',
                  marginBottom: '16px',
                  border: '1px solid #FFE082',
                }}
              >
                <p style={{ fontSize: '13px', color: '#795548', marginBottom: '8px' }}>
                  부정적인 표현이 감지되었어요. 이 버전은 어떨까요?
                </p>
                <p style={{ fontSize: '15px', color: '#4E342E', fontWeight: 500, marginBottom: '12px' }}>
                  {negativeBanner.alternative}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (directCategory) doSave(negativeBanner.alternative, directCategory)
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'var(--color-accent-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    바꿔서 저장
                  </button>
                  <button
                    onClick={() => {
                      if (directCategory) doSave(directText, directCategory)
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'var(--color-bg-card)',
                      color: 'var(--color-text-muted)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '10px',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    그대로 저장
                  </button>
                </div>
              </div>
            )}

            {(!directText.trim() || !directCategory) && (
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px', textAlign: 'center' }}>
                {!directText.trim() ? '성공의 말을 입력해주세요' : '카테고리를 선택해주세요'}
              </p>
            )}
            <button
              onClick={() => handleDirectSave()}
              disabled={!directText.trim() || !directCategory || directSaving}
              style={{
                width: '100%',
                padding: '14px',
                background: directText.trim() && directCategory ? 'var(--color-accent-primary)' : 'var(--color-border)',
                color: directText.trim() && directCategory ? 'white' : 'var(--color-text-muted)',
                border: 'none',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: directText.trim() && directCategory ? 'pointer' : 'not-allowed',
                opacity: directText.trim() && directCategory ? 1 : 0.6,
              }}
            >
              {directSaving ? '확인 중...' : '저장하기'}
            </button>
          </div>
        )}

        {/* AI recommend tab */}
        {activeTab === 'AI 추천' && (
          <div>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="어떤 고민이나 감정을 담고 싶으신가요?"
              rows={3}
              style={{
                width: '100%',
                padding: '14px',
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                fontSize: '15px',
                color: 'var(--color-text-primary)',
                resize: 'none',
                outline: 'none',
                marginBottom: '16px',
              }}
            />

            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setAiCategory(aiCategory === cat ? null : cat)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: aiCategory === cat
                      ? '1px solid var(--color-accent-primary)'
                      : '1px solid var(--color-border)',
                    background: aiCategory === cat
                      ? 'var(--color-accent-light)'
                      : 'transparent',
                    color: aiCategory === cat
                      ? 'var(--color-accent-primary)'
                      : 'var(--color-text-muted)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <button
              onClick={handleAIRecommend}
              disabled={!aiPrompt.trim() || aiLoading}
              style={{
                width: '100%',
                padding: '14px',
                background: aiPrompt.trim() ? 'var(--color-accent-primary)' : 'var(--color-bg-card)',
                color: aiPrompt.trim() ? 'white' : 'var(--color-text-muted)',
                border: 'none',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: aiPrompt.trim() ? 'pointer' : 'not-allowed',
                marginBottom: '20px',
              }}
            >
              {aiLoading ? '추천 중...' : '성공의 말 추천받기'}
            </button>

            {aiResults.map((text, i) => (
              <div
                key={i}
                style={{
                  padding: '14px 16px',
                  background: 'var(--color-bg-card)',
                  borderRadius: '14px',
                  marginBottom: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <p style={{ flex: 1, fontSize: '14px', color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
                  {text}
                </p>
                <button
                  onClick={() => handleAISave(text)}
                  style={{
                    padding: '6px 14px',
                    background: 'var(--color-accent-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  저장
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Talk mode tab */}
        {activeTab === 'Talk Mode' && (
          <div>
            <div
              style={{
                minHeight: '300px',
                maxHeight: '400px',
                overflowY: 'auto',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {chatMessages.length === 0 && (
                <div
                  style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: 'var(--color-text-muted)',
                    fontSize: '14px',
                  }}
                >
                  오늘 어떤 하루를 보내고 계신가요? 편하게 이야기해 주세요 🌿
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '80%',
                      padding: '10px 14px',
                      borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: msg.role === 'user'
                        ? 'var(--color-accent-primary)'
                        : 'var(--color-bg-card)',
                      color: msg.role === 'user' ? 'white' : 'var(--color-text-primary)',
                      fontSize: '14px',
                      lineHeight: 1.5,
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', padding: '8px' }}>
                  생각 중...
                </div>
              )}
            </div>

            {chatAffirmations.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
                  당신을 위한 성공의 말 추천
                </p>
                {chatAffirmations.map((text, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '12px 14px',
                      background: 'var(--color-bg-card)',
                      borderRadius: '12px',
                      marginBottom: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <p style={{ flex: 1, fontSize: '14px', color: 'var(--color-text-primary)' }}>
                      {text}
                    </p>
                    <button
                      onClick={() => handleAISave(text)}
                      style={{
                        padding: '5px 12px',
                        background: 'var(--color-accent-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      저장
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div ref={chatBottomRef} />

            <div className="flex gap-2" style={{ marginTop: '8px' }}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    handleChatSend()
                  }
                }}
                placeholder="메시지 입력..."
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleChatSend}
                disabled={!chatInput.trim() || chatLoading}
                style={{
                  padding: '12px 20px',
                  background: 'var(--color-accent-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                전송
              </button>
            </div>

            {chatMessages.length >= 2 && chatAffirmations.length === 0 && (
              <button
                onClick={handleGenerateAffirmations}
                disabled={chatLoading}
                style={{
                  width: '100%',
                  padding: '13px',
                  background: 'var(--color-accent-secondary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '10px',
                }}
              >
                ✨ 성공의 말 생성하기
              </button>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
