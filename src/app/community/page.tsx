'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/ui/AppLayout'
import { Users, Plus, ChevronRight, CheckCircle } from 'lucide-react'

type CommunityTab = '방 둘러보기' | '내 방' | '방 만들기'

const ALL_TAGS = ['전체', '아침 확언', '다이어트', '취업준비', '자존감', '돈과 풍요']

const MOCK_ROOMS = [
  { id: 'r1', name: '아침 확언 클럽', desc: '매일 아침 확언으로 하루를 시작해요', tags: ['아침 확언'], members: 24, streakDays: 12 },
  { id: 'r2', name: '취업 성공 방', desc: '취업 목표를 가진 분들과 함께해요', tags: ['취업준비'], members: 18, streakDays: 7 },
  { id: 'r3', name: '자존감 키우기', desc: '나를 사랑하는 연습', tags: ['자존감'], members: 31, streakDays: 20 },
  { id: 'r4', name: '다이어트 확언단', desc: '건강한 몸을 향한 긍정 확언 모임', tags: ['다이어트'], members: 15, streakDays: 5 },
]

const MOCK_MY_ROOMS = ['r1', 'r3']

export default function CommunityPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<CommunityTab>('방 둘러보기')
  const [selectedTag, setSelectedTag] = useState('전체')
  const [myRooms, setMyRooms] = useState<string[]>(MOCK_MY_ROOMS)
  const [roomName, setRoomName] = useState('')
  const [roomDesc, setRoomDesc] = useState('')
  const [roomTags, setRoomTags] = useState<string[]>([])

  const filteredRooms = MOCK_ROOMS.filter(r =>
    selectedTag === '전체' || r.tags.includes(selectedTag)
  ).filter(r => !myRooms.includes(r.id))

  const myRoomData = MOCK_ROOMS.filter(r => myRooms.includes(r.id))

  const handleJoin = (roomId: string) => {
    setMyRooms(prev => [...prev, roomId])
    setActiveTab('내 방')
  }

  const handleCreateRoom = () => {
    if (!roomName.trim()) return
    alert('방이 만들어졌어요! (실제 저장은 추후 연동 예정)')
    setRoomName('')
    setRoomDesc('')
    setRoomTags([])
    setActiveTab('내 방')
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

        {/* 상단 탭 */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '20px' }}>
          {(['방 둘러보기', '내 방', '방 만들기'] as CommunityTab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(tab)}>
              {tab}
            </button>
          ))}
        </div>

        <div style={{ padding: '0 16px' }}>
          {/* 방 둘러보기 */}
          {activeTab === '방 둘러보기' && (
            <div>
              {/* 태그 필터 */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '4px' }}>
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
                  모든 방에 참여 중이에요 🎉
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredRooms.map(room => (
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
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Users size={12} /> {room.members}명
                          </span>
                          <span style={{ fontSize: '12px', color: '#92400E', background: '#FEF3C7', padding: '2px 8px', borderRadius: '999px', fontWeight: 500 }}>
                            연속 {room.streakDays}일째 🔥
                          </span>
                        </div>
                        <button
                          onClick={() => handleJoin(room.id)}
                          style={{
                            padding: '7px 16px',
                            background: '#F59E0B',
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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

          {/* 방 만들기 */}
          {activeTab === '방 만들기' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '8px' }}>
                  방 이름 *
                </label>
                <input
                  value={roomName}
                  onChange={e => setRoomName(e.target.value)}
                  placeholder="예: 아침 확언 클럽"
                  maxLength={20}
                  style={{
                    width: '100%',
                    padding: '13px 14px',
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    fontSize: '15px',
                    color: 'var(--color-text-primary)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '8px' }}>
                  한 줄 소개
                </label>
                <input
                  value={roomDesc}
                  onChange={e => setRoomDesc(e.target.value)}
                  placeholder="이 방은 어떤 방인가요?"
                  maxLength={40}
                  style={{
                    width: '100%',
                    padding: '13px 14px',
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    fontSize: '15px',
                    color: 'var(--color-text-primary)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '28px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '8px' }}>
                  태그 선택 (복수 선택 가능)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {ALL_TAGS.filter(t => t !== '전체').map(tag => (
                    <button
                      key={tag}
                      onClick={() => setRoomTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '999px',
                        border: roomTags.includes(tag) ? '1.5px solid #F59E0B' : '1.5px solid var(--color-border)',
                        background: roomTags.includes(tag) ? '#FEF3C7' : 'var(--color-bg-card)',
                        color: roomTags.includes(tag) ? '#92400E' : 'var(--color-text-muted)',
                        fontSize: '13px',
                        fontWeight: roomTags.includes(tag) ? 600 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={!roomName.trim()}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: roomName.trim() ? '#F59E0B' : 'var(--color-border)',
                  color: roomName.trim() ? 'white' : 'var(--color-text-muted)',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: roomName.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Plus size={18} />
                방 만들기
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
