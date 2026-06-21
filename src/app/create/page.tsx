'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/ui/AppLayout'
import type { CategoryName } from '@/lib/categories'
import { saveAffirmation, getCategories, saveCategories, getTodayAffirmationIds, saveTodayAffirmationIds, type AffirmationCategory } from '@/lib/storage'
import { Mic } from 'lucide-react'

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

  // Category add state
  const [addCatMode, setAddCatMode] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  // Voice input state (per tab)
  const [isListeningDirect, setIsListeningDirect] = useState(false)
  const [isListeningAI, setIsListeningAI] = useState(false)
  const [isListeningChat, setIsListeningChat] = useState(false)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)

  const startVoiceInput = (
    onResult: (text: string) => void,
    setListening: (v: boolean) => void
  ) => {
    recognitionRef.current?.stop()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SpeechRec = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SpeechRec) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SpeechRec()
    rec.lang = 'ko-KR'
    rec.continuous = false
    rec.interimResults = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => { onResult(e.results[0][0].transcript) }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    rec.start()
    recognitionRef.current = rec
    setListening(true)
  }

  const toggleVoiceInput = (
    isListening: boolean,
    setListening: (v: boolean) => void,
    onResult: (text: string) => void
  ) => {
    if (isListening) {
      recognitionRef.current?.stop()
      setListening(false)
    } else {
      startVoiceInput(onResult, setListening)
    }
  }

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

  const handleAddCategory = () => {
    const name = newCatName.trim()
    if (!name) return
    if (categories.includes(name)) { alert('이미 있는 카테고리예요.'); return }
    const updated = [...categories, name]
    saveCategories(updated)
    setCategories(updated)
    setNewCatName('')
    setAddCatMode(false)
  }

  const doSave = (text: string, category: CategoryName) => {
    const newId = `aff-${Date.now()}-${Math.random().toString(36).slice(2)}`
    saveAffirmation({
      id: newId,
      text,
      category: category as AffirmationCategory,
      createdAt: new Date().toISOString(),
      completedDates: [],
    })
    // Add to today's queue so home page shows it immediately
    const currentIds = getTodayAffirmationIds()
    if (!currentIds.includes(newId)) {
      saveTodayAffirmationIds([...currentIds, newId])
    }
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
        <div className="flex items-center justify-between w-full mb-4">
          <button
            onClick={() => router.push('/affirmations')}
            style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
          >
            ← 돌아가기
          </button>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            성공의 말 만들기
          </h1>
          <div style={{ width: '60px' }} />
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
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <textarea
                value={directText}
                onChange={(e) => setDirectText(e.target.value)}
                placeholder="나는 오늘도 충분히 잘하고 있다"
                rows={3}
                style={{
                  width: '100%',
                  padding: '14px 44px 14px 14px',
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  fontSize: '15px',
                  color: 'var(--color-text-primary)',
                  resize: 'none',
                  outline: 'none',
                  lineHeight: 1.6,
                }}
              />
              <button
                onClick={() => toggleVoiceInput(
                  isListeningDirect,
                  setIsListeningDirect,
                  (text) => setDirectText((prev) => prev ? prev + ' ' + text : text)
                )}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: isListeningDirect ? '#E53935' : 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                title={isListeningDirect ? '듣는 중 — 탭하여 중지' : '음성으로 입력'}
              >
                <Mic size={16} color={isListeningDirect ? 'white' : 'var(--color-text-muted)'} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
              카테고리
            </p>
            <div className="grid grid-cols-2 gap-2 mb-3">
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

            {addCatMode ? (
              <div className="flex gap-2 mb-6">
                <input
                  autoFocus
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleAddCategory()
                    if (e.key === 'Escape') { setAddCatMode(false); setNewCatName('') }
                  }}
                  placeholder="새 카테고리 이름"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '10px',
                    fontSize: '13px',
                    color: 'var(--color-text-primary)',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleAddCategory}
                  style={{ padding: '10px 16px', background: 'var(--color-accent-primary)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  추가
                </button>
                <button
                  onClick={() => { setAddCatMode(false); setNewCatName('') }}
                  style={{ padding: '10px 12px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '10px', fontSize: '13px', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddCatMode(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: 'transparent',
                  border: '1.5px dashed var(--color-border)',
                  borderRadius: '10px',
                  color: 'var(--color-text-muted)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  marginBottom: '16px',
                }}
              >
                + 카테고리 추가
              </button>
            )}

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
                    onClick={() => setNegativeBanner(null)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'transparent',
                      color: '#795548',
                      border: '1px solid #FFE082',
                      borderRadius: '10px',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    다시 쓰기
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
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="어떤 고민이나 감정을 담고 싶으신가요?"
                rows={3}
                style={{
                  width: '100%',
                  padding: '14px 44px 14px 14px',
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  fontSize: '15px',
                  color: 'var(--color-text-primary)',
                  resize: 'none',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => toggleVoiceInput(
                  isListeningAI,
                  setIsListeningAI,
                  (text) => setAiPrompt((prev) => prev ? prev + ' ' + text : text)
                )}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: isListeningAI ? '#E53935' : 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                title={isListeningAI ? '듣는 중 — 탭하여 중지' : '음성으로 입력'}
              >
                <Mic size={16} color={isListeningAI ? 'white' : 'var(--color-text-muted)'} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
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
              {addCatMode ? (
                <div className="flex gap-2 w-full mt-1">
                  <input
                    autoFocus
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleAddCategory()
                      if (e.key === 'Escape') { setAddCatMode(false); setNewCatName('') }
                    }}
                    placeholder="새 카테고리 이름"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: 'var(--color-bg-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '10px',
                      fontSize: '13px',
                      color: 'var(--color-text-primary)',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleAddCategory}
                    style={{ padding: '8px 14px', background: 'var(--color-accent-primary)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    추가
                  </button>
                  <button
                    onClick={() => { setAddCatMode(false); setNewCatName('') }}
                    style={{ padding: '8px 10px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '10px', fontSize: '13px', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddCatMode(true)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: '1.5px dashed var(--color-border)',
                    background: 'transparent',
                    color: 'var(--color-text-muted)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  + 추가
                </button>
              )}
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
                onClick={() => toggleVoiceInput(
                  isListeningChat,
                  setIsListeningChat,
                  (text) => setChatInput((prev) => prev ? prev + ' ' + text : text)
                )}
                style={{
                  padding: '12px',
                  background: isListeningChat ? '#E53935' : 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'background 0.2s',
                }}
                title={isListeningChat ? '듣는 중 — 탭하여 중지' : '음성으로 입력'}
              >
                <Mic size={16} color={isListeningChat ? 'white' : 'var(--color-text-muted)'} />
              </button>
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
