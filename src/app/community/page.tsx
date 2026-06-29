'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/ui/AppLayout'
import { Users, Plus, ChevronRight, CheckCircle, Search, X } from 'lucide-react'

type CommunityTab = '내 방' | '방 둘러보기' | '방 만들기'
type NegResult = { isNegative: boolean; alternative: string | null; suggestedDesc?: string | null }
type NegBanner = NegResult | null

const ROOM_TAGS = [
  '아침 확언', '자존감', '다이어트', '취업준비', '돈과 풍요',
  '건강', '마음챙김', '관계', '사랑', '커리어',
  '공부', '자기계발', '창업', '운동', '수면',
  '감사', '용기', '긍정', '행복', '가족',
]
const ALL_TAGS = ['전체', ...ROOM_TAGS]
const MAX_MEMBERS = 20

const MOCK_ROOMS = [
  { id: 'r1', name: '아침 확언 클럽', desc: '매일 아침 확언으로 하루를 시작해요', tags: ['아침 확언'], members: 24, streakDays: 12 },
  { id: 'r2', name: '취업 성공 방', desc: '취업 목표를 가진 분들과 함께해요', tags: ['취업준비'], members: 18, streakDays: 7 },
  { id: 'r3', name: '자존감 키우기', desc: '나를 사랑하는 연습', tags: ['자존감'], members: 31, streakDays: 20 },
  { id: 'r4', name: '다이어트 확언단', desc: '건강한 몸을 향한 긍정 확언 모임', tags: ['다이어트'], members: 15, streakDays: 5 },
]

const DEFAULT_MY_ROOMS = ['r1', 'r3']

async function checkField(
  text: string,
  setter: (v: NegBanner) => void,
  context?: 'roomName' | 'general',
) {
  if (!text.trim()) return
  try {
    const res = await fetch('/api/detect-negative', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, context }),
    })
    const data = await res.json() as NegResult
    if (data.isNegative) setter(data)
  } catch {}
}

