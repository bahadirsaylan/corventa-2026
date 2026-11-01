// Tahliye ekranı (SEKIL-18) — büküm BİTİNCE açılır (Completed, Failed, Cancelled — hatalı/durdurulmuş
// bitse bile parça çıkarılmalı). Başlık şeridi sonuca göre: hatasız → İŞLEM TAMAM (yeşil oklar),
// Completed+errorMessage → BÜKÜM UYARISI, Failed → BÜKÜM HATAYLA BİTTİ, Cancelled → BÜKÜM DURDURULDU (kırmızı).
// Operatör parçayı tutma süresini seçer (3/5/8/10/15 sn veya kalemle değiştirdiği süre),
// "PARÇAYI ÇIKART"a basar → geri sayım → sıfırda üst top seçilen mm kadar geri çekilir, ardından
// seçilen SÜRE (sn, seçilen yönde) rotasyon yapılır → parça alınır. (2026-11-01: mm yerine sn — üst top
// açıkken alt top dönmez, encoder alt topta olduğu için mesafe okunamaz.)
// → SEKIL-20 (yeni büküm / tekrar).
// Süreler bu cihazda hatırlanır (localStorage, services/operatorPrefs).
// Ekran AppLayout'tan açılır: otomatik / yarı oto job DataApi'de Completed olunca. Job errorMessage
// ile tamamlandıysa (ör. geri esneme düzeltmesi yakınsamadı — büküm bitti, parça hâlâ sıkılı) mesaj
// navigate state'iyle gelir ve üstte uyarı olarak gösterilir.
// Hareket: POST /api/preparation/unload · hareket sırasında DURDUR: POST /api/preparation/unload/stop
// (cevap cancelled=true → "TAHLİYE DURDURULDU": tekrar dene veya PARÇAYI ALDIM).
// Tahliye sürerken sayfadan çıkılırsa (yan menü) tahliye otomatik durdurulur — DURDUR'a erişim kalmaz.

