// Şekil 16 — MANUEL TAHLİYE çift el onayı: tahliyenin bilinçli yapıldığını onaylamak için iki PUSH HERE
// tuşuna AYNI ANDA basılı tutulur (HOLD_MS). Tamamlanınca kesilen iş bırakılır (POST abandon → Cancelled,
// devam kaydı silinir) ve tahliye ekranı açılır (üst top geri + süreli rotasyon). Tuşlardan biri bırakılırsa
// sayaç sıfırlanır. Dokunmatik ekran çoklu dokunuşu (pointer id) kullanılır.

import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useT } from '@/i18n'
import styles from './AlarmPage.module.css'

const HOLD_MS = 1000

export default function TwoHandUnloadPage() {
  const navigate = useNavigate()
  const { state: navState } = useLocation()
  const t = useT()
  const s = navState && typeof navState === 'object' ? (navState as Record<string, unknown>) : {}
  const jobId = typeof s.jobId === 'number' ? s.jobId : null
  const jobMessage = typeof s.jobMessage === 'string' ? s.jobMessage : null

  // Her tuşa basan parmakların pointer id'leri
  const pressed = useRef<{ left: Set<number>; right: Set<number> }>({ left: new Set(), right: new Set() })
  const [leftDown, setLeftDown] = useState(false)
  const [rightDown, setRightDown] = useState(false)
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const holdStart = useRef<number | null>(null)

  const bothDown = leftDown && rightDown

  useEffect(() => {
    if (!bothDown || busy) {
      holdStart.current = null
      setProgress(0)
      return
    }
    holdStart.current = performance.now()
    const timer = setInterval(() => {
      const start = holdStart.current
      if (start == null) return
      const p = Math.min(1, (performance.now() - start) / HOLD_MS)
      setProgress(p)
      if (p >= 1) {
        clearInterval(timer)
        void confirmUnload()
      }
    }, 30)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bothDown, busy])

  async function confirmUnload() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      if (jobId != null) {
        const r = await window.corventa.bending.abandonJob(jobId)
        if (r && r.success === false) {
          setError(r.error ? t(r.error) : t('İŞLEM YAPILAMADI'))
          setBusy(false)
          return
        }
      }
      navigate('/bending/unload', {
        replace: true,
        state: { jobOutcome: 'cancelled', jobId, ...(jobMessage ? { jobMessage } : {}) },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  function handlers(side: 'left' | 'right') {
    const set = (v: boolean) => (side === 'left' ? setLeftDown(v) : setRightDown(v))
    const up = (e: React.PointerEvent) => {
      pressed.current[side].delete(e.pointerId)
      if (pressed.current[side].size === 0) set(false)
    }
    return {
      onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
        e.currentTarget.setPointerCapture?.(e.pointerId)
        pressed.current[side].add(e.pointerId)
        set(true)
      },
      onPointerUp: up,
      onPointerCancel: up,
      onLostPointerCapture: up,
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.band}>
        <div className={styles.chevrons} aria-hidden>
          <span /><span /><span /><span />
        </div>
        <span className={styles.bandText}>{t('ACİL STOP')}</span>
        <div className={`${styles.chevrons} ${styles.chevronsLeft}`} aria-hidden>
          <span /><span /><span /><span />
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.twoHandTitle}>{t('MANUEL TAHLİYE')}</div>
        <div className={styles.twoHandNote}>
          <b>!</b>
          {t('MANUEL MODA GEÇMEK İÇİN AŞAĞIDAKİ BUTONLARA EŞ ZAMANLI BASILMALIDIR.')}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.pushRow}>
          <button type="button" className={styles.pushBtn} data-pressed={leftDown || undefined} disabled={busy} {...handlers('left')}>
            <span className={styles.pushArrow} />
            PUSH HERE
          </button>
          <div className={styles.holdBar} aria-hidden>
            <div className={styles.holdFill} style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <button type="button" className={styles.pushBtn} data-pressed={rightDown || undefined} disabled={busy} {...handlers('right')}>
            <span className={styles.pushArrow} />
            PUSH HERE
          </button>
        </div>

        <button type="button" className={styles.backLink} disabled={busy} onClick={() => navigate('/bending/alarm', { state: { jobId } })}>
          {t('GERİ — ALARM SAYFASI')}
        </button>
      </div>
    </div>
  )
}
