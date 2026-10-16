// Tahliye ekranı (SEKIL-18) — büküm hatasız bitince açılır.
// Operatör parçayı tutma süresini seçer (3/5/8/10/15 sn veya kalemle değiştirdiği süre),
// "PARÇAYI ÇIKART"a basar → geri sayım → sıfırda üst top seçilen mm kadar geri çekilir, ardından
// seçilen mm (ve yönde) rotasyon yapılır → parça alınır
// → SEKIL-20 (yeni büküm / tekrar).
// Süreler bu cihazda hatırlanır (localStorage, services/operatorPrefs). Şimdilik SADECE DEMO modunda açılıyor —
// gerçek backend'de tahliye komutu (POST /api/preparation/unload) henüz yok.

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '@/i18n'
import {
  UNLOAD_ROT,
  UNLOAD_SECONDS,
  UNLOAD_UPPER,
  readUnloadMotion,
  readUnloadPresets,
  readUnloadSelected,
  saveUnloadMotion,
  saveUnloadPresets,
  type UnloadMotion,
} from '@/services/operatorPrefs'
import styles from './UnloadPage.module.css'

const MIN_S = UNLOAD_SECONDS.min
const MAX_S = UNLOAD_SECONDS.max

// Tahliye hareketi: geri sayım bitince üst top X mm geri, sonra rotasyon Y mm (seçilen yönde)
// Varsayılanlar Ayarlar > Operatör Ayarları'ndan da değiştirilebilir (services/operatorPrefs).
const UPPER = UNLOAD_UPPER
const ROT = UNLOAD_ROT
type Motion = UnloadMotion
const readMotion = readUnloadMotion
const readPresets = readUnloadPresets
const readSelected = readUnloadSelected

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

type Phase = 'select' | 'countdown' | 'opening' | 'ready' | 'error'