import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useT } from '@/i18n'
import { CLAMP_ESTOP_RE, CLAMP_ESTOP_TEMPLATE } from '@/i18n/progress'
import { Icon, IconLabel } from '@/components/Icon'
import {
  UNLOAD_ROT_SEC,
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
const ROT = UNLOAD_ROT_SEC // rotasyon SÜRE (sn) — üst top açıkken encoder (alt top) ilerlemez
type Motion = UnloadMotion
const readMotion = readUnloadMotion
const readPresets = readUnloadPresets
const readSelected = readUnloadSelected

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

type Phase = 'select' | 'countdown' | 'opening' | 'ready' | 'stopped' | 'error'

/** AppLayout → navigate state.jobOutcome: job'un bitiş durumu (başlık + şerit rengi) */
export type UnloadJobOutcome = 'completed' | 'warning' | 'failed' | 'cancelled'

const OUTCOME_TITLE: Record<UnloadJobOutcome, string> = {
  completed: 'İŞLEM TAMAM',
  warning: 'BÜKÜM UYARISI',
  failed: 'BÜKÜM HATAYLA BİTTİ',
  cancelled: 'BÜKÜM DURDURULDU',
}

function readNavState(navState: unknown): { outcome: UnloadJobOutcome; message: string | null } {
  const s = navState && typeof navState === 'object' ? (navState as Record<string, unknown>) : {}
  const message =
    typeof s.jobMessage === 'string' && s.jobMessage
      ? s.jobMessage
      : typeof s.jobWarning === 'string' && s.jobWarning
        ? s.jobWarning
        : null
  const o = s.jobOutcome
  const outcome: UnloadJobOutcome =
    o === 'completed' || o === 'warning' || o === 'failed' || o === 'cancelled'
      ? o
      : message
        ? 'warning' // eski sözleşme: sadece jobWarning geldi
        : 'completed'
  return { outcome, message }
}

export default function UnloadPage() {
  const navigate = useNavigate()
  const { state: navState } = useLocation()
  const { outcome, message: jobMessage } = readNavState(navState)
  // EXCEL 33 — bu işte hatalı/geçersiz ölçüm oldu → bulut senkronu bu işi göndermez (sadece bilgi)
  const measurementFlagged =
    !!navState && typeof navState === 'object' && (navState as Record<string, unknown>).measurementFlagged === true
  // Biten işin numarası (AppLayout state.jobId) — "LOGLARI GÖR" → Büküm Geçmişi detayı
  const rawJobId = navState && typeof navState === 'object' ? (navState as Record<string, unknown>).jobId : undefined
  const jobId = typeof rawJobId === 'number' && Number.isInteger(rawJobId) && rawJobId > 0 ? rawJobId : null
  const isBad = outcome === 'failed' || outcome === 'cancelled'
  // Sıkıştırma v2: hedefe varmadan basınç arttı → backend ACİL STOP yaptı. Genel hata yerine açık uyarı.
  const clampEstopRise = outcome === 'failed' && jobMessage ? CLAMP_ESTOP_RE.exec(jobMessage)?.[1] : undefined
  const clampEstop = clampEstopRise != null
  const t = useT()
  const [presets, setPresets] = useState<number[]>(readPresets)
  const [selected, setSelected] = useState<number>(readSelected)
  const [editing, setEditing] = useState(false)
  const [phase, setPhase] = useState<Phase>('select')
  const [remaining, setRemaining] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [motion, setMotion] = useState<Motion>(readMotion)
  const [stopping, setStopping] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  // DURDUR başarıyla gönderildi mi — unload isteği gövdesiz (ağ) hatayla dönse bile "durduruldu" gösterilir.
  // Stop başarısızsa geri false'a çekilir (gerçek hata "durduruldu" diye gizlenmesin).
  const stopRequested = useRef(false)
  // Unmount temizliği için güncel faz (closure'daki eski değer değil)
  const phaseRef = useRef<Phase>('select')
  phaseRef.current = phase

  function updateMotion(patch: Partial<Motion>) {
    const next = { ...motion, ...patch }
    setMotion(next)
    saveUnloadMotion(next)
  }

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current)
    // Tahliye sürerken sayfadan çıkıldı → DURDUR butonu kayboluyor; hareketi yarıda bırakmamak için durdur
    if (phaseRef.current === 'opening') {
      void window.corventa.bending.stopUnload().catch(() => {})
    }
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
    stopRequested.current = false
    setStopping(false)
    setError(null)
    setPhase('opening')
    try {
      const r = await window.corventa.bending.unloadPart({
        upperRetractMm: clamp(motion.upperRetractMm, UPPER.min, UPPER.max),
        rotationMm: 0,
        rotationSeconds: motion.rotationDir * clamp(motion.rotationSec, ROT.min, ROT.max),
      })
      if (r?.cancelled) {
        setPhase('stopped')
        return
      }
      if (r && r.success === false) {
        // Backend gövdeli hata (cancelled=false) — DURDUR'a basılmış olsa bile gerçek hata gösterilir
        setError(r.errorMessage ? t(r.errorMessage) : t('Tahliye başarısız'))
        setPhase('error')
        return
      }
      setPhase('ready')
    } catch (e) {
      // Gövdesiz hata (IPC / ağ) — DURDUR başarıyla gönderildiyse istek kesilmiş sayılır
      if (stopRequested.current) {
        setPhase('stopped')
        return
      }
      setError(e instanceof Error ? e.message : String(e))
      setPhase('error')
    } finally {
      setStopping(false)
    }
  }

  // Hareket sırasında DURDUR — backend tahliyeyi keser; bekleyen unloadPart cancelled=true ile döner
  // Stop başarısızsa buton tekrar basılabilir olur (operatör yeniden DURDUR deneyebilmeli).
  async function stopUnload() {
    if (stopping) return
    stopRequested.current = true
    setStopping(true)
    try {
      const r = await window.corventa.bending.stopUnload()
      if (r && r.success === false) {
        stopRequested.current = false
        setStopping(false)
        setError(r.errorMessage ? t(r.errorMessage) : t('TAHLİYE DURDURULAMADI'))
      }
    } catch (e) {
      stopRequested.current = false
      setStopping(false)
      setError(e instanceof Error ? e.message : String(e))
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
      <div className={styles.doneBand} data-outcome={outcome}>
        <div className={styles.chevrons} aria-hidden>
          <span /><span /><span /><span />
        </div>
        <span className={styles.doneText} data-long={outcome !== 'completed' || undefined}>{t(OUTCOME_TITLE[outcome])}</span>
        <div className={`${styles.chevrons} ${styles.chevronsLeft}`} aria-hidden>
          <span /><span /><span /><span />
        </div>
      </div>

      {measurementFlagged && (
        <div className={styles.hint}>
          <IconLabel icon="warning">{t('HATALI ÖLÇÜM VAR — BU BÜKÜM BULUTA GÖNDERİLMEYECEK')}</IconLabel>
        </div>
      )}
      {outcome === 'warning' && jobMessage && (
        <div className={styles.hint} role="alert">
          {t('BÜKÜM UYARISI: {warning}', { warning: t(jobMessage) })}
        </div>
      )}
      {clampEstop && (
        <div className={`${styles.hint} ${styles.hintBad}`} role="alert">
          <IconLabel icon="warning">{t(CLAMP_ESTOP_TEMPLATE, { n: clampEstopRise ?? '' })}</IconLabel>
          <br />
          {t('ACİL STOP UYGULANDI — PARÇAYI ÇIKARIN, ÖLÇÜYÜ VE ÖNÜNDEKİ ENGELİ KONTROL EDİP İŞİ YENİDEN BAŞLATIN')}
        </div>
      )}
      {isBad && !clampEstop && (
        <div className={`${styles.hint} ${styles.hintBad}`} role="alert">
          {outcome === 'failed'
            ? jobMessage
              ? t('HATA: {error}', { error: t(jobMessage) })
              : t('BÜKÜM HATAYLA BİTTİ — PARÇAYI GÜVENLE ÇIKARTIN')
            : jobMessage
              ? t('BÜKÜM DURDURULDU: {reason}', { reason: t(jobMessage) })
              : t('BÜKÜM DURDURULDU — PARÇAYI GÜVENLE ÇIKARTIN')}
        </div>
      )}

      {/* Faz ipucu + (iş numarası biliniyorsa) küçük "LOGLARI GÖR" — aynı satırda, büyük düğmeden yer çalmaz.
          LOGLARI GÖR → Büküm Geçmişi > bu işin detayı; geri tuşu buraya döner (ekran baştan açılır). Hareket
          yokken gösterilir; tahliye bittiyse ('ready') gösterilmez — dönüşte tekrar çıkartma sorulmasın. */}
      <div className={styles.hintRow}>
        <div className={styles.hint}>
          {phase === 'select' && (editing
            ? t('DEĞİŞTİRMEK İSTEDİĞİNİZ SÜREYİ SEÇİP − / + İLE AYARLAYIN')
            : t('PARÇAYI GÜVENLE ÇIKARTMAK İÇİN AŞAĞIDAN SİZE GEREKEN SÜREYİ SEÇİNİZ'))}
          {phase === 'countdown' && t('PARÇAYI TUTUN — SÜRE BİTİNCE ÜST TOP GERİ ÇEKİLİP ROTASYON YAPILACAK')}
          {phase === 'opening' && (error
            ? t('TAHLİYE YAPILAMADI: {error}', { error })
            : t('TAHLİYE YAPILIYOR — ÜST TOP GERİ ÇEKİLİYOR, ARDINDAN ROTASYON'))}
          {phase === 'ready' && t('TAHLİYE TAMAMLANDI — PARÇAYI ALABİLİRSİNİZ')}
          {phase === 'stopped' && t('TAHLİYE DURDURULDU')}
          {phase === 'error' && t('TAHLİYE YAPILAMADI: {error}', { error: error ?? '' })}
        </div>
        {jobId != null && !editing && (phase === 'select' || phase === 'stopped' || phase === 'error') && (
          <button
            type="button"
            className={styles.logsBtn}
            onClick={() => navigate(`/settings/bending-history/${jobId}`, { state: { from: 'unload' } })}
          >
            {t('LOGLAR #{id}', { id: jobId })}
          </button>
        )}
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
            <span className={styles.presetUnit}>{t('SANİYE')}</span>
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
          <button
            type="button"
            className={styles.stepBtn}
            onClick={() => adjust(-1)}
            disabled={presets[selected] <= MIN_S}
            aria-label={t('Azalt')}
          >
            <Icon name="minus" size="xxl" />
          </button>
          <span className={styles.editValue}>{t('{n} SN', { n: presets[selected] })}</span>
          <button
            type="button"
            className={styles.stepBtn}
            onClick={() => adjust(+1)}
            disabled={presets[selected] >= MAX_S}
            aria-label={t('Arttır')}
          >
            <Icon name="plus" size="xxl" />
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
              aria-label={t('Azalt')}
            >
              <Icon name="minus" size="xl" />
            </button>
            <span className={styles.motionValue}>{motion.upperRetractMm} mm</span>
            <button
              type="button"
              className={styles.motionStep}
              disabled={phase !== 'select' || motion.upperRetractMm >= UPPER.max}
              onClick={() => updateMotion({ upperRetractMm: clamp(motion.upperRetractMm + UPPER.step, UPPER.min, UPPER.max) })}
              aria-label={t('Arttır')}
            >
              <Icon name="plus" size="xl" />
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
              <Icon name="chevronLeft" size="xl" />
            </button>
            <button
              type="button"
              className={styles.motionStep}
              disabled={phase !== 'select' || motion.rotationSec <= ROT.min}
              onClick={() => updateMotion({ rotationSec: clamp(motion.rotationSec - ROT.step, ROT.min, ROT.max) })}
              aria-label={t('Azalt')}
            >
              <Icon name="minus" size="xl" />
            </button>
            <span className={styles.motionValue}>{motion.rotationSec.toFixed(1)} {t('sn')}</span>
            <button
              type="button"
              className={styles.motionStep}
              disabled={phase !== 'select' || motion.rotationSec >= ROT.max}
              onClick={() => updateMotion({ rotationSec: clamp(motion.rotationSec + ROT.step, ROT.min, ROT.max) })}
              aria-label={t('Arttır')}
            >
              <Icon name="plus" size="xl" />
            </button>
            <button
              type="button"
              className={styles.dirBtn}
              data-on={motion.rotationDir === 1 || undefined}
              disabled={phase !== 'select'}
              onClick={() => updateMotion({ rotationDir: 1 })}
              aria-label={t('Rotasyon ileri yön')}
            >
              <Icon name="chevronRight" size="xl" />
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

      {/* Hatalı / durdurulan iş parça sıkılmadan (ör. Clamp'ta sensör beklerken) bitmiş olabilir —
          makinede parça yoksa tahliye hareketi yapmadan çıkış. Ekran yine her bitişte açılır. */}
      {phase === 'select' && !editing && isBad && (
        <button type="button" className={styles.skipBtn} onClick={() => navigate('/bending/next')}>
          {t('MAKİNEDE PARÇA YOK — TAHLİYESİZ DEVAM')}
        </button>
      )}

      {phase === 'countdown' && (
        <button type="button" className={`${styles.bigBtn} ${styles.countdown}`} onClick={cancelCountdown}>
          <span className={styles.countNum}>{remaining}</span>
          <span className={styles.countSub}>{t('İPTAL İÇİN DOKUNUN')}</span>
        </button>
      )}

      {phase === 'opening' && (
        <button
          type="button"
          className={`${styles.bigBtn} ${styles.stop}`}
          onClick={() => void stopUnload()}
          disabled={stopping}
        >
          <span>{stopping ? t('DURDURULUYOR…') : t('DURDUR')}</span>
          <span className={styles.stopSub}>{t('TAHLİYE YAPILIYOR…')}</span>
        </button>
      )}

      {phase === 'stopped' && (
        <div className={styles.stoppedRow}>
          <button type="button" className={styles.bigBtn} onClick={() => setPhase('select')}>
            <span>{t('TEKRAR DENE')}</span>
          </button>
          <button type="button" className={`${styles.bigBtn} ${styles.ready}`} onClick={() => navigate('/bending/next')}>
            <IconLabel icon="check">{t('PARÇAYI ALDIM')}</IconLabel>
          </button>
        </div>
      )}

      {phase === 'ready' && (
        <button type="button" className={`${styles.bigBtn} ${styles.ready}`} onClick={() => navigate('/bending/next')}>
          <IconLabel icon="check">{t('PARÇAYI ALDIM')}</IconLabel>
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
  return <Icon name="edit" size={66} className={styles.editIcon} />
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
