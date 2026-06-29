'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/ui/AppLayout'
import type { CategoryName } from '@/lib/categories'
import { saveAffirmation, getAffirmations, getCategories, saveCategories, getTodayAffirmationIds, saveTodayAffirmationIds, type AffirmationCategory } from '@/lib/storage'
import { Mic } from 'lucide-react'

type Tab = '직접 입력' | 'AI 추천' | '질문 추천'

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
  const [msgType, setMsgType] = useState<'success' | 'duplicate'>('success')

  // Category add state
  const [addCatMode, setAddCatMode] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [catAlt, setCatAlt] = useState<string | null>(null)

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
    rec.onresult = (e: any) => {
      if (!e.results?.[0]?.[0]) return
      onResult(e.results[0][0].transcript)
    }
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
  const [aiError, setAiError] = useState('')

  // 질문 추천 state
  const [initialInput, setInitialInput] = useState('')
  const [initialContext, setInitialContext] = useState('')
  const [chatStarted, setChatStarted] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatAffirmations, setChatAffirmations] = useState<string[]>([])
  const chatUserCount = chatMessages.filter((m) => m.role === 'user').length
  const chatLimitReached = chatUserCount >= 10

  useEffect(() => {
    if (chatStarted) {
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [chatMessages, chatStarted])

  const handleDirectSave = async (textToSave?: string) => {
    const text = textToSave ?? directText
    if (!text.trim() || !directCategory) return
    setDirectSaving(true)
    try {
      const res = await fetch('/api/detect-negative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, category: directCategory }),
      })
      const data = await res.json() as { isNegative: boolean; alternative: string | null }
      if (data.isNegative) {
        setNegativeBanner({ alternative: data.alternative ?? '' })
        setDirectSaving(false)
        return
      }
    } catch {
      // proceed without check
    }
    doSave(text, directCategory)
    setDirectSaving(false)
  }

  const doAddCategory = (name: string) => {
    const updated = [...categories, name]
    saveCategories(updated)
    setCategories(updated)
    setNewCatName('')
    setCatAlt(null)
    setAddCatMode(false)
  }

  const handleAddCategory = async () => {
    const name = newCatName.trim()
    if (!name) return
    if (categories.includes(name)) { alert('이미 있는 카테고리예요.'); return }
    setAddingCat(true)
    try {
      const res = await fetch('/api/detect-negative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: name }),
      })
      const data = await res.json() as { isNegative: boolean; alternative: string | null }
      if (data.isNegative && data.alternative) {
        setCatAlt(data.alternative)
        setAddingCat(false)
        return
      }
    } catch { /* 네트워크 오류 시 통과 */ }
    setAddingCat(false)
    doAddCategory(name)
  }

  const showToast = (msg: string, type: 'success' | 'duplicate') => {
    setMsgType(type)
    setSavedMsg(msg)
    setTimeout(() => setSavedMsg(''), 2500)
  }

  const doSave = (text: string, category: CategoryName) => {
    const existing = getAffirmations()
    if (existing.some((a) => a.text.trim() === text.trim())) {
      showToast('이미 같은 성공의 말이 있어요', 'duplicate')
      return
    }
    const newId = `aff-${Date.now()}-${Math.random().toString(36).slice(2)}`
    saveAffirmation({
      id: newId,
      text,
      category: category as AffirmationCategory,
      createdAt: new Date().toISOString(),
      completedDates: [],
    })
    const currentIds = getTodayAffirmationIds()
    if (!currentIds.includes(newId)) {
      saveTodayAffirmationIds([...currentIds, newId])
    }
    setDirectText('')
    setNegativeBanner(null)
    showToast('저장되었어요!', 'success')
  }

  const handleAIRecommend = async () => {
    if (!aiPrompt.trim()) return
    setAiLoading(true)
    setAiError('')
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, category: aiCategory }),
      })
      const data = await res.json() as { affirmations: string[] }
      if (!data.affirmations?.length) {
        setAiError('추천 결과를 가져오지 못했어요. 다시 시도해주세요.')
      } else {
        setAiResults(data.affirmations)
      }
    } catch {
      setAiError('네트워크 오류가 발생했어요. 다시 시도해주세요.')
    }
    setAiLoading(false)
  }

  const handleAISave = (text: string) => {
    const existing = getAffirmations()
    if (existing.some((a) => a.text.trim() === text.trim())) {
      showToast('이미 같은 성공의 말이 있어요', 'duplicate')
      return
    }
    const newId = `aff-${Date.now()}-${Math.random().toString(36).slice(2)}`
    saveAffirmation({
      id: newId,
      text,
      category: (aiCategory ?? '나 자신') as AffirmationCategory,
      createdAt: new Date().toISOString(),
      completedDates: [],
    })
    const currentIds = getTodayAffirmationIds()
    if (!currentIds.includes(newId)) {
      saveTodayAffirmationIds([...currentIds, newId])
    }
    showToast('저장되었어요!', 'success')
  }

  const handleStartChat = async () => {
    if (!initialInput.trim()) return
    const ctx = initialInput.trim()
    setInitialContext(ctx)
    setChatStarted(true)
    setChatLoading(true)
    try {
      const res = await fetch('/api/talk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [], initialContext: ctx, generateAffirmations: false }),
      })
      const data = await res.json() as { reply: string }
      setChatMessages([{ role: 'assistant', content: data.reply }])
    } catch {
      setChatMessages([{ role: 'assistant', content: '이야기를 들려주셔서 감사해요. 조금 더 여쭤봐도 될까요?' }])
    }
    setChatLoading(false)
  }

  const handleChatSend = async () => {
    if (!chatInput.trim()) return
    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: chatInput }]
    const newUserCount = newMessages.filter((m) => m.role === 'user').length
    const isLast = newUserCount >= 10
    setChatMessages(newMessages)
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await fetch('/api/talk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, initialContext, generateAffirmations: isLast }),
      })
      const data = await res.json() as { reply: string; affirmations?: string[] }
      setChatMessages([...newMessages, { role: 'assistant', content: data.reply }])
      if (data.affirmations) {
        setChatAffirmations(data.affirmations)
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    } catch {
      setChatMessages([...newMessages, { role: 'assistant', content: '죄송해요, 잠시 후 다시 시도해주세요.' }])
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
        body: JSON.stringify({ messages: chatMessages, initialContext, generateAffirmations: true }),
      })
      const data = await res.json() as { reply: string; affirmations?: string[] }
      if (data.reply) {
        setChatMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
      }
      if (data.affirmations) {
        setChatAffirmations(data.affirmations)
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    } catch {}
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
          {(['직접 입력', 'AI 추천', '질문 추천'] as Tab[]).map((tab) => (
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
              position: 'fixed',
              bottom: '80px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '12px 24px',
              background: msgType === 'success' ? '#2E7D32' : '#E65100',
              borderRadius: '24px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              zIndex: 9999,
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
              whiteSpace: 'nowrap',
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

            <div className="flex flex-wrap gap-2 mb-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setDirectCategory(directCategory === cat ? null : cat)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: directCategory === cat
                      ? '1px solid var(--color-accent-primary)'
                      : '1px solid var(--color-border)',
                    background: directCategory === cat
                      ? 'var(--color-accent-light)'
                      : 'transparent',
                    color: directCategory === cat
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
                <div className="w-full mt-1">
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={newCatName}
                      onChange={(e) => { setNewCatName(e.target.value); setCatAlt(null) }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleAddCategory()
                        if (e.key === 'Escape') { setAddCatMode(false); setNewCatName(''); setCatAlt(null) }
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
                      disabled={addingCat}
                      style={{ padding: '8px 14px', background: 'var(--color-accent-primary)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: addingCat ? 0.6 : 1 }}
                    >
                      {addingCat ? '...' : '추가'}
                    </button>
                    <button
                      onClick={() => { setAddCatMode(false); setNewCatName(''); setCatAlt(null) }}
                      style={{ padding: '8px 10px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '10px', fontSize: '13px', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                  {catAlt && (
                    <div style={{ marginTop: '8px', padding: '12px', background: '#FFF3CD', borderRadius: '10px', border: '1px solid #FFE082' }}>
                      <p style={{ fontSize: '12px', color: '#795548', marginBottom: '6px' }}>부정적인 표현이 감지됐어요. 이렇게 바꿔볼까요?</p>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#4E342E', marginBottom: '8px' }}>{catAlt}</p>
                      <div className="flex gap-2">
                        <button onClick={() => doAddCategory(catAlt)} style={{ flex: 1, padding: '7px', background: 'var(--color-accent-primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>이 이름으로 추가</button>
                        <button onClick={() => { setNewCatName(''); setCatAlt(null) }} style={{ flex: 1, padding: '7px', background: 'transparent', color: '#795548', border: '1px solid #FFE082', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>다시 쓰기</button>
                      </div>
                    </div>
                  )}
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

            {negativeBanner && (
              negativeBanner.alternative ? (
                /* 부정어 감지 → 대안 제안 */
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
              ) : (
                /* 욕설/비속어 감지 → 차단 메시지 */
                <div
                  style={{
                    padding: '14px',
                    background: '#FFEBEE',
                    borderRadius: '12px',
                    marginBottom: '16px',
                    border: '1px solid #FFCDD2',
                  }}
                >
                  <p style={{ fontSize: '14px', color: '#C62828', fontWeight: 600, marginBottom: '4px' }}>
                    부적절한 표현은 저장할 수 없어요.
                  </p>
                  <p style={{ fontSize: '13px', color: '#B71C1C', marginBottom: '12px' }}>
                    긍정적인 성공의 말로 다시 작성해 주세요.
                  </p>
                  <button
                    onClick={() => setNegativeBanner(null)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'transparent',
                      color: '#C62828',
                      border: '1px solid #FFCDD2',
                      borderRadius: '10px',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    다시 쓰기
                  </button>
                </div>
              )
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
                <div className="w-full mt-1">
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={newCatName}
                      onChange={(e) => { setNewCatName(e.target.value); setCatAlt(null) }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleAddCategory()
                        if (e.key === 'Escape') { setAddCatMode(false); setNewCatName(''); setCatAlt(null) }
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
                      disabled={addingCat}
                      style={{ padding: '8px 14px', background: 'var(--color-accent-primary)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: addingCat ? 0.6 : 1 }}
                    >
                      {addingCat ? '...' : '추가'}
                    </button>
                    <button
                      onClick={() => { setAddCatMode(false); setNewCatName(''); setCatAlt(null) }}
                      style={{ padding: '8px 10px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '10px', fontSize: '13px', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                  {catAlt && (
                    <div style={{ marginTop: '8px', padding: '12px', background: '#FFF3CD', borderRadius: '10px', border: '1px solid #FFE082' }}>
                      <p style={{ fontSize: '12px', color: '#795548', marginBottom: '6px' }}>부정적인 표현이 감지됐어요. 이렇게 바꿔볼까요?</p>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#4E342E', marginBottom: '8px' }}>{catAlt}</p>
                      <div className="flex gap-2">
                        <button onClick={() => doAddCategory(catAlt)} style={{ flex: 1, padding: '7px', background: 'var(--color-accent-primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>이 이름으로 추가</button>
                        <button onClick={() => { setNewCatName(''); setCatAlt(null) }} style={{ flex: 1, padding: '7px', background: 'transparent', color: '#795548', border: '1px solid #FFE082', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>다시 쓰기</button>
                      </div>
                    </div>
                  )}
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

            {aiError && (
              <div style={{ padding: '12px 16px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                {aiError}
              </div>
            )}

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

        {/* 질문 추천 탭 */}
        {activeTab === '질문 추천' && (
          <div>
            {!chatStarted ? (
              /* Phase 1: 고민 입력 */
              <div>
                <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '12px', lineHeight: 1.6 }}>
                  요즘 어떤 점이 힘드신가요? 고민을 편하게 이야기해 주세요.<br />
                  AI가 10가지 질문을 통해 딱 맞는 성공의 말을 추천해 드려요 🌿
                </p>
                <div style={{ position: 'relative', marginBottom: '12px' }}>
                  <textarea
                    value={initialInput}
                    onChange={(e) => setInitialInput(e.target.value)}
                    placeholder="예: 요즘 일이 잘 안 풀리고 자신감이 없어요..."
                    rows={4}
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
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    onClick={() => toggleVoiceInput(
                      isListeningChat,
                      setIsListeningChat,
                      (text) => setInitialInput((prev) => prev ? prev + ' ' + text : text)
                    )}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: isListeningChat ? '#E53935' : 'var(--color-bg-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      padding: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s',
                    }}
                    title={isListeningChat ? '듣는 중 — 탭하여 중지' : '음성으로 입력'}
                  >
                    <Mic size={16} color={isListeningChat ? 'white' : 'var(--color-text-muted)'} />
                  </button>
                </div>
                <button
                  onClick={handleStartChat}
                  disabled={!initialInput.trim() || chatLoading}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: initialInput.trim() ? 'var(--color-accent-primary)' : 'var(--color-border)',
                    color: initialInput.trim() ? 'white' : 'var(--color-text-muted)',
                    border: 'none',
                    borderRadius: '14px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: initialInput.trim() ? 'pointer' : 'not-allowed',
                    opacity: initialInput.trim() ? 1 : 0.6,
                  }}
                >
                  {chatLoading ? '시작하는 중...' : '질문 시작하기'}
                </button>
              </div>
            ) : (
              /* Phase 2 & 3: 질문 채팅 + 결과 */
              <div>
                {/* 진행 표시 */}
                {chatAffirmations.length === 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '14px',
                  }}>
                    <div style={{
                      flex: 1,
                      height: '6px',
                      background: 'var(--color-border)',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${Math.min(chatUserCount / 10 * 100, 100)}%`,
                        height: '100%',
                        background: 'var(--color-accent-primary)',
                        borderRadius: '3px',
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                      질문 {chatUserCount}/10
                    </span>
                  </div>
                )}

                {/* 채팅 메시지 */}
                <div
                  style={{
                    minHeight: '240px',
                    maxHeight: '380px',
                    overflowY: 'auto',
                    marginBottom: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
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

                {/* 성공의 말 추천 결과 */}
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

                {/* 중간에 성공의 말 생성하기 버튼 */}
                {chatAffirmations.length === 0 && chatMessages.length >= 2 && (
                  <button
                    onClick={handleGenerateAffirmations}
                    disabled={chatLoading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'var(--color-accent-secondary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: chatLoading ? 'not-allowed' : 'pointer',
                      marginBottom: '10px',
                      opacity: chatLoading ? 0.7 : 1,
                    }}
                  >
                    ✨ 성공의 말 생성하기
                  </button>
                )}

                {/* 입력창: 10번 전까지만 */}
                {!chatLimitReached && chatAffirmations.length === 0 && (
                  <div className="flex gap-2">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleChatSend()
                      }}
                      placeholder="답변을 입력해 주세요..."
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
                        cursor: !chatInput.trim() || chatLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      전송
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
