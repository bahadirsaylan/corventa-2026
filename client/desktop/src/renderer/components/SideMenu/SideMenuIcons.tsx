// Sağ hızlı menü ikonları — çizgi stili (SEKIL-19), renk currentColor.

/* ── İkonlar (SEKIL-19 çizgi stili) ─────────────── */

// Dişli çark (SEKIL-19) — 8 dişli dış hat + ortada delik, menü ikonlarıyla aynı çizgi kalınlığı
export function GearIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <path
        d="M53.52 25.42 L60.56 26.96 L60.56 37.04 L53.52 38.58 L51.87 42.56 L55.76 48.63 L48.63 55.76 L42.56 51.87 L38.58 53.52 L37.04 60.56 L26.96 60.56 L25.42 53.52 L21.44 51.87 L15.37 55.76 L8.24 48.63 L12.13 42.56 L10.48 38.58 L3.44 37.04 L3.44 26.96 L10.48 25.42 L12.13 21.44 L8.24 15.37 L15.37 8.24 L21.44 12.13 L25.42 10.48 L26.96 3.44 L37.04 3.44 L38.58 10.48 L42.56 12.13 L48.63 8.24 L55.76 15.37 L51.87 21.44 Z"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="9" stroke="currentColor" strokeWidth="3.5" />
    </svg>
  )
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <path d="M26 8h12v18h18v12H38v18H26V38H8V26h18z" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
    </svg>
  )
}

export function HomeIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <path d="M6 31 L32 8 L58 31" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M13 26v30h14V40h10v16h14V26" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M44 15V8h7v13" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
    </svg>
  )
}

export function ServiceIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <path d="M10 30C10 18.95 19.4 10 31 10s21 8.95 21 20" stroke="currentColor" strokeWidth="3.5" />
      <rect x="6" y="30" width="10" height="18" rx="4" stroke="currentColor" strokeWidth="3.5" />
      <rect x="46" y="30" width="10" height="18" rx="4" stroke="currentColor" strokeWidth="3.5" />
      <path d="M51 48c0 6-4 9-10 9H36" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="32" cy="57" r="4" stroke="currentColor" strokeWidth="3" />
    </svg>
  )
}

export function LogoutIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <path d="M36 10H12v44h24" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M26 32h30M46 21l11 11-11 11" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const ICONS = {
  plus: PlusIcon,
  home: HomeIcon,
  service: ServiceIcon,
  gear: GearIcon,
  logout: LogoutIcon,
} as const

export function SideMenuIcon({ name }: { name: keyof typeof ICONS }) {
  const Icon = ICONS[name]
  return <Icon />
}
