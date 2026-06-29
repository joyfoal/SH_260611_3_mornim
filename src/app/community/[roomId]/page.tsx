'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AppLayout } from '@/components/ui/AppLayout'
import { ChevronLeft, Trophy } from 'lucide-react'

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
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {/* 작성자 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '15px', fontWeight: 700, color: '#92400E', flexShrink: 0,
                      }}>
                        {item.initial}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.nickname}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{item.createdAt}</div>
                      </div>
                      <span style={{
                        marginLeft: 'auto', fontSize: '11px', fontWeight: 600,
                        color: '#92400E', background: '#FEF3C7', padding: '3px 10px', borderRadius: '999px',
                      }}>
                        {item.daysCount}일 외침
                      </span>
                    </div>

                    {/* 확언 문구 */}
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

                    {/* 칭찬 버튼 */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {EMOJIS.map(e => (
                        <button
                          key={e.emoji}
                          onClick={() => handleFeedReaction(item.id, e.emoji)}
                          style={{
                            padding: '6px 12px',
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
                          borderRadius: '16px',
                          padding: '16px',
                          border: isFirst ? '2px solid #F59E0B' : '1px solid var(--color-border)',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        {/* 1위 뱃지 */}
                        {isFirst && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                            <Trophy size={14} color="#F59E0B" />
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#F59E0B' }}>1위</span>
                          </div>
                        )}

                        {/* 문구 */}
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

                        {/* 통계 */}
                        <div style={{ display: 'flex', gap: '16px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            참여 {challenge.participants.length}명
                          </span>
                          <span style={{ fontSize: '12px', color: '#92400E', fontWeight: 600 }}>
                            총 {days}일 외침
                          </span>
                        </div>
                      </button>

                      {/* 참여자 상세 (펼침) */}
                      {isExpanded && (
                        <div style={{
                          background: 'var(--color-bg-card)',
                          borderRadius: '0 0 16px 16px',
                          padding: '12px 16px 16px',
                          border: '1px solid var(--color-border)',
                          borderTop: 'none',
                          marginTop: '-8px',
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
    </AppLayout>
  )
}
