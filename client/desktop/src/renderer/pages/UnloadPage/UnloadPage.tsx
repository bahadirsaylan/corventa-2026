// Tahliye ekranı (SEKIL-18) — büküm hatasız bitince açılır.
// Operatör parçayı tutma süresini seçer (3/5/8/10/15 sn veya kalemle değiştirdiği süre),
// "PARÇAYI ÇIKART"a basar → geri sayım → sıfırda toplar baskıyı bırakıp açılır → parça alınır
// → SEKIL-20 (yeni büküm / tekrar).
// Süreler bu cihazda hatırlanır (localStorage). Şimdilik SADECE DEMO modunda açılıyor —
// gerçek backend'de tahliye komutu (POST /api/preparation/unload) henüz yok.

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './UnloadPage.module.css'

const DEFAULT_PRESETS = [3, 5, 8, 10, 15]
const STORAGE_KEY = 'corventa.unloadPresets'
const SEL_KEY = 'corventa.unloadSelected'
const MIN_S = 1
const MAX_S = 60

type Phase = 'select' | 'countdown' | 'opening' | 'ready' | 'error'

function readPresets(): number[] {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (Array.isArray(v) && v.length === DEFAULT_PRESETS.length && v.every((n) => Number.isFinite(n))) return v
  } catch {
    /* varsayılan */
  }
  return [...DEFAULT_PRESETS]
}

function readSelected(): number {
  try {
    const v = Number(localStorage.getItem(SEL_KEY))
    if (Number.isInteger(v) && v >= 0 && v < DEFAULT_PRESETS.length) return v
  } catch {
    /* varsayılan */
  }
  return 0
}

