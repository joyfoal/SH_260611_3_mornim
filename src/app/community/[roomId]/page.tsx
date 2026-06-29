'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AppLayout } from '@/components/ui/AppLayout'
import { ChevronLeft, Trophy, BookmarkPlus, Share2, X, Check, UserCircle, LogOut } from 'lucide-react'
import { getAffirmations, saveAffirmation, type Affirmation } from '@/lib/storage'

type RoomTab = '성공의 말 나누기' | '함께 도전'

const MOCK_ROOM_INFO: Record<string, { name: string }> = {
  r1: { name: '아침 확언 클럽' },
  r2: { name: '취업 성공 방' },
  r3: { name: '자존감 키우기' },
  r4: { name: '다이어트 확언단' },
}

type EmojiKey = '😍' | '👏' | '🔥' | '💪' | '✨' | '🌟' | '💛' | '🙌' | '💯' | '💫' | '🌿' | '🌈'
type Reactions = Record<EmojiKey, number>

interface FeedItem {
  id: string
  nickname: string
  initial: string
  profileImage?: string | null
  content: string
  daysCount: number
  reactions: Reactions
  createdAt: string
  isMe?: boolean
}

interface Participant {
  nickname: string
  initial: string
  daysCount: number
  reactions: Reactions
}

interface Challenge {
  content: string
  participants: Participant[]
}

interface UserProfile {
  nickname: string
  profileImage: string | null
  googleEmail?: string
}

const ZERO_REACTIONS: Reactions = { '😍': 0, '👏': 0, '🔥': 0, '💪': 0, '✨': 0, '🌟': 0, '💛': 0, '🙌': 0, '💯': 0, '💫': 0, '🌿': 0, '🌈': 0 }

const MOCK_FEED: FeedItem[] = [
  { id: 'f1', nickname: '햇살이', initial: '햇', content: '나는 오늘도 최선을 다하고 있다', daysCount: 23, reactions: { ...ZERO_REACTIONS, '😍': 4, '👏': 2, '🔥': 1, '🙌': 3 }, createdAt: '2시간 전' },
  { id: 'f2', nickname: '별빛나', initial: '별', content: '나는 매일 성장하고 있다', daysCount: 11, reactions: { ...ZERO_REACTIONS, '😍': 1, '👏': 3, '💛': 2, '✨': 1 }, createdAt: '5시간 전' },
  { id: 'f3', nickname: '파란봄', initial: '파', content: '나는 나를 믿는다', daysCount: 8, reactions: { ...ZERO_REACTIONS, '💪': 1, '🌈': 2 }, createdAt: '어제' },
]

const MOCK_CHALLENGE: Challenge[] = [
  {
    content: '나는 매일 성장하고 있다',
    participants: [
      { nickname: '별빛나', initial: '별', daysCount: 11, reactions: { ...ZERO_REACTIONS, '😍': 1, '👏': 3, '💪': 2 } },
      { nickname: '하늘맑음', initial: '하', daysCount: 9, reactions: { ...ZERO_REACTIONS, '🔥': 1, '✨': 2 } },
    ],
  },
  {
    content: '나는 오늘도 최선을 다하고 있다',
    participants: [
      { nickname: '햇살이', initial: '햇', daysCount: 23, reactions: { ...ZERO_REACTIONS, '😍': 4, '👏': 2, '🔥': 1, '🙌': 3 } },
    ],
  },
  {
    content: '나는 나를 믿는다',
    participants: [
      { nickname: '파란봄', initial: '파', daysCount: 8, reactions: { ...ZERO_REACTIONS, '💪': 1, '🌈': 2 } },
    ],
  },
]

