// Dil seçimi bayrakları — SVG (Windows'ta emoji bayraklar çizilmiyor, harf olarak görünüyordu).
// Sadeleştirilmiş çizimler; oran 3:2.

export type FlagCode = 'tr' | 'gb' | 'de' | 'ru' | 'sa' | 'fr'

function starPoints(cx: number, cy: number, rOuter: number, rInner: number, rotDeg: number): string {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rOuter : rInner
    const a = ((rotDeg + i * 36) * Math.PI) / 180
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`)
  }
  return pts.join(' ')
}

export default function Flag({ code, className }: { code: FlagCode; className?: string }) {
  return (
    <svg viewBox="0 0 30 20" className={className} aria-hidden preserveAspectRatio="xMidYMid slice">
      {code === 'tr' && (
        <>
          <rect width="30" height="20" fill="#E30A17" />
          <circle cx="11" cy="10" r="5" fill="#fff" />
          <circle cx="12.25" cy="10" r="4" fill="#E30A17" />
          <polygon points={starPoints(17, 10, 2.5, 1, 180)} fill="#fff" />
        </>
      )}
      {code === 'gb' && (
        <>
          <rect width="30" height="20" fill="#012169" />
          <path d="M0 0 L30 20 M30 0 L0 20" stroke="#fff" strokeWidth="4" />
          <path d="M0 0 L30 20 M30 0 L0 20" stroke="#C8102E" strokeWidth="1.4" />
          <path d="M15 0 V20 M0 10 H30" stroke="#fff" strokeWidth="6" />
          <path d="M15 0 V20 M0 10 H30" stroke="#C8102E" strokeWidth="3.4" />
        </>
      )}
      {code === 'de' && (
        <>
          <rect width="30" height="6.67" fill="#000" />
          <rect y="6.67" width="30" height="6.67" fill="#DD0000" />
          <rect y="13.33" width="30" height="6.67" fill="#FFCE00" />
        </>
      )}
      {code === 'ru' && (
        <>
          <rect width="30" height="6.67" fill="#fff" />
          <rect y="6.67" width="30" height="6.67" fill="#0039A6" />
          <rect y="13.33" width="30" height="6.67" fill="#D52B1E" />
        </>
      )}
      {code === 'fr' && (
        <>
          <rect width="10" height="20" fill="#0055A4" />
          <rect x="10" width="10" height="20" fill="#fff" />
          <rect x="20" width="10" height="20" fill="#EF4135" />
        </>
      )}
      {code === 'sa' && (
        <>
          <rect width="30" height="20" fill="#006C35" />
          {/* Sadeleştirilmiş yazı + kılıç */}
          <path d="M8 7.5 q1.5 -1.5 3 0 t3 0 t3 0 t3 0 t3 0" stroke="#fff" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          <path d="M9 10 h12" stroke="#fff" strokeWidth="0.9" strokeLinecap="round" />
          <path d="M8 14 h13.5 l1.5 -0.8 M10 13.2 v1.6" stroke="#fff" strokeWidth="0.9" fill="none" strokeLinecap="round" />
        </>
      )}
      <rect width="30" height="20" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
    </svg>
  )
}