export default function CommunityPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<CommunityTab>('내 방')
  const [selectedTag, setSelectedTag] = useState('전체')
  const [searchQuery, setSearchQuery] = useState('')
  const [myRooms, setMyRooms] = useState<string[]>(DEFAULT_MY_ROOMS)
  const [roomName, setRoomName] = useState('')
  const [roomDesc, setRoomDesc] = useState('')
  const [roomTag, setRoomTag] = useState<string>('')
  const [roomNameBanner, setRoomNameBanner] = useState<NegBanner>(null)
  const [roomDescBanner, setRoomDescBanner] = useState<NegBanner>(null)
  const [creating, setCreating] = useState(false)

  // localStorage에서 내 방 목록 불러오기
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ealo-my-rooms')
      setMyRooms(saved ? (JSON.parse(saved) as string[]) : DEFAULT_MY_ROOMS)
    } catch {}
  }, [])

  // 내 방 목록 변경 시 localStorage 저장
  useEffect(() => {
    try { localStorage.setItem('ealo-my-rooms', JSON.stringify(myRooms)) } catch {}
  }, [myRooms])

  const filteredRooms = MOCK_ROOMS
    .filter(r => !myRooms.includes(r.id))
    .filter(r => selectedTag === '전체' || r.tags.includes(selectedTag))
    .filter(r => {
      const q = searchQuery.trim().toLowerCase()
      if (!q) return true
      return r.name.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q)
    })

  const myRoomData = MOCK_ROOMS.filter(r => myRooms.includes(r.id))

  const handleJoin = (roomId: string) => {
    const room = MOCK_ROOMS.find(r => r.id === roomId)
    if (!room || room.members >= MAX_MEMBERS) return
    setMyRooms(prev => [...prev, roomId])
    setActiveTab('내 방')
  }

  const handleCreateRoom = async () => {
    if (!roomName.trim() || creating) return
    setCreating(true)
    setRoomNameBanner(null)
    setRoomDescBanner(null)

    const [nameResult, descResult] = await Promise.all([
      fetch('/api/detect-negative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: roomName, context: 'roomName' }),
      }).then(r => r.json() as Promise<NegResult>).catch((): NegResult => ({ isNegative: false, alternative: null, suggestedDesc: null })),
      roomDesc.trim()
        ? fetch('/api/detect-negative', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: roomDesc }),
          }).then(r => r.json() as Promise<NegResult>).catch((): NegResult => ({ isNegative: false, alternative: null, suggestedDesc: null }))
        : Promise.resolve<NegResult>({ isNegative: false, alternative: null, suggestedDesc: null }),
    ])

    if (nameResult.isNegative) {
      setRoomNameBanner(nameResult)
      setCreating(false)
      return
    }
    if (descResult.isNegative) {
      setRoomDescBanner(descResult)
      setCreating(false)
      return
    }

    alert('방이 만들어졌어요! (실제 저장은 추후 연동 예정)')
    setRoomName('')
    setRoomDesc('')
    setRoomTag('')
    setRoomNameBanner(null)
    setRoomDescBanner(null)
    setActiveTab('내 방')
    setCreating(false)
  }

  const tabStyle = (tab: CommunityTab) => ({
    flex: 1,
    padding: '10px 0',
    background: 'none',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
    color: activeTab === tab ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
    fontSize: '14px',
    fontWeight: activeTab === tab ? 700 : 400,
    cursor: 'pointer',
    transition: 'all 0.15s',
  })

  return (
    <AppLayout activeTab="함께">
      <div style={{ paddingBottom: '32px' }}>
        {/* 헤더 */}
        <div style={{ padding: '20px 16px 0' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
            함께
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            같은 목표를 가진 사람들과 성공의 말을 나눠요
          </p>
        </div>

        {/* 상단 탭: 내 방 → 방 둘러보기 → 방 만들기 */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '20px' }}>
          {(['내 방', '방 둘러보기', '방 만들기'] as CommunityTab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(tab)}>
              {tab}
            </button>
          ))}
        </div>

        <div style={{ padding: '0 16px' }}>
          {/* 내 방 */}
          {activeTab === '내 방' && (
            <div>
              {myRoomData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏠</div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                    아직 함께하는 방이 없어요
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
                    방을 둘러보고 마음에 드는 방에 참여해 보세요
                  </div>
                  <button
                    onClick={() => setActiveTab('방 둘러보기')}
                    style={{
                      padding: '10px 24px',
                      background: '#F59E0B',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    방 둘러보기
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {myRoomData.map(room => (
                    <button
                      key={room.id}
                      onClick={() => router.push(`/community/${room.id}`)}
                      style={{
                        background: 'var(--color-bg-card)',
                        borderRadius: '16px',
                        padding: '16px',
                        border: '1px solid var(--color-border)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                          {room.name}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Users size={11} /> {room.members}명
                          </span>
                          <span style={{ fontSize: '12px', color: '#92400E', background: '#FEF3C7', padding: '2px 8px', borderRadius: '999px', fontWeight: 500 }}>
                            연속 {room.streakDays}일 🔥
                          </span>
                          <span style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle size={11} /> 오늘 인증
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={18} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 방 둘러보기 */}
          {activeTab === '방 둘러보기' && (
            <div>
              {/* 검색창 */}
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <Search size={15} color="var(--color-text-muted)" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="방 이름 또는 소개로 검색"
                  style={{
                    width: '100%',
                    padding: '11px 36px',
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    fontSize: '14px',
                    color: 'var(--color-text-primary)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <X size={15} color="var(--color-text-muted)" />
                  </button>
                )}
              </div>

              {/* 태그 필터 */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                {ALL_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    style={{
                      flexShrink: 0,
                      padding: '6px 14px',
                      borderRadius: '999px',
                      border: selectedTag === tag ? '1.5px solid #F59E0B' : '1.5px solid var(--color-border)',
                      background: selectedTag === tag ? '#FEF3C7' : 'var(--color-bg-card)',
                      color: selectedTag === tag ? '#92400E' : 'var(--color-text-muted)',
                      fontSize: '13px',
                      fontWeight: selectedTag === tag ? 600 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {filteredRooms.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)', fontSize: '14px' }}>
                  {searchQuery.trim() ? `"${searchQuery}" 검색 결과가 없어요` : '모든 방에 참여 중이에요 🎉'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredRooms.map(room => {
                    const isFull = room.members >= MAX_MEMBERS
                    return (
                      <div
                        key={room.id}
                        style={{
                          background: 'var(--color-bg-card)',
                          borderRadius: '16px',
                          padding: '16px',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                              {room.name}
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                              {room.desc}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Users size={12} /> {room.members}/{MAX_MEMBERS}명
                            </span>
                            <span style={{ fontSize: '12px', color: '#92400E', background: '#FEF3C7', padding: '2px 8px', borderRadius: '999px', fontWeight: 500 }}>
                              연속 {room.streakDays}일째 🔥
                            </span>
                            {isFull && (
                              <span style={{ fontSize: '12px', color: '#EF5350', background: '#FFEBEE', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
                                마감
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleJoin(room.id)}
                            disabled={isFull}
                            style={{
                              padding: '7px 16px',
                              background: isFull ? 'var(--color-border)' : '#F59E0B',
                              color: isFull ? 'var(--color-text-muted)' : 'white',
                              border: 'none',
                              borderRadius: '10px',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: isFull ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {isFull ? '마감' : '참여하기'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* 방 만들기 */}
          {activeTab === '방 만들기' && (
            <div>
              {/* 방 이름 */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '8px' }}>
                  방 이름 *
                </label>
                <input
                  value={roomName}
                  onChange={e => { setRoomName(e.target.value); setRoomNameBanner(null) }}
                  onBlur={() => checkField(roomName, setRoomNameBanner, 'roomName')}
                  placeholder="예: 아침 확언 클럽"
                  maxLength={20}
                  style={{
                    width: '100%',
                    padding: '13px 14px',
                    background: 'var(--color-bg-card)',
                    border: roomNameBanner?.isNegative ? '1.5px solid #EF5350' : '1px solid var(--color-border)',
                    borderRadius: '12px',
                    fontSize: '15px',
                    color: 'var(--color-text-primary)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {roomNameBanner && (
                  <div style={{
                    marginTop: '8px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: roomNameBanner.alternative ? '#FFF3CD' : '#FFEBEE',
                    fontSize: '13px',
                    color: roomNameBanner.alternative ? '#795548' : '#C62828',
                  }}>
                    {roomNameBanner.alternative ? (
                      <>
                        <div style={{ marginBottom: '8px' }}>
                          💛 이런 이름은 어때요?<br />
                          <strong>"{roomNameBanner.alternative}"</strong>
                          {roomNameBanner.suggestedDesc && (
                            <div style={{ marginTop: '4px', fontSize: '12px', color: '#92400E', fontWeight: 400 }}>
                              소개: {roomNameBanner.suggestedDesc}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setRoomName(roomNameBanner.alternative!)
                              if (roomNameBanner.suggestedDesc && !roomDesc.trim()) {
                                setRoomDesc(roomNameBanner.suggestedDesc)
                              }
                              setRoomNameBanner(null)
                            }}
                            style={{ flex: 1, padding: '7px', background: '#F59E0B', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            바꿔서 쓰기
                          </button>
                          <button
                            onClick={() => { setRoomName(''); setRoomNameBanner(null) }}
                            style={{ flex: 1, padding: '7px', background: 'transparent', border: '1px solid #ccc', borderRadius: '8px', fontSize: '13px', color: '#795548', cursor: 'pointer' }}
                          >
                            다시 쓰기
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ marginBottom: '8px' }}>🚫 사용할 수 없는 표현이 포함되어 있어요. 긍정적인 방 이름으로 바꿔주세요.</div>
                        <button
                          onClick={() => { setRoomName(''); setRoomNameBanner(null) }}
                          style={{ padding: '7px 14px', background: 'transparent', border: '1px solid #EF9A9A', borderRadius: '8px', fontSize: '13px', color: '#C62828', cursor: 'pointer' }}
                        >
                          다시 쓰기
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 한 줄 소개 — 방 이름 입력 시에만 활성화 */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: roomName.trim() ? 'var(--color-text-secondary)' : 'var(--color-text-muted)', display: 'block', marginBottom: '8px' }}>
                  한 줄 소개
                </label>
                <input
                  value={roomDesc}
                  onChange={e => { setRoomDesc(e.target.value); setRoomDescBanner(null) }}
                  onBlur={() => checkField(roomDesc, setRoomDescBanner)}
                  placeholder={roomName.trim() ? '이 방은 어떤 방인가요?' : '방 이름을 먼저 입력해주세요'}
                  maxLength={40}
                  disabled={!roomName.trim()}
                  style={{
                    width: '100%',
                    padding: '13px 14px',
                    background: roomName.trim() ? 'var(--color-bg-card)' : 'var(--color-bg-primary)',
                    border: roomDescBanner?.isNegative ? '1.5px solid #EF5350' : '1px solid var(--color-border)',
                    borderRadius: '12px',
                    fontSize: '15px',
                    color: roomName.trim() ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    opacity: roomName.trim() ? 1 : 0.5,
                    cursor: roomName.trim() ? 'text' : 'not-allowed',
                  }}
                />
                {roomDescBanner && (
                  <div style={{
                    marginTop: '8px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: roomDescBanner.alternative ? '#FFF3CD' : '#FFEBEE',
                    fontSize: '13px',
                    color: roomDescBanner.alternative ? '#795548' : '#C62828',
                  }}>
                    {roomDescBanner.alternative ? (
                      <>
                        <div style={{ marginBottom: '8px' }}>💛 이런 소개는 어때요?<br /><strong>"{roomDescBanner.alternative}"</strong></div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => { setRoomDesc(roomDescBanner.alternative!); setRoomDescBanner(null) }}
                            style={{ flex: 1, padding: '7px', background: '#F59E0B', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            바꿔서 쓰기
                          </button>
                          <button
                            onClick={() => { setRoomDesc(''); setRoomDescBanner(null) }}
                            style={{ flex: 1, padding: '7px', background: 'transparent', border: '1px solid #ccc', borderRadius: '8px', fontSize: '13px', color: '#795548', cursor: 'pointer' }}
                          >
                            다시 쓰기
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ marginBottom: '8px' }}>🚫 사용할 수 없는 표현이 포함되어 있어요. 긍정적인 소개로 바꿔주세요.</div>
                        <button
                          onClick={() => { setRoomDesc(''); setRoomDescBanner(null) }}
                          style={{ padding: '7px 14px', background: 'transparent', border: '1px solid #EF9A9A', borderRadius: '8px', fontSize: '13px', color: '#C62828', cursor: 'pointer' }}
                        >
                          다시 쓰기
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 태그 선택 — 가로 스크롤, 단일 선택 */}
              <div style={{ marginBottom: '28px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '8px' }}>
                  태그 선택 (1개)
                </label>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'auto',
                  paddingBottom: '8px',
                  scrollbarWidth: 'none',
                }}>
                  {ROOM_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setRoomTag(prev => prev === tag ? '' : tag)}
                      style={{
                        flexShrink: 0,
                        padding: '7px 14px',
                        borderRadius: '999px',
                        border: roomTag === tag ? '1.5px solid #F59E0B' : '1.5px solid var(--color-border)',
                        background: roomTag === tag ? '#FEF3C7' : 'var(--color-bg-card)',
                        color: roomTag === tag ? '#92400E' : 'var(--color-text-muted)',
                        fontSize: '13px',
                        fontWeight: roomTag === tag ? 600 : 400,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={!roomName.trim() || creating}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: roomName.trim() && !creating ? '#F59E0B' : 'var(--color-border)',
                  color: roomName.trim() && !creating ? 'white' : 'var(--color-text-muted)',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: roomName.trim() && !creating ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {creating ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>✨</span>
                    확인 중...
                  </span>
                ) : (
                  <>
                    <Plus size={18} />
                    방 만들기
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </AppLayout>
  )
}
