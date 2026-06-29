'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AppLayout } from '@/components/ui/AppLayout'
import { ChevronLeft, Trophy, BookmarkPlus, Share2, X, Check } from 'lucide-react'
import { getAffirmations, saveAffirmation, type Affirmation } from '@/lib/storage'

type RoomTab = '성공의 말 나누기' | '함께 도전'

const MOCK_ROOM_INFO: Record<string, { name: string }> = {
  r1: { name: '아침 확언 클럽' },
  r2: { name: '취업 성공 방' },
  r3: { name: '자존감 키우기' },
  r4: { name: '다이어트 확언단' },
}

type Reactions = { '😍': number; '👏': number; '🔥': number; '💪': number }

interface FeedItem {
  id: string
  nickname: string
  initial: string
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

const MOCK_FEED: FeedItem[] = [
  { id: 'f1', nickname: '햇살이', initial: '햇', content: '나는 오늘도 최선을 다하고 있다', daysCount: 23, reactions: { '😍': 4, '👏': 2, '🔥': 1, '💪': 0 }, createdAt: '2시간 전' },
  { id: 'f2', nickname: '별빛나', initial: '별', content: '나는 매일 성장하고 있다', daysCount: 11, reactions: { '😍': 1, '👏': 3, '🔥': 0, '💪': 2 }, createdAt: '5시간 전' },
  { id: 'f3', nickname: '파란봄', initial: '파', content: '나는 나를 믿는다', daysCount: 8, reactions: { '😍': 0, '👏': 0, '🔥': 0, '💪': 1 }, createdAt: '어제' },
]

const MOCK_CHALLENGE: Challenge[] = [
  {
    content: '나는 매일 성장하고 있다',
    participants: [
      { nickname: '별빛나', initial: '별', daysCount: 11, reactions: { '😍': 1, '👏': 3, '🔥': 0, '💪': 2 } },
      { nickname: '하늘맑음', initial: '하', daysCount: 9, reactions: { '😍': 0, '👏': 0, '🔥': 1, '💪': 0 } },
    ],
  },
  {
    content: '나는 오늘도 최선을 다하고 있다',
    participants: [
      { nickname: '햇살이', initial: '햇', daysCount: 23, reactions: { '😍': 4, '👏': 2, '🔥': 1, '💪': 0 } },
    ],
  },
  {
    content: '나는 나를 믿는다',
    participants: [
      { nickname: '파란봄', initial: '파', daysCount: 8, reactions: { '😍': 0, '👏': 0, '🔥': 0, '💪': 1 } },
    ],
  },
]

const EMOJIS: Array<{ emoji: keyof Reactions; label: string }> = [
  { emoji: '😍', label: '멋져요' },
  { emoji: '👏', label: '잘했어요' },
  { emoji: '🔥', label: '대단해요' },
  { emoji: '💪', label: '할 수 있어요' },
]

function totalReactions(r: Reactions) {
  return r['😍'] + r['👏'] + r['🔥'] + r['💪']
}

function totalDays(challenge: Challenge) {
  return challenge.participants.reduce((s, p) => s + p.daysCount, 0)
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

  // 공유하기
  const [showShareSheet, setShowShareSheet] = useState(false)
  const [myPhrases, setMyPhrases] = useState<Affirmation[]>([])
  const [sharedIds, setSharedIds] = useState<string[]>([])

  // 가져오기
  const [importedContents, setImportedContents] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 2000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const showToast = (msg: string) => setToast(msg)

  const handleOpenShare = () => {
    setMyPhrases(getAffirmations())
    setShowShareSheet(true)
  }

  const handleSharePhrase = (aff: Affirmation) => {
    if (sharedIds.length >= 3 || sharedIds.includes(aff.id)) return
    const newItem: FeedItem = {
      id: `my-${aff.id}`,
      nickname: '나',
      initial: '나',
      content: aff.text,
      daysCount: aff.completedDates.length,
      reactions: { '😍': 0, '👏': 0, '🔥': 0, '💪': 0 },
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

  const handleFeedReaction = (feedId: string, emoji: keyof Reactions) => {
    setFeed(prev => prev.map(item =>
      item.id === feedId
        ? { ...item, reactions: { ...item.reactions, [emoji]: item.reactions[emoji] + 1 } }
        : item
    ))
  }

  const handleChallengeReaction = (challengeContent: string, participantNickname: string, emoji: keyof Reactions) => {
    setChallenges(prev => prev.map(c =>
      c.content === challengeContent
        ? {
            ...c,
            participants: c.participants.map(p =>
              p.nickname === participantNickname
                ? { ...p, reactions: { ...p.reactions, [emoji]: p.reactions[emoji] + 1 } }
                : p
            ),
          }
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
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {room.name}
          </h1>
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
                disabled={sharedIds.length >= 3}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: sharedIds.length >= 3 ? 'var(--color-border)' : '#F59E0B',
                  color: sharedIds.length >= 3 ? 'var(--color-text-muted)' : 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: sharedIds.length >= 3 ? 'not-allowed' : 'pointer',
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: item.isMe ? '#F59E0B' : '#FEF3C7',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '15px', fontWeight: 700,
                        color: item.isMe ? 'white' : '#92400E',
                        flexShrink: 0,
                      }}>
                        {item.initial}
                      </div>
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

                    {/* 칭찬 버튼 + 가져오기 */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
                        {!item.isMe && EMOJIS.map(e => (
                          <button
                            key={e.emoji}
                            onClick={() => handleFeedReaction(item.id, e.emoji)}
                            style={{
                              padding: '6px 10px',
                              background: '#FEF3C7',
                              border: '1px solid #FCD34D',
                              borderRadius: '999px',
                              fontSize: '12px',
                              color: '#92400E',
                              cursor: 'pointer',
                              fontWeight: 500,
                            }}
                          >
                            {e.emoji} {e.label}
                          </button>
                        ))}
                        {item.isMe && (
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>내가 공유한 성공의 말</span>
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
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingLeft: '44px' }}>
                                  {EMOJIS.map(e => (
                                    <button
                                      key={e.emoji}
                                      onClick={() => handleChallengeReaction(challenge.content, participant.nickname, e.emoji)}
                                      style={{
                                        padding: '5px 10px',
                                        background: '#FEF3C7',
                                        border: '1px solid #FCD34D',
                                        borderRadius: '999px',
                                        fontSize: '11px',
                                        color: '#92400E',
                                        cursor: 'pointer',
                                        fontWeight: 500,
                                      }}
                                    >
                                      {e.emoji} {e.label}
                                    </button>
                                  ))}
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

      {/* 공유하기 바텀시트 */}
      {showShareSheet && (
        <>
          <div
            onClick={() => setShowShareSheet(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }}
          />
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
                        padding: '14px',
                        background: alreadyShared ? '#F0FDF4' : 'var(--color-bg-card)',
                        border: alreadyShared ? '1px solid #6EE7B7' : '1px solid var(--color-border)',
                        borderRadius: '12px',
                        textAlign: 'left',
                        cursor: alreadyShared || sharedIds.length >= 3 ? 'default' : 'pointer',
                        opacity: !alreadyShared && sharedIds.length >= 3 ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
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
    </AppLayout>
  )
}