export default function UnloadPage() {
  const navigate = useNavigate()
  const t = useT()
  const [presets, setPresets] = useState<number[]>(readPresets)
  const [selected, setSelected] = useState<number>(readSelected)
  const [editing, setEditing] = useState(false)
  const [phase, setPhase] = useState<Phase>('select')
  const [remaining, setRemaining] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [motion, setMotion] = useState<Motion>(readMotion)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  function updateMotion(patch: Partial<Motion>) {
    const next = { ...motion, ...patch }
    setMotion(next)
    saveUnloadMotion(next)
  }

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current)
  }, [])

  function save(next: number[], sel: number) {
    saveUnloadPresets(next, sel)
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
      const r = await window.corventa.bending.unloadPart({
        upperRetractMm: motion.upperRetractMm,
        rotationMm: motion.rotationDir * motion.rotationMm,
      })
      if (r && r.success === false) throw new Error(r.errorMessage ?? t('Tahliye başarısız'))
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
          ? t('DEĞİŞTİRMEK İSTEDİĞİNİZ SÜREYİ SEÇİP − / + İLE AYARLAYIN')
          : t('PARÇAYI GÜVENLE ÇIKARTMAK İÇİN AŞAĞIDAN SİZE GEREKEN SÜREYİ SEÇİNİZ'))}
        {phase === 'countdown' && t('PARÇAYI TUTUN — SÜRE BİTİNCE ÜST TOP GERİ ÇEKİLİP ROTASYON YAPILACAK')}
        {phase === 'opening' && t('TAHLİYE YAPILIYOR — ÜST TOP GERİ ÇEKİLİYOR, ARDINDAN ROTASYON')}
        {phase === 'ready' && t('TAHLİYE TAMAMLANDI — PARÇAYI ALABİLİRSİNİZ')}
        {phase === 'error' && t('TAHLİYE YAPILAMADI: {error}', { error: error ?? '' })}
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
          aria-label={t('Süreyi değiştir')}
        >
          <EditIcon />
          <span className={styles.presetUnit}>{editing ? t('TAMAM') : t('DEĞİŞTİR')}</span>
        </button>
      </div>

      {editing && phase === 'select' && (
        <div className={styles.editRow}>
          <button type="button" className={styles.stepBtn} onClick={() => adjust(-1)} disabled={presets[selected] <= MIN_S}>
            −
          </button>
          <span className={styles.editValue}>{t('{n} SN', { n: presets[selected] })}</span>
          <button type="button" className={styles.stepBtn} onClick={() => adjust(+1)} disabled={presets[selected] >= MAX_S}>
            +
          </button>
        </div>
      )}

      {/* Tahliye hareketi — üst top geri çekilme + rotasyon */}
      <div className={styles.motionRow}>
        <div className={styles.motionBox}>
          <span className={styles.motionLabel}>{t('ÜST TOP GERİ')}</span>
          <div className={styles.motionCtl}>
            <button
              type="button"
              className={styles.motionStep}
              disabled={phase !== 'select' || motion.upperRetractMm <= UPPER.min}
              onClick={() => updateMotion({ upperRetractMm: clamp(motion.upperRetractMm - UPPER.step, UPPER.min, UPPER.max) })}
            >
              −
            </button>
            <span className={styles.motionValue}>{motion.upperRetractMm} mm</span>
            <button
              type="button"
              className={styles.motionStep}
              disabled={phase !== 'select' || motion.upperRetractMm >= UPPER.max}
              onClick={() => updateMotion({ upperRetractMm: clamp(motion.upperRetractMm + UPPER.step, UPPER.min, UPPER.max) })}
            >
              +
            </button>
          </div>
        </div>

        <div className={styles.motionBox}>
          <span className={styles.motionLabel}>{t('ROTASYON')}</span>
          <div className={styles.motionCtl}>
            <button
              type="button"
              className={styles.dirBtn}
              data-on={motion.rotationDir === -1 || undefined}
              disabled={phase !== 'select'}
              onClick={() => updateMotion({ rotationDir: -1 })}
              aria-label={t('Rotasyon geri yön')}
            >
              ◀
            </button>
            <button
              type="button"
              className={styles.motionStep}
              disabled={phase !== 'select' || motion.rotationMm <= ROT.min}
              onClick={() => updateMotion({ rotationMm: clamp(motion.rotationMm - ROT.step, ROT.min, ROT.max) })}
            >
              −
            </button>
            <span className={styles.motionValue}>{motion.rotationMm} mm</span>
            <button
              type="button"
              className={styles.motionStep}
              disabled={phase !== 'select' || motion.rotationMm >= ROT.max}
              onClick={() => updateMotion({ rotationMm: clamp(motion.rotationMm + ROT.step, ROT.min, ROT.max) })}
            >
              +
            </button>
            <button
              type="button"
              className={styles.dirBtn}
              data-on={motion.rotationDir === 1 || undefined}
              disabled={phase !== 'select'}
              onClick={() => updateMotion({ rotationDir: 1 })}
              aria-label={t('Rotasyon ileri yön')}
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      {phase === 'select' && !editing && (
        <button type="button" className={styles.bigBtn} onClick={start}>
          <span>{t('PARÇAYI')}</span>
          <HandIcon />
          <span>{t('ÇIKART')}</span>
        </button>
      )}

      {phase === 'countdown' && (
        <button type="button" className={`${styles.bigBtn} ${styles.countdown}`} onClick={cancelCountdown}>
          <span className={styles.countNum}>{remaining}</span>
          <span className={styles.countSub}>{t('İPTAL İÇİN DOKUNUN')}</span>
        </button>
      )}

      {phase === 'opening' && (
        <div className={`${styles.bigBtn} ${styles.opening}`}>
          <span>{t('TAHLİYE YAPILIYOR…')}</span>
        </div>
      )}

      {phase === 'ready' && (
        <button type="button" className={`${styles.bigBtn} ${styles.ready}`} onClick={() => navigate('/bending/next')}>
          <span>✓ {t('PARÇAYI ALDIM')}</span>
        </button>
      )}

      {phase === 'error' && (
        <button type="button" className={styles.bigBtn} onClick={() => setPhase('select')}>
          <span>{t('TEKRAR DENE')}</span>
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
