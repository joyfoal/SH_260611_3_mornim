export function SwirlEmblem({ size = 230, inset = 28 }: { size?: number; inset?: number }) {
  return (
    <div
      className="swirl-emblem"
      style={{ position: 'relative', width: size, height: size, animation: 'floatY 5s ease-in-out infinite' }}
    >
      <div
        style={{
          position: 'absolute', inset: 0, borderRadius: '50%', filter: 'blur(2px)',
          background: 'conic-gradient(from 0deg, #F3E0AE, #BA7517, #FBE9C6, #A8600A, #E6C079, #8A5207, #F3E0AE, #BA7517, #FBE9C6, #A8600A, #E6C079, #8A5207, #F3E0AE)',
          animation: 'swirlSpin 14s linear infinite',
        }}
      />
      <div
        style={{
          position: 'absolute', inset, borderRadius: '50%', mixBlendMode: 'screen', opacity: 0.85,
          background: 'conic-gradient(from 40deg, #FBEECB, #C87F14, #F7E3AF, #9A5A0B, #FBEECB, #C87F14, #F7E3AF, #9A5A0B, #FBEECB)',
          animation: 'swirlSpinRev 20s linear infinite',
        }}
      />
      <div
        style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          boxShadow: 'inset 0 0 40px rgba(120,66,4,0.35), 0 18px 40px -10px rgba(140,80,10,0.5)',
        }}
      />
      <div
        style={{
          position: 'absolute', top: '50%', left: '50%', width: 72, height: 72, transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #FFF6DE, #EAC170 40%, #B5730F 75%, #7E4E08)',
          boxShadow: '0 6px 16px rgba(80,46,4,0.5)',
        }}
      />
      <div
        style={{
          position: 'absolute', top: '50%', left: '50%', width: 72, height: 72, transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 38% 30%, rgba(255,255,255,0.9), transparent 35%)',
        }}
      />
    </div>
  )
}