const EMOJIS: Array<{ emoji: EmojiKey; label: string }> = [
  { emoji: '😍', label: '멋져요' },
  { emoji: '👏', label: '잘했어요' },
  { emoji: '🔥', label: '대단해요' },
  { emoji: '💪', label: '할 수 있어요' },
  { emoji: '✨', label: '빛나요' },
  { emoji: '🌟', label: '최고예요' },
  { emoji: '💛', label: '응원해요' },
  { emoji: '🙌', label: '화이팅' },
  { emoji: '💯', label: '완벽해요' },
  { emoji: '💫', label: '반짝여요' },
  { emoji: '🌿', label: '성장해요' },
  { emoji: '🌈', label: '희망이에요' },
]

function totalReactions(r: Reactions) {
  return Object.values(r).reduce((s, v) => s + v, 0)
}

function totalDays(challenge: Challenge) {
  return challenge.participants.reduce((s, p) => s + p.daysCount, 0)
}


function Avatar({ nickname, initial, profileImage, size = 36, isMe = false }: {
  nickname: string; initial: string; profileImage?: string | null; size?: number; isMe?: boolean
}) {
  if (profileImage) {
    return (
      <img
        src={profileImage}
        alt={nickname}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: isMe ? '2px solid #F59E0B' : 'none' }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: isMe ? '#F59E0B' : '#FEF3C7',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700,
      color: isMe ? 'white' : '#92400E',
      flexShrink: 0,
    }}>
      {initial}
    </div>
  )
}

