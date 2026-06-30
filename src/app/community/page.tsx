'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/ui/AppLayout'
import { Users, Plus, ChevronRight, CheckCircle, Search, X, UserCircle, Camera } from 'lucide-react'

interface UserProfile {
  nickname: string
  profileImage: string | null
  googleEmail?: string
}

function resizeImageToBase64(file: File, maxPx = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(maxPx / img.naturalWidth, maxPx / img.naturalHeight, 1)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.naturalWidth * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지를 불러올 수 없어요.')) }
    img.src = url
  })
}

type CommunityTab = '내 방' | '방 둘러보기' | '랭킹'
type RankingPeriod = '전체' | '연' | '월' | '일'

const MOCK_RANKING: Record<RankingPeriod, Array<{ roomId: string; totalDays: number }>> = {
  '전체': [
    { roomId: 'r3', totalDays: 1240 },
    { roomId: 'r1', totalDays: 876 },
    { roomId: 'r2', totalDays: 532 },
    { roomId: 'r4', totalDays: 245 },
  ],
  '연': [
    { roomId: 'r1', totalDays: 312 },
    { roomId: 'r3', totalDays: 289 },
    { roomId: 'r4', totalDays: 178 },
    { roomId: 'r2', totalDays: 134 },
  ],
  '월': [
    { roomId: 'r3', totalDays: 94 },
    { roomId: 'r2', totalDays: 67 },
    { roomId: 'r1', totalDays: 58 },
    { roomId: 'r4', totalDays: 41 },
  ],
  '일': [
    { roomId: 'r1', totalDays: 18 },
    { roomId: 'r3', totalDays: 15 },
    { roomId: 'r2', totalDays: 12 },
    { roomId: 'r4', totalDays: 9 },
  ],
}
const MOCK_PHRASE_RANKING: Record<RankingPeriod, Array<{ phrase: string; totalDays: number; userCount: number }>> = {
  '전체': [
    { phrase: '나는 매일 성장하고 있다',        totalDays: 3841, userCount: 142 },
    { phrase: '나는 나를 믿는다',               totalDays: 2910, userCount: 118 },
    { phrase: '나는 오늘도 최선을 다하고 있다',  totalDays: 2203, userCount: 97 },
    { phrase: '나는 건강하고 활기차다',          totalDays: 1567, userCount: 73 },
    { phrase: '나는 풍요롭고 감사하다',          totalDays: 984,  userCount: 51 },
  ],
  '연': [
    { phrase: '나는 나를 믿는다',               totalDays: 1024, userCount: 58 },
    { phrase: '나는 매일 성장하고 있다',         totalDays: 873,  userCount: 46 },
    { phrase: '나는 오늘도 최선을 다하고 있다',  totalDays: 641,  userCount: 39 },
    { phrase: '나는 건강하고 활기차다',          totalDays: 520,  userCount: 31 },
    { phrase: '나는 사랑받고 있다',             totalDays: 314,  userCount: 22 },
  ],
  '월': [
    { phrase: '나는 매일 성장하고 있다',         totalDays: 284, userCount: 21 },
    { phrase: '나는 오늘도 최선을 다하고 있다',  totalDays: 231, userCount: 18 },
    { phrase: '나는 나를 믿는다',               totalDays: 198, userCount: 16 },
    { phrase: '나는 풍요롭고 감사하다',          totalDays: 142, userCount: 11 },
    { phrase: '나는 건강하고 활기차다',          totalDays: 97,  userCount: 9 },
  ],
  '일': [
    { phrase: '나는 오늘도 최선을 다하고 있다',  totalDays: 34, userCount: 8 },
    { phrase: '나는 매일 성장하고 있다',         totalDays: 28, userCount: 7 },
    { phrase: '나는 나를 믿는다',               totalDays: 21, userCount: 6 },
    { phrase: '나는 사랑받고 있다',             totalDays: 15, userCount: 4 },
    { phrase: '나는 건강하고 활기차다',          totalDays: 9,  userCount: 3 },
  ],
}

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
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<CommunityTab>(() => {
    if (typeof window === 'undefined') return '내 방'
    const saved = sessionStorage.getItem('ealo-community-tab-restore')
    sessionStorage.removeItem('ealo-community-tab-restore')
    return (saved as CommunityTab) ?? '내 방'
  })
  const [selectedTag, setSelectedTag] = useState('전체')
  const [searchQuery, setSearchQuery] = useState('')
  const [myRooms, setMyRooms] = useState<string[]>(DEFAULT_MY_ROOMS)
  const [roomName, setRoomName] = useState('')
  const [roomDesc, setRoomDesc] = useState('')
  const [roomTag, setRoomTag] = useState<string>('')
  const [roomNameBanner, setRoomNameBanner] = useState<NegBanner>(null)
  const [roomDescBanner, setRoomDescBanner] = useState<NegBanner>(null)
  const [creating, setCreating] = useState(false)
  const [rankingPeriod, setRankingPeriod] = useState<RankingPeriod>('일')
  const [rankingType, setRankingType] = useState<'방' | '성공의 말'>('방')
  const [showCreateSheet, setShowCreateSheet] = useState(false)

  // 프로필
  const [userProfile, setUserProfile] = useState<UserProfile>({ nickname: '', profileImage: null })
  const [showProfileSheet, setShowProfileSheet] = useState(false)
  const [editNickname, setEditNickname] = useState('')
  const [editImageData, setEditImageData] = useState<string | null>(null)
  const [profileSaving, setProfileSaving] = useState(false)

  // localStorage에서 내 방 목록 불러오기
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ealo-my-rooms')
      setMyRooms(saved ? (JSON.parse(saved) as string[]) : DEFAULT_MY_ROOMS)
    } catch {}
  }, [])

  // localStorage에서 프로필 불러오기
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ealo-user-profile')
      if (saved) setUserProfile(JSON.parse(saved) as UserProfile)
    } catch {}
  }, [])

  // 내 방 목록 변경 시 localStorage 저장
  useEffect(() => {
    try { localStorage.setItem('ealo-my-rooms', JSON.stringify(myRooms)) } catch {}
  }, [myRooms])

  const handleOpenProfile = () => {
    setEditNickname(userProfile.nickname)
    setEditImageData(userProfile.profileImage)
    setShowProfileSheet(true)
  }

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const data = await resizeImageToBase64(file, 200)
      setEditImageData(data)
    } catch {}
  }

  const handleSaveProfile = () => {
    setProfileSaving(true)
    const profile: UserProfile = {
      ...userProfile,
      nickname: editNickname.trim() || '나',
      profileImage: editImageData,
    }
    try { localStorage.setItem('ealo-user-profile', JSON.stringify(profile)) } catch {}
    setUserProfile(profile)
    setProfileSaving(false)
    setShowProfileSheet(false)
  }

  const filteredRooms = MOCK_ROOMS
    .filter(r => !myRooms.includes(r.id))
    .filter(r => selectedTag === '전체' || r.tags.includes(selectedTag))
    .filter(r => {
      const q = searchQuery.trim().toLowerCase()
      if (!q) return true
      return r.name.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q)
    })

  const myRoomData = MOCK_ROOMS.filter(r => myRooms.includes(r.id))

  const goToRoom = (roomId: string) => {
    try { sessionStorage.setItem('ealo-community-tab-restore', activeTab) } catch {}
    router.push(`/community/${roomId}`)
  }

  const handleJoin = (roomId: string) => {
    const room = MOCK_ROOMS.find(r => r.id === roomId)
    if (!room || room.members >= MAX_MEMBERS) return
    setMyRooms(prev => [...prev, roomId])
    goToRoom(roomId)
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
    setShowCreateSheet(false)
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              함께
            </h1>
            {/* 프로필 버튼 */}
            <button
              onClick={handleOpenProfile}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '4px' }}
            >
              {(userProfile.nickname || userProfile.googleEmail) && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  {userProfile.nickname && (
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
                      {userProfile.nickname}
                    </span>
                  )}
                  {userProfile.googleEmail && (
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 400, lineHeight: 1.2 }}>
                      {userProfile.googleEmail}
                    </span>
                  )}
                </div>
              )}
              {userProfile.profileImage ? (
                <img
                  src={userProfile.profileImage}
                  alt="프로필"
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #F59E0B', flexShrink: 0 }}
                />
              ) : (
                <UserCircle size={30} color={userProfile.nickname ? 'var(--color-community-accent)' : 'var(--color-text-muted)'} style={{ flexShrink: 0 }} />
              )}
            </button>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            같은 목표를 가진 사람들과 성공의 말을 나눠요
          </p>
        </div>

        {/* 상단 탭: 내 방 → 방 둘러보기 → 랭킹 */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '20px' }}>
          {(['내 방', '방 둘러보기', '랭킹'] as CommunityTab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(tab)}>
              {tab}
            </button>
          ))}
        </div>

        <div style={{ padding: '0 16px' }}>
          {/* 내 방 */}
          {activeTab === '내 방' && (
            <div>
              {/* 헤더 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>내 방 목록</span>
                <button
                  onClick={() => setShowCreateSheet(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '7px 14px',
                    background: 'var(--color-community-accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} />
                  방 만들기
                </button>
              </div>

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
                      background: 'var(--color-community-accent)',
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
                      onClick={() => goToRoom(room.id)}
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
                          <span style={{ fontSize: '12px', color: 'var(--color-community-text)', background: 'var(--color-community-bg)', padding: '2px 8px', borderRadius: '999px', fontWeight: 500 }}>
                            연속 {room.streakDays}일 🔥
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--color-success-mid)', display: 'flex', alignItems: 'center', gap: '3px' }}>
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
                      background: selectedTag === tag ? 'var(--color-community-bg)' : 'var(--color-bg-card)',
                      color: selectedTag === tag ? 'var(--color-community-text)' : 'var(--color-text-muted)',
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
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                              {room.name}
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                              {room.desc}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Users size={12} /> {room.members}/{MAX_MEMBERS}명
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--color-community-text)', background: 'var(--color-community-bg)', padding: '2px 8px', borderRadius: '999px', fontWeight: 500 }}>
                              연속 {room.streakDays}일째 🔥
                            </span>
                            {isFull && (
                              <span style={{ fontSize: '12px', color: 'var(--color-danger)', background: 'var(--color-danger-bg)', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
                                마감
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                            {/* 둘러보기 — 항상 표시 */}
                            <button
                              onClick={() => goToRoom(room.id)}
                              style={{
                                padding: '7px 13px',
                                background: 'var(--color-bg-card)',
                                color: 'var(--color-text-secondary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '10px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              둘러보기
                            </button>
                            {/* 참여하기 — 마감이 아닐 때만 */}
                            {!isFull && (
                              <button
                                onClick={() => handleJoin(room.id)}
                                style={{
                                  padding: '7px 13px',
                                  background: 'var(--color-community-accent)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '10px',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                참여하기
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* 방 만들기 바텀시트 */}
          {showCreateSheet && (
            <div
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
              onClick={(e) => { if (e.target === e.currentTarget) setShowCreateSheet(false) }}
            >
              <div style={{ width: '100%', maxWidth: '430px', background: 'var(--color-bg-primary)', borderRadius: '20px 20px 0 0', padding: '20px 16px 40px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)' }}>방 만들기</span>
                  <button onClick={() => setShowCreateSheet(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px' }}>
                    <X size={20} />
                  </button>
                </div>
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
                    background: roomNameBanner.alternative ? 'var(--color-warning-bg)' : 'var(--color-danger-bg)',
                    fontSize: '13px',
                    color: roomNameBanner.alternative ? 'var(--color-warning)' : 'var(--color-danger-dark)',
                  }}>
                    {roomNameBanner.alternative ? (
                      <>
                        <div style={{ marginBottom: '8px' }}>
                          💛 이런 이름은 어때요?<br />
                          <strong>"{roomNameBanner.alternative}"</strong>
                          {roomNameBanner.suggestedDesc && (
                            <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--color-community-text)', fontWeight: 400 }}>
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
                            style={{ flex: 1, padding: '7px', background: 'var(--color-community-accent)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            바꿔서 쓰기
                          </button>
                          <button
                            onClick={() => { setRoomName(''); setRoomNameBanner(null) }}
                            style={{ flex: 1, padding: '7px', background: 'transparent', border: '1px solid #ccc', borderRadius: '8px', fontSize: '13px', color: 'var(--color-warning)', cursor: 'pointer' }}
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
                          style={{ padding: '7px 14px', background: 'transparent', border: '1px solid #EF9A9A', borderRadius: '8px', fontSize: '13px', color: 'var(--color-danger-dark)', cursor: 'pointer' }}
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
                    background: roomDescBanner.alternative ? 'var(--color-warning-bg)' : 'var(--color-danger-bg)',
                    fontSize: '13px',
                    color: roomDescBanner.alternative ? 'var(--color-warning)' : 'var(--color-danger-dark)',
                  }}>
                    {roomDescBanner.alternative ? (
                      <>
                        <div style={{ marginBottom: '8px' }}>💛 이런 소개는 어때요?<br /><strong>"{roomDescBanner.alternative}"</strong></div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => { setRoomDesc(roomDescBanner.alternative!); setRoomDescBanner(null) }}
                            style={{ flex: 1, padding: '7px', background: 'var(--color-community-accent)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            바꿔서 쓰기
                          </button>
                          <button
                            onClick={() => { setRoomDesc(''); setRoomDescBanner(null) }}
                            style={{ flex: 1, padding: '7px', background: 'transparent', border: '1px solid #ccc', borderRadius: '8px', fontSize: '13px', color: 'var(--color-warning)', cursor: 'pointer' }}
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
                          style={{ padding: '7px 14px', background: 'transparent', border: '1px solid #EF9A9A', borderRadius: '8px', fontSize: '13px', color: 'var(--color-danger-dark)', cursor: 'pointer' }}
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
                        background: roomTag === tag ? 'var(--color-community-bg)' : 'var(--color-bg-card)',
                        color: roomTag === tag ? 'var(--color-community-text)' : 'var(--color-text-muted)',
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
                  background: roomName.trim() && !creating ? 'var(--color-community-accent)' : 'var(--color-border)',
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
              </div>
            </div>
          )}

          {/* 랭킹 */}
          {activeTab === '랭킹' && (
            <div>
              {/* 랭킹 타입 선택 */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                {(['방', '성공의 말'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setRankingType(t)}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      borderRadius: '12px',
                      border: rankingType === t ? '2px solid #F59E0B' : '1.5px solid var(--color-border)',
                      background: rankingType === t ? 'var(--color-community-accent)' : 'var(--color-bg-card)',
                      color: rankingType === t ? 'white' : 'var(--color-text-muted)',
                      fontSize: '14px',
                      fontWeight: rankingType === t ? 700 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {t === '방' ? '🏠 방 랭킹' : '💬 성공의 말 랭킹'}
                  </button>
                ))}
              </div>

              {/* 기간 필터 */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                {(['전체', '연', '월', '일'] as RankingPeriod[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setRankingPeriod(p)}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: '10px',
                      border: rankingPeriod === p ? '1.5px solid #F59E0B' : '1.5px solid var(--color-border)',
                      background: rankingPeriod === p ? 'var(--color-community-bg)' : 'var(--color-bg-card)',
                      color: rankingPeriod === p ? 'var(--color-community-text)' : 'var(--color-text-muted)',
                      fontSize: '13px',
                      fontWeight: rankingPeriod === p ? 700 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* 방별 랭킹 */}
              {rankingType === '방' && <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {MOCK_RANKING[rankingPeriod].map((entry, idx) => {
                  const room = MOCK_ROOMS.find(r => r.id === entry.roomId)
                  if (!room) return null
                  const isJoined = myRooms.includes(room.id)
                  const medals = ['🥇', '🥈', '🥉']
                  const medal = medals[idx] ?? `${idx + 1}`
                  return (
                    <div
                      key={room.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px 16px',
                        background: idx === 0 ? 'var(--color-community-bg-deep)' : 'var(--color-bg-card)',
                        border: idx === 0 ? '1.5px solid #FCD34D' : '1px solid var(--color-border)',
                        borderRadius: '14px',
                      }}
                    >
                      <div style={{ fontSize: idx < 3 ? '24px' : '16px', fontWeight: 700, minWidth: '28px', textAlign: 'center', color: idx >= 3 ? 'var(--color-text-muted)' : undefined }}>
                        {medal}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{room.name}</span>
                          {isJoined && (
                            <span style={{ fontSize: '10px', color: 'var(--color-community-accent)', background: 'var(--color-community-bg-deep)', border: '1px solid #F59E0B', padding: '1px 6px', borderRadius: '999px', fontWeight: 600, flexShrink: 0 }}>
                              참여 중
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Users size={10} /> {room.members}명
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--color-community-text)', background: 'var(--color-community-bg)', padding: '1px 7px', borderRadius: '999px', fontWeight: 600 }}>
                            {entry.totalDays}일 외침
                          </span>
                        </div>
                      </div>
                      {isJoined ? (
                        <button
                          onClick={() => goToRoom(room.id)}
                          style={{ padding: '6px 13px', background: 'var(--color-community-accent)', color: 'white', border: 'none', borderRadius: '9px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                        >
                          입장
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoin(room.id)}
                          disabled={room.members >= MAX_MEMBERS}
                          style={{ padding: '6px 13px', background: room.members >= MAX_MEMBERS ? 'var(--color-border)' : 'var(--color-bg-card)', color: room.members >= MAX_MEMBERS ? 'var(--color-text-muted)' : 'var(--color-community-accent)', border: `1px solid ${room.members >= MAX_MEMBERS ? 'transparent' : 'var(--color-community-accent)'}`, borderRadius: '9px', fontSize: '12px', fontWeight: 600, cursor: room.members >= MAX_MEMBERS ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                        >
                          {room.members >= MAX_MEMBERS ? '마감' : '참여'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>}

              {/* 성공의 말 별 랭킹 */}
              {rankingType === '성공의 말' && <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {MOCK_PHRASE_RANKING[rankingPeriod].map((entry, idx) => {
                    const medals = ['🥇', '🥈', '🥉']
                    const medal = medals[idx] ?? `${idx + 1}`
                    return (
                      <div
                        key={entry.phrase}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '14px 16px',
                          background: idx === 0 ? 'var(--color-community-bg-deep)' : 'var(--color-bg-card)',
                          border: idx === 0 ? '1.5px solid #FCD34D' : '1px solid var(--color-border)',
                          borderRadius: '14px',
                        }}
                      >
                        <div style={{ fontSize: idx < 3 ? '24px' : '16px', fontWeight: 700, minWidth: '28px', textAlign: 'center', color: idx >= 3 ? 'var(--color-text-muted)' : undefined }}>
                          {medal}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: 'Georgia, serif', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.phrase}
                          </p>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>👤 {entry.userCount}명</span>
                            <span style={{ fontSize: '11px', color: 'var(--color-community-text)', background: 'var(--color-community-bg)', padding: '1px 7px', borderRadius: '999px', fontWeight: 600 }}>
                              {entry.totalDays}일 외침
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>}
            </div>
          )}
        </div>
      </div>

      {/* ── 프로필 설정 바텀시트 ── */}
      {showProfileSheet && (
        <>
          <div onClick={() => setShowProfileSheet(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', zIndex: 50,
            background: 'var(--color-bg-primary)',
            borderRadius: '20px 20px 0 0',
            padding: '20px 16px 40px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>프로필 설정</h3>
              <button onClick={() => setShowProfileSheet(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                <X size={20} color="var(--color-text-muted)" />
              </button>
            </div>

            {/* 프로필 이미지 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
              <div onClick={() => photoInputRef.current?.click()} style={{ position: 'relative', cursor: 'pointer' }}>
                {editImageData ? (
                  <img src={editImageData} alt="프로필" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #F59E0B' }} />
                ) : (
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--color-community-bg)', border: '3px dashed #F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserCircle size={40} color="var(--color-community-accent)" />
                  </div>
                )}
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: '26px', height: '26px', borderRadius: '50%', background: 'var(--color-community-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                  <Camera size={13} color="white" />
                </div>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px' }}>사진을 탭해서 변경</p>
            </div>

            {/* 닉네임 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '8px' }}>닉네임</label>
              <input
                value={editNickname}
                onChange={e => setEditNickname(e.target.value)}
                placeholder="방에서 사용할 이름"
                maxLength={12}
                style={{ width: '100%', padding: '13px 14px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '15px', color: 'var(--color-text-primary)', outline: 'none', boxSizing: 'border-box' }}
              />
              {userProfile.googleEmail && (
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                  Google 계정: <span style={{ color: 'var(--color-text-primary)' }}>{userProfile.googleEmail}</span>
                </p>
              )}
              {!userProfile.googleEmail && (
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>구글 로그인 후 이름이 자동으로 연결돼요</p>
              )}
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={profileSaving}
              style={{ width: '100%', padding: '14px', background: 'var(--color-community-accent)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
            >
              {profileSaving ? '저장 중...' : '프로필 저장'}
            </button>

            <input type="file" accept="image/*" ref={photoInputRef} style={{ display: 'none' }} onChange={handleProfileImageChange} />
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </AppLayout>
  )
}