export default function UnloadPage() {
  const navigate = useNavigate()
  const [presets, setPresets] = useState<number[]>(readPresets)
  const [selected, setSelected] = useState<number>(readSelected)
  const [editing, setEditing] = useState(false)
  const [phase, setPhase] = useState<Phase>('select')
  const [remaining, setRemaining] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current)
  }, [])

  function save(next: number[], sel: number) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      localStorage.setItem(SEL_KEY, String(sel))
    } catch {
      /* depolama kapalı — bu oturumda geçerli */
    }
  }

  function choose(i: number) {
    if (phase !== 'select') return
    setSelected(i)
    save(presets, i)
  }

  function adjust(delta: number) {
    const next = [...presets]
    next[selected] = Math.min(MAX_S, Math.max(MIN_S, next[selected] + delta))
    setPresets(next)
    save(next, selected)
  }

  async function openRolls() {
    setPhase('opening')
    try {
      const r = await window.corventa.bending.unloadPart()
      if (r && r.success === false) throw new Error(r.errorMessage ?? 'Tahliye başarısız')
      setPhase('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase('error')
    }
  }

  function start() {
    if (phase !== 'select') return
    setEditing(false)
    let left = presets[selected]
    setRemaining(left)
    setPhase('countdown')
    timer.current = setInterval(() => {
      left -= 1
      setRemaining(left)
      if (left <= 0) {
        if (timer.current) clearInterval(timer.current)
        timer.current = null
        void openRolls()
      }
    }, 1000)
  }

  function cancelCountdown() {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setPhase('select')
  }

  return (
    <div className={styles.page}>
      <div className={styles.doneBand}>
        <div className={styles.chevrons} aria-hidden>
          <span /><span /><span /><span />
        </div>
        <span className={styles.doneText}>IT&apos;S DONE</span>
        <div className={`${styles.chevrons} ${styles.chevronsLeft}`} aria-hidden>
          <span /><span /><span /><span />
        </div>
      </div>

      <div className={styles.hint}>
        {phase === 'select' && (editing
          ? 'DEĞİŞTİRMEK İSTEDİĞİNİZ SÜREYİ SEÇİP − / + İLE AYARLAYIN'
          : 'PARÇAYI GÜVENLE ÇIKARTMAK İÇİN AŞAĞIDAN SİZE GEREKEN SÜREYİ SEÇİNİZ')}
        {phase === 'countdown' && 'PARÇAYI TUTUN — SÜRE BİTİNCE TOPLAR AÇILACAK'}
        {phase === 'opening' && 'TOPLAR AÇILIYOR…'}
        {phase === 'ready' && 'TOPLAR AÇILDI — PARÇAYI ALABİLİRSİNİZ'}
        {phase === 'error' && `TAHLİYE YAPILAMADI: ${error ?? ''}`}
      </div>

      <div className={styles.presetRow}>
        {presets.map((sec, i) => (
          <button
            key={i}
            type="button"
            className={styles.preset}
            data-selected={selected === i || undefined}
            disabled={phase !== 'select'}
            onClick={() => choose(i)}
          >
            <span className={styles.presetNum}>{sec}</span>
            <span className={styles.presetUnit}>SECOND</span>
          </button>
        ))}
        <button
          type="button"
          className={styles.preset}
          data-editing={editing || undefined}
          disabled={phase !== 'select'}
          onClick={() => setEditing((v) => !v)}
          aria-label="Süreyi değiştir"
        >
          <EditIcon />
          <span className={styles.presetUnit}>{editing ? 'TAMAM' : 'DEĞİŞTİR'}</span>
        </button>
      </div>

      {editing && phase === 'select' && (
        <div className={styles.editRow}>
          <button type="button" className={styles.stepBtn} onClick={() => adjust(-1)} disabled={presets[selected] <= MIN_S}>
            −
          </button>
          <span className={styles.editValue}>{presets[selected]} SN</span>
          <button type="button" className={styles.stepBtn} onClick={() => adjust(+1)} disabled={presets[selected] >= MAX_S}>
            +
          </button>
        </div>
      )}

      {phase === 'select' && !editing && (
        <button type="button" className={styles.bigBtn} onClick={start}>
          <span>PARÇAYI</span>
          <HandIcon />
          <span>ÇIKART</span>
        </button>
      )}

      {phase === 'countdown' && (
        <button type="button" className={`${styles.bigBtn} ${styles.countdown}`} onClick={cancelCountdown}>
          <span className={styles.countNum}>{remaining}</span>
          <span className={styles.countSub}>İPTAL İÇİN DOKUNUN</span>
        </button>
      )}

      {phase === 'opening' && (
        <div className={`${styles.bigBtn} ${styles.opening}`}>
          <span>TOPLAR AÇILIYOR…</span>
        </div>
      )}

      {phase === 'ready' && (
        <button type="button" className={`${styles.bigBtn} ${styles.ready}`} onClick={() => navigate('/bending/next')}>
          <span>✓ PARÇAYI ALDIM</span>
        </button>
      )}

      {phase === 'error' && (
        <button type="button" className={styles.bigBtn} onClick={() => setPhase('select')}>
          <span>TEKRAR DENE</span>
        </button>
      )}
    </div>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 48 48" className={styles.editIcon} aria-hidden>
      <rect x="9" y="8" width="24" height="32" rx="2" fill="#fff" stroke="currentColor" strokeWidth="2.5" />
      <path d="M14 8V4M19 8V4M24 8V4M29 8V4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M14 16h14M14 22h14M14 28h9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M41 14l3 3-15 15-4 1 1-4z" fill="currentColor" />
    </svg>
  )
}

function HandIcon() {
  return (
    <svg viewBox="0 0 64 80" className={styles.handIcon} aria-hidden>
      <path d="M22 18a10 10 0 0 1 20 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M16 18a16 16 0 0 1 32 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M27 46V19a5 5 0 0 1 10 0v20l4-1a5 5 0 0 1 5 2l1-1a5 5 0 0 1 7 4v14c0 9-7 16-16 16h-6c-6 0-10-3-13-8l-8-13a5 5 0 0 1 8-6z"
        fill="#fff"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  )
}