export default function RoomPage() {
  const router = useRouter()
  const params = useParams()
  const roomId = params.roomId as string
  const room = MOCK_ROOM_INFO[roomId] ?? { name: '방' }

  const [activeTab, setActiveTab] = useState<RoomTab>('성공의 말 나누기')
  const [feed, setFeed] = useState<FeedItem[]>(MOCK_FEED)
  const [challenges, setChallenges] = useState<Challenge[]>(MOCK_CHALLENGE)
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>(null)

  // 사용자 프로필
  const [userProfile, setUserProfile] = useState<UserProfile>({ nickname: '', profileImage: null })

  // 공유하기
  const [showShareSheet, setShowShareSheet] = useState(false)
  const [myPhrases, setMyPhrases] = useState<Affirmation[]>([])
  const [sharedIds, setSharedIds] = useState<string[]>([])

  // 가져오기
  const [importedContents, setImportedContents] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState('')

  // 내 칭찬 선택 상태 (토글)
  const [myFeedReactions, setMyFeedReactions] = useState<Record<string, Set<EmojiKey>>>({})
  const [myChallengeReactions, setMyChallengeReactions] = useState<Record<string, Set<EmojiKey>>>({})

  // 방 나가기 확인 모달
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  // localStorage에서 프로필 불러오기
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ealo-user-profile')
      if (saved) setUserProfile(JSON.parse(saved) as UserProfile)
    } catch {}
  }, [])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 2000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const showToast = (msg: string) => setToast(msg)

  // 방 나가기
  const handleLeaveRoom = () => {
    try {
      const saved = localStorage.getItem('ealo-my-rooms')
      if (saved) {
        const rooms = JSON.parse(saved) as string[]
        localStorage.setItem('ealo-my-rooms', JSON.stringify(rooms.filter(r => r !== roomId)))
      }
    } catch {}
    router.back()
  }

  const handleOpenShare = () => {
    setMyPhrases(getAffirmations())
    setShowShareSheet(true)
  }

  const handleSharePhrase = (aff: Affirmation) => {
    if (sharedIds.length >= 3 || sharedIds.includes(aff.id)) return
    const displayName = userProfile.nickname || '나'
    const newItem: FeedItem = {
      id: `my-${aff.id}`,
      nickname: displayName,
      initial: displayName[0],
      profileImage: userProfile.profileImage,
      content: aff.text,
      daysCount: aff.completedDates.length,
      reactions: { ...ZERO_REACTIONS },
      createdAt: '방금',
      isMe: true,
    }
    setFeed(prev => [newItem, ...prev])
    setSharedIds(prev => [...prev, aff.id])
    setShowShareSheet(false)
    showToast('성공의 말을 방에 공유했어요 ✨')
  }

  const handleImport = (content: string) => {
    const existing = getAffirmations()
    if (existing.some(a => a.text === content)) {
      showToast('이미 내 성공의 말에 있어요')
      return
    }
    const now = new Date().toISOString()
    saveAffirmation({ id: `imported-${Date.now()}`, text: content, category: '나 자신', createdAt: now, completedDates: [] })
    setImportedContents(prev => new Set(prev).add(content))
    showToast('내 성공의 말에 추가됐어요 ✨')
  }

  const handleFeedReaction = (feedId: string, emoji: EmojiKey) => {
    const selected = myFeedReactions[feedId] ?? new Set<EmojiKey>()
    const isOn = selected.has(emoji)
    const next = new Set(selected)
    if (isOn) { next.delete(emoji) } else { next.add(emoji) }
    setMyFeedReactions(r => ({ ...r, [feedId]: next }))
    setFeed(prev => prev.map(item =>
      item.id === feedId
        ? { ...item, reactions: { ...item.reactions, [emoji]: Math.max(0, item.reactions[emoji] + (isOn ? -1 : 1)) } }
        : item
    ))
  }

  const handleChallengeReaction = (challengeContent: string, participantNickname: string, emoji: EmojiKey) => {
    const key = `${challengeContent}::${participantNickname}`
    const selected = myChallengeReactions[key] ?? new Set<EmojiKey>()
    const isOn = selected.has(emoji)
    const next = new Set(selected)
    if (isOn) { next.delete(emoji) } else { next.add(emoji) }
    setMyChallengeReactions(r => ({ ...r, [key]: next }))
    setChallenges(prevChallenges => prevChallenges.map(c =>
      c.content === challengeContent
        ? { ...c, participants: c.participants.map(p =>
            p.nickname === participantNickname
              ? { ...p, reactions: { ...p.reactions, [emoji]: Math.max(0, p.reactions[emoji] + (isOn ? -1 : 1)) } }
              : p
          )}
        : c
    ))
  }

  const sortedChallenges = [...challenges].sort((a, b) => totalDays(b) - totalDays(a))

  const tabStyle = (tab: RoomTab) => ({
    flex: 1,
    padding: '10px 0',
    background: 'none',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid #F59E0B' : '2px solid transparent',
    color: activeTab === tab ? '#92400E' : 'var(--color-text-muted)',
    fontSize: '14px',
    fontWeight: activeTab === tab ? 700 : 400,
    cursor: 'pointer',
  })

  return (
    <AppLayout activeTab="함께">
      <div style={{ paddingBottom: '32px' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 16px 0' }}>
          <button
            onClick={() => router.back()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
          >
            <ChevronLeft size={22} color="var(--color-text-primary)" />
          </button>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', flex: 1 }}>
            {room.name}
          </h1>

          {/* 닉네임 + 구글아이디 + 프로필 이미지 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                alt="내 프로필"
                style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #F59E0B', flexShrink: 0 }}
              />
            ) : (
              <UserCircle size={28} color={userProfile.nickname ? '#F59E0B' : 'var(--color-text-muted)'} style={{ flexShrink: 0 }} />
            )}
          </div>
        </div>

        {/* 내부 탭 */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', margin: '16px 0 0' }}>
          {(['성공의 말 나누기', '함께 도전'] as RoomTab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(tab)}>
              {tab}
            </button>
          ))}
        </div>

        <div style={{ padding: '16px' }}>
          {/* 성공의 말 나누기 피드 */}
          {activeTab === '성공의 말 나누기' && (
            <div>
              {/* 공유하기 버튼 */}
              <button
                onClick={handleOpenShare}
                disabled={sharedIds.length >= 3 || !userProfile.nickname}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: sharedIds.length >= 3 || !userProfile.nickname ? 'var(--color-border)' : '#F59E0B',
                  color: sharedIds.length >= 3 || !userProfile.nickname ? 'var(--color-text-muted)' : 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: sharedIds.length >= 3 || !userProfile.nickname ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px',
                  marginBottom: '14px',
                }}
              >
                <Share2 size={15} />
                {sharedIds.length >= 3 ? '최대 3개까지 공유할 수 있어요' : '성공의 말 공유하기'}
              </button>

              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: '16px' }}>
                자유 댓글 없이 정해진 응원만 보낼 수 있어요
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '14px' }}>
                {feed.map(item => (
                  <div
                    key={item.id}
                    style={{
                      background: 'var(--color-bg-card)',
                      borderRadius: '16px',
                      padding: '16px',
                      border: item.isMe ? '1.5px solid #F59E0B' : '1px solid var(--color-border)',
                    }}
                  >
                    {/* 작성자 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <Avatar
                        nickname={item.nickname}
                        initial={item.initial}
                        profileImage={item.profileImage}
                        size={36}
                        isMe={item.isMe}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {item.nickname}{item.isMe && ' (나)'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{item.createdAt}</div>
                      </div>
                      <span style={{
                        marginLeft: 'auto', fontSize: '11px', fontWeight: 600,
                        color: '#92400E', background: '#FEF3C7', padding: '3px 10px', borderRadius: '999px',
                      }}>
                        {item.daysCount}일 외침
                      </span>
                    </div>

                    {/* 성공의 말 문구 */}
                    <p style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '16px',
                      color: 'var(--color-text-primary)',
                      lineHeight: 1.6,
                      marginBottom: '14px',
                      padding: '12px 14px',
                      background: '#FFFBEB',
                      borderRadius: '10px',
                      borderLeft: '3px solid #F59E0B',
                    }}>
                      {item.content}
                    </p>

                    {/* 칭찬 집계 */}
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
                      {EMOJIS.filter(e => item.reactions[e.emoji] > 0).map(e => (
                        <span key={e.emoji} style={{ marginRight: '8px' }}>{e.emoji}{item.reactions[e.emoji]}</span>
                      ))}
                      {totalReactions(item.reactions) === 0 && '아직 응원이 없어요'}
                    </div>

                    {/* 칭찬 버튼 한 줄 + 가져오기 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', flex: 1, scrollbarWidth: 'none' }}>
                        {!item.isMe && EMOJIS.map(e => {
                          const isOn = (myFeedReactions[item.id] ?? new Set()).has(e.emoji)
                          return (
                            <button
                              key={e.emoji}
                              onClick={() => handleFeedReaction(item.id, e.emoji)}
                              style={{
                                flexShrink: 0,
                                padding: '6px 10px',
                                background: isOn ? '#F59E0B' : '#FEF3C7',
                                border: `1px solid ${isOn ? '#D97706' : '#FCD34D'}`,
                                borderRadius: '999px',
                                fontSize: '12px',
                                color: isOn ? 'white' : '#92400E',
                                cursor: 'pointer',
                                fontWeight: isOn ? 700 : 500,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {e.emoji} {e.label}
                            </button>
                          )
                        })}
                        {item.isMe && (
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>내가 공유한 성공의 말</span>
                        )}
                      </div>

                      {/* 가져오기 버튼 */}
                      {!item.isMe && (
                        <button
                          onClick={() => handleImport(item.content)}
                          disabled={importedContents.has(item.content)}
                          title="내 성공의 말로 가져오기"
                          style={{
                            flexShrink: 0,
                            padding: '6px 10px',
                            background: importedContents.has(item.content) ? '#D1FAE5' : 'var(--color-bg-card)',
                            border: importedContents.has(item.content) ? '1px solid #6EE7B7' : '1px solid var(--color-border)',
                            borderRadius: '10px',
                            cursor: importedContents.has(item.content) ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            color: importedContents.has(item.content) ? '#059669' : 'var(--color-text-muted)',
                            fontWeight: 500,
                          }}
                        >
                          {importedContents.has(item.content)
                            ? <><Check size={13} /> 가져옴</>
                            : <><BookmarkPlus size={13} /> 가져오기</>
                          }
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 방 지우기 */}
              <button
                onClick={() => setShowLeaveConfirm(true)}
                style={{
                  width: '100%',
                  padding: '13px',
                  background: 'none',
                  border: '1px solid #FECACA',
                  borderRadius: '12px',
                  fontSize: '14px',
                  color: '#EF5350',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px',
                  marginTop: '8px',
                }}
              >
                <LogOut size={15} />
                방 지우기
              </button>
            </div>
          )}

          {/* 함께 도전 챌린지 */}
          {activeTab === '함께 도전' && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sortedChallenges.map((challenge, idx) => {
                  const isFirst = idx === 0
                  const days = totalDays(challenge)
                  const isExpanded = expandedChallenge === challenge.content

                  const sortedParticipants = [...challenge.participants].sort(
                    (a, b) => totalReactions(a.reactions) - totalReactions(b.reactions)
                  )

                  return (
                    <div key={challenge.content}>
                      <button
                        onClick={() => setExpandedChallenge(isExpanded ? null : challenge.content)}
                        style={{
                          width: '100%',
                          background: 'var(--color-bg-card)',
                          borderRadius: isExpanded ? '16px 16px 0 0' : '16px',
                          padding: '16px',
                          border: isFirst ? '2px solid #F59E0B' : '1px solid var(--color-border)',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        {isFirst && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                            <Trophy size={14} color="#F59E0B" />
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#F59E0B' }}>1위</span>
                          </div>
                        )}
                        <p style={{
                          fontFamily: 'Georgia, serif',
                          fontSize: '15px',
                          color: 'var(--color-text-primary)',
                          fontWeight: 600,
                          marginBottom: '12px',
                          lineHeight: 1.5,
                        }}>
                          {challenge.content}
                        </p>
                        <div style={{ display: 'flex', gap: '16px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            참여 {challenge.participants.length}명
                          </span>
                          <span style={{ fontSize: '12px', color: '#92400E', fontWeight: 600 }}>
                            총 {days}일 외침
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div style={{
                          background: 'var(--color-bg-card)',
                          borderRadius: '0 0 16px 16px',
                          padding: '12px 16px 16px',
                          border: '1px solid var(--color-border)',
                          borderTop: 'none',
                        }}>
                          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '12px', textAlign: 'center' }}>
                            칭찬이 적은 순서로 보여요
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {sortedParticipants.map(participant => (
                              <div key={participant.nickname}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                  <div style={{
                                    width: '34px', height: '34px', borderRadius: '50%',
                                    background: '#FEF3C7', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#92400E',
                                  }}>
                                    {participant.initial}
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                      {participant.nickname}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#92400E' }}>
                                      {participant.daysCount}일째
                                    </div>
                                  </div>
                                  <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                    {totalReactions(participant.reactions) === 0
                                      ? '아직 칭찬이 없어요'
                                      : EMOJIS.filter(e => participant.reactions[e.emoji] > 0)
                                          .map(e => `${e.emoji}${participant.reactions[e.emoji]}`).join(' ')
                                    }
                                  </div>
                                </div>
                                {/* 챌린지 칭찬 버튼 한 줄 */}
                                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingLeft: '44px', scrollbarWidth: 'none' }}>
                                  {EMOJIS.map(e => {
                                    const cKey = `${challenge.content}::${participant.nickname}`
                                    const isOn = (myChallengeReactions[cKey] ?? new Set()).has(e.emoji)
                                    return (
                                      <button
                                        key={e.emoji}
                                        onClick={() => handleChallengeReaction(challenge.content, participant.nickname, e.emoji)}
                                        style={{
                                          flexShrink: 0,
                                          padding: '5px 10px',
                                          background: isOn ? '#F59E0B' : '#FEF3C7',
                                          border: `1px solid ${isOn ? '#D97706' : '#FCD34D'}`,
                                          borderRadius: '999px',
                                          fontSize: '11px',
                                          color: isOn ? 'white' : '#92400E',
                                          cursor: 'pointer',
                                          fontWeight: isOn ? 700 : 500,
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        {e.emoji} {e.label}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 공유하기 바텀시트 ── */}
      {showShareSheet && (
        <>
          <div onClick={() => setShowShareSheet(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
            background: 'var(--color-bg-primary)',
            borderRadius: '20px 20px 0 0',
            padding: '20px 16px 40px',
            maxHeight: '70vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                내 성공의 말 공유하기
              </h3>
              <button onClick={() => setShowShareSheet(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                <X size={20} color="var(--color-text-muted)" />
              </button>
            </div>

            {sharedIds.length >= 3 && (
              <p style={{ fontSize: '13px', color: '#92400E', background: '#FEF3C7', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px' }}>
                방당 최대 3개까지 공유할 수 있어요
              </p>
            )}

            {myPhrases.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>💬</div>
                <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                  아직 저장한 성공의 말이 없어요
                </p>
                <button
                  onClick={() => { setShowShareSheet(false); router.push('/create') }}
                  style={{ padding: '10px 24px', background: '#F59E0B', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                >
                  성공의 말 만들러 가기
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {myPhrases.map(aff => {
                  const alreadyShared = sharedIds.includes(aff.id)
                  return (
                    <button
                      key={aff.id}
                      onClick={() => handleSharePhrase(aff)}
                      disabled={alreadyShared || sharedIds.length >= 3}
                      style={{
                        padding: '16px',
                        background: alreadyShared ? '#F0FDF4' : 'var(--color-bg-card)',
                        border: alreadyShared ? '1px solid #6EE7B7' : '1px solid var(--color-border)',
                        borderRadius: '16px',
                        textAlign: 'left',
                        cursor: alreadyShared || sharedIds.length >= 3 ? 'default' : 'pointer',
                        opacity: !alreadyShared && sharedIds.length >= 3 ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p style={{
                          fontFamily: 'Georgia, serif',
                          fontSize: '14px',
                          color: 'var(--color-text-primary)',
                          marginBottom: '4px',
                          lineHeight: 1.5,
                        }}>
                          {aff.text}
                        </p>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          {aff.category} · {aff.completedDates.length}일 외침
                        </span>
                      </div>
                      {alreadyShared
                        ? <Check size={16} color="#059669" style={{ flexShrink: 0 }} />
                        : <span style={{ fontSize: '12px', color: '#F59E0B', fontWeight: 600, flexShrink: 0 }}>공유</span>
                      }
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── 방 지우기 확인 모달 ── */}
      {showLeaveConfirm && (
        <>
          <div onClick={() => setShowLeaveConfirm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
            background: 'var(--color-bg-primary)',
            borderRadius: '20px 20px 0 0',
            padding: '28px 16px 40px',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>🗑️</div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                방을 지울까요?
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                지우면 이 방의 성공의 말 공유가 취소되고<br />내 방 목록에서도 사라져요.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowLeaveConfirm(false)}
                style={{
                  flex: 1, padding: '14px',
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '14px',
                  fontSize: '15px', fontWeight: 600,
                  color: 'var(--color-text-muted)', cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={handleLeaveRoom}
                style={{
                  flex: 1, padding: '14px',
                  background: '#EF5350',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '15px', fontWeight: 700,
                  color: 'white', cursor: 'pointer',
                }}
              >
                지우기
              </button>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.75)', color: 'white',
          padding: '10px 20px', borderRadius: '999px',
          fontSize: '13px', fontWeight: 500,
          zIndex: 100, whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          {toast}
        </div>
      )}

      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </AppLayout>
  )
}
