// STANDART SÜRÜM (2026-11-17) — BÜKÜM SONUCU ekranı (STANDART_SURUM.md §2.3).
// Completed iş tahliye yerine buraya gelir (AppLayout, state { jobId, savedBendId? }). Parça hâlâ SIKILI.
// Operatör kendi aletiyle çapı ölçer → ÖLÇÜLEN ÇAP → önerilen yeni hedef:
//   yeni = mevcut + (pos(Dhedef) − pos(Dölçülen))   pos = POST /api/bending/calculate (işin kendi geometrisi)
// ± (0,1 / 1 mm) ile ince ayar ya da hedef konum doğrudan girilir. Kararlar:
//   PARÇAYA UYGULA      — yeni > mevcut + 0,05 → manual-correct (bitince tekrar ölç)
//   YENİ PARÇAYLA BÜK   — elle hedef mağazaya → tahliye → parça yükleme (aynı parametre, manualTargetLocked)
//   KAYDET              — kayıtlı büküm (yeni / GÜNCELLE) → tahliye
//   KAYDETMEDEN BİTİR   — tahliye
// Parça fazla bükülmüşse (yeni ≤ mevcut) sadece YENİ PARÇAYLA BÜK (ve bitir) açık.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { IconLabel } from '@/components/Icon'
import KeyboardModal from '@/components/KeyboardModal/KeyboardModal'
import NumpadModal from '@/components/NumpadModal/NumpadModal'
import { useT } from '@/i18n'
import {
  SAVED_BEND_METHOD,
  cleanIpcError,
  defaultSavedBendName,
  fmtNum,
  snapshotParamsJson,
} from '@/services/savedBends'
import { useBendingActivityStore } from '@/stores/bendingActivityStore'
import { useMachineStateStore } from '@/stores/machineStateStore'
import { manualTargetKey, useBendingJobStore } from '@/store/bendingJobStore'
import type { BendingJob, ManualCorrectStatus, SavedBendCorrection } from '@shared/types'
import styles from './BendingResultPage.module.css'
import MethodResult from './MethodResult'

/** Parçaya uygulama eşiği (backend ile aynı: yeni > mevcut + 0,05 mm) */
const APPLY_MIN_DELTA_MM = 0.05
const POLL_MS = 500
/** Başlatıldıktan sonra durum hâlâ Idle görünürse bu kadar yoklamadan sonra hata say */
const IDLE_GIVE_UP_POLLS = 20
/** Ekranda gösterilen son düzeltme sayısı (kaydırma çubuğu yok) */
const HISTORY_VISIBLE = 5

type Banner = { kind: 'ok' | 'warn' | 'error' | 'info'; text: string } | null
type Modal = 'measured' | 'target' | 'name' | 'saveChoice' | null

function readNav(state: unknown): { jobId: number | null; savedBendId: number | null; jobMessage: string | null } {
  const s = state && typeof state === 'object' ? (state as Record<string, unknown>) : {}
  const int = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null)
  return {
    jobId: int(s.jobId),
    savedBendId: int(s.savedBendId),
    jobMessage: typeof s.jobMessage === 'string' && s.jobMessage ? s.jobMessage : null,
  }
}

const round2 = (v: number) => Math.round(v * 100) / 100

/**
 * BÜKÜM SONUCU — metoda göre: ÇEMBER bugünkü ekran (RingResult, birebir) · ÇOK AÇILI / SERPANTİN / SIVAMA
 * MethodResult (2026-11-17; parçaya düzeltme yok, düzeltme yeni parçaya). Metot mağazadaki büküm parametresinden.
 */
export default function BendingResultPage() {
  const method = useBendingJobStore((s) => s.params.bendingMethod)
  return method === 'arc' || method === 'spiral' || method === 'sivama' ? <MethodResult /> : <RingResult />
}

function RingResult() {
  const t = useT()
  const navigate = useNavigate()
  const { state: navState } = useLocation()
  const nav = readNav(navState)
  const jobId = nav.jobId

  const params = useBendingJobStore((s) => s.params)
  const setParams = useBendingJobStore((s) => s.setParams)
  // Mağazadaki elle hedef BU işe mi ait: parametre anahtarı tutmalı (orkestratördeki kuralla aynı)
  const keyedOverride =
    params.manualTarget &&
    (params.manualTarget.paramsKey == null || params.manualTarget.paramsKey === manualTargetKey(params))
      ? params.manualTarget
      : null

  const [job, setJob] = useState<BendingJob | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [current, setCurrent] = useState<number | null>(null)
  // Geçmiş: elle hedefle geldiyse önceki düzeltmeler (kayıt / önceki parçalar) + bu ekrandakiler
  const [history, setHistory] = useState<SavedBendCorrection[]>(() => keyedOverride?.corrections ?? [])
  const [measured, setMeasured] = useState<number | null>(null)
  const [newTarget, setNewTarget] = useState<number | null>(null)
  const [calcBusy, setCalcBusy] = useState(false)
  const [banner, setBanner] = useState<Banner>(
    nav.jobMessage ? { kind: 'warn', text: nav.jobMessage } : null,
  )
  const [modal, setModal] = useState<Modal>(null)
  const [saving, setSaving] = useState(false)
  // Elle düzeltme pasosu
  const [correcting, setCorrecting] = useState(false)
  const [corrStatus, setCorrStatus] = useState<ManualCorrectStatus | null>(null)
  const [stopping, setStopping] = useState(false)
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const correctingRef = useRef(false)
  correctingRef.current = correcting

  // İş elle hedefle (manualTargetLocked) çalışmadıysa mağazadaki elle hedef bu işe ait değil
  const override = keyedOverride && job?.manualTargetLocked !== false ? keyedOverride : null
  const savedBendId = override ? (nav.savedBendId ?? override.savedBendId ?? null) : null

  // Stage: elle hedefte kayıttaki; yoksa işin çalıştığı (şu anki) stage — iş kaydında stage alanı yok
  const machineStage = useMachineStateStore((s) => s.state.physicalInfo?.currentStage ?? 0)
  const stageNumber =
    override?.stageNumber != null && override.stageNumber > 0
      ? override.stageNumber
      : machineStage > 0
        ? machineStage
        : null

  // Mağazadaki parametreler bu işe mi ait (KAYDET / YENİ PARÇA için şart)
  // (çember: ölçü ekranındaki R = iş hedef çapı, A = profil A — farklıysa operatör başka bir ayara geçmiş)
  const ring = params.ringBending
  const paramsMatchJob =
    !job ||
    params.bendingMethod !== 'ring' ||
    !ring ||
    ((ring.R == null || Math.abs(ring.R - job.targetDiameterMm) < 1e-3) &&
      (ring.A == null || Math.abs(ring.A - job.profileA) < 1e-3))
  const paramsUsable = !!params.profileId && !!params.bendingMethod && paramsMatchJob

  const loadJob = useCallback(async (): Promise<BendingJob | null> => {
    if (jobId == null) return null
    try {
      const j = await window.corventa.bending.getJob(jobId)
      setJob(j)
      setCurrent(j?.calculatedPistonPositionMm ?? null)
      setLoadError(null)
      return j
    } catch (err) {
      setLoadError(cleanIpcError(err) || 'İŞ YÜKLENEMEDİ')
      return null
    }
  }, [jobId])

  useEffect(() => {
    void loadJob()
  }, [loadJob])

  // Sayfadan çıkılırsa (yan menü) sürmekte olan düzeltme durdurulur — İPTAL'e erişim kalmaz.
  // Büküm monitörü üst alanı devraldıysa (aktif iş) dokunulmaz.
  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current)
      if (correctingRef.current && jobId != null && !useBendingActivityStore.getState().active) {
        void window.corventa.bending.manualCorrectStop(jobId).catch(() => undefined)
      }
    }
  }, [jobId])

  // ── ÖLÇÜLEN ÇAP → önerilen yeni hedef ───────────────────────────────────
  async function suggestFromMeasured(d: number) {
    if (!job || current == null) return
    setMeasured(d)
    setCalcBusy(true)
    setBanner(null)
    try {
      const geo = {
        ballDiameter: job.ballDiameterMm,
        thickness: job.profileA, // BendingCalculator "Thickness" = profil kenarı A (orkestratörle aynı)
        centerDistance: job.centerDistanceMm,
        xA1: job.xA1,
        yA1: job.yA1,
        theta: job.thetaDeg,
      }
      const [pt, pm] = await Promise.all([
        window.corventa.bending.calculate({ ...geo, targetBendingDiameter: job.targetDiameterMm }),
        window.corventa.bending.calculate({ ...geo, targetBendingDiameter: d }),
      ])
      if (!pt.success || !pm.success) {
        setNewTarget(null)
        setBanner({ kind: 'error', text: pt.error || pm.error || 'Hesaplama başarısız' })
        return
      }
      setNewTarget(round2(current + (pt.pistonPosition - pm.pistonPosition)))
    } catch (err) {
      setNewTarget(null)
      setBanner({ kind: 'error', text: cleanIpcError(err) || 'Hesaplama başarısız' })
    } finally {
      setCalcBusy(false)
    }
  }

  const delta = newTarget != null && current != null ? round2(newTarget - current) : null
  // Ölçülen çap hedeften küçük → parça fazla bükülmüş (geri açılamaz)
  const overBent =
    (measured != null && job != null && measured < job.targetDiameterMm - 1e-6) ||
    (delta != null && delta <= 0 && measured != null)
  const canApply = !correcting && delta != null && delta > APPLY_MIN_DELTA_MM && !overBent && jobId != null
  const busy = correcting || saving

  function nudge(step: number) {
    const base = newTarget ?? current
    if (base == null) return
    setNewTarget(round2(Math.max(0.01, base + step)))
  }

  // ── PARÇAYA UYGULA (manual-correct) ─────────────────────────────────────
  async function applyToPart() {
    if (!canApply || newTarget == null || current == null || jobId == null) return
    setBanner(null)
    setCorrStatus(null)
    setStopping(false)
    let res
    try {
      res = await window.corventa.bending.manualCorrectStart(jobId, { pushDepthMm: newTarget })
    } catch (err) {
      setBanner({ kind: 'error', text: cleanIpcError(err) || 'DÜZELTME BAŞLATILAMADI' })
      return
    }
    if (!res.started) {
      setBanner({ kind: 'error', text: res.error || 'DÜZELTME BAŞLATILAMADI' })
      return
    }
    setCorrecting(true)
    const from = current
    const to = newTarget
    const meas = measured
    let idlePolls = 0

    const poll = async () => {
      let st: ManualCorrectStatus | null = null
      try {
        st = await window.corventa.bending.manualCorrectStatus(jobId)
      } catch {
        /* anlık hata — tekrar dene */
      }
      if (!correctingRef.current) return
      if (st) setCorrStatus(st)
      const state = st?.state
      if (state === 'Completed') {
        const j = await loadJob()
        const applied = j?.calculatedPistonPositionMm ?? st?.pushDepthMm ?? to
        setCurrent(applied)
        setHistory((h) => [
          ...h,
          { at: new Date().toISOString(), fromMm: from, toMm: applied, measuredDiameterMm: meas, mode: 'part' },
        ])
        setMeasured(null)
        setNewTarget(null)
        setCorrecting(false)
        setBanner({ kind: 'ok', text: 'DÜZELTME TAMAMLANDI — PARÇAYI TEKRAR ÖLÇÜN' })
        return
      }
      if (state === 'Failed' || state === 'Cancelled') {
        setCorrecting(false)
        setBanner({
          kind: state === 'Cancelled' ? 'warn' : 'error',
          text: st?.message || (state === 'Cancelled' ? 'DÜZELTME İPTAL EDİLDİ' : 'DÜZELTME BAŞARISIZ'),
        })
        // Kısmi hareket olabilir — mevcut hedef DataApi'den tazelenir
        void loadJob()
        return
      }
      if (state === 'Idle' || state == null) {
        idlePolls += 1
        if (idlePolls >= IDLE_GIVE_UP_POLLS) {
          setCorrecting(false)
          setBanner({ kind: 'error', text: 'DÜZELTME DURUMU ALINAMADI' })
          return
        }
      }
      pollTimer.current = setTimeout(() => void poll(), POLL_MS)
    }
    pollTimer.current = setTimeout(() => void poll(), POLL_MS)
  }

  async function stopCorrection() {
    if (jobId == null) return
    setStopping(true)
    try {
      const r = await window.corventa.bending.manualCorrectStop(jobId)
      if (!r.success) setBanner({ kind: 'error', text: r.error || 'DURDURULAMADI' })
    } catch (err) {
      setBanner({ kind: 'error', text: cleanIpcError(err) || 'DURDURULAMADI' })
    }
    // Sonuç (Cancelled) yoklamayla gelir
  }

  // ── YENİ PARÇAYLA BÜK ───────────────────────────────────────────────────
  function bendNewPart() {
    if (busy || newTarget == null || current == null || !paramsUsable) return
    const corrections: SavedBendCorrection[] = [
      ...history,
      { at: new Date().toISOString(), fromMm: current, toMm: newTarget, measuredDiameterMm: measured, mode: 'newPart' },
    ]
    setParams({
      manualTarget: { pushDepthMm: newTarget, stageNumber, savedBendId, corrections, paramsKey: manualTargetKey(params) },
      // Aynı vals dizilimi — tekrar onay istenmez (SEKIL-20 TEKRARLA gibi)
      rollArrangementConfirmed: true,
    })
    navigate('/bending/unload', {
      state: { jobOutcome: 'completed', jobId, next: '/bending/ai/part-loading' },
    })
  }

  // ── KAYDET ──────────────────────────────────────────────────────────────
  function startSave() {
    if (busy || !job || current == null || !paramsUsable) return
    setModal(savedBendId != null ? 'saveChoice' : 'name')
  }

  async function persist(mode: 'create' | 'update', name?: string) {
    if (!job || current == null) return
    setModal(null)
    setSaving(true)
    setBanner(null)
    const body = {
      method: SAVED_BEND_METHOD,
      paramsJson: snapshotParamsJson(params),
      targetDiameterMm: job.targetDiameterMm,
      profileA: job.profileA,
      pushDepthMm: current,
      stepDistanceMm: job.stepDistanceMm,
      stageNumber,
      correctionsJson: JSON.stringify(history),
      sourceJobId: job.id,
    }
    try {
      const saved =
        mode === 'update' && savedBendId != null
          ? await window.corventa.bending.updateSavedBend(savedBendId, body)
          : await window.corventa.bending.createSavedBend({ ...body, name: (name ?? '').trim() })
      // TEKRARLA (SEKIL-20) bu kayıtla aynı hedefi kullansın
      setParams({
        manualTarget: {
          pushDepthMm: current,
          stageNumber,
          savedBendId: saved.id,
          corrections: history,
          paramsKey: manualTargetKey(params),
        },
      })
      finish()
    } catch (err) {
      setBanner({ kind: 'error', text: cleanIpcError(err) || 'KAYDEDİLEMEDİ' })
    } finally {
      setSaving(false)
    }
  }

  // ── KAYDETMEDEN BİTİR ───────────────────────────────────────────────────
  function finishWithoutSave() {
    if (busy) return
    // Parçaya düzeltme uygulandıysa TEKRARLA düzeltilmiş hedefle bükülsün (elle hedef güncellenir)
    const corrected = history.some((h) => h.mode === 'part')
    if ((corrected || override) && current != null && paramsUsable) {
      setParams({
        manualTarget: { pushDepthMm: current, stageNumber, savedBendId, corrections: history, paramsKey: manualTargetKey(params) },
      })
    }
    finish()
  }

  function finish() {
    navigate('/bending/unload', { state: { jobOutcome: 'completed', jobId } })
  }

  // ── görünüm ─────────────────────────────────────────────────────────────
  const visibleHistory = history.slice(-HISTORY_VISIBLE)
  const hiddenCount = history.length - visibleHistory.length

  return (
    <div className={styles.page}>
      <div className={styles.titleBand}>
        <span className={styles.title}>{t('BÜKÜM SONUCU')}</span>
        <span className={styles.titleSub}>
          {jobId != null ? t('İŞ #{id}', { id: jobId }) : ''}
          {savedBendId != null ? ` · ${t('KAYITLI BÜKÜM #{id}', { id: savedBendId })}` : ''}
        </span>
      </div>

      <div className={styles.hint}>{t('PARÇA SIKILI — ÇAPI ÖLÇÜN, KARAR VERİN')}</div>

      {(loadError || jobId == null) && (
        <div className={`${styles.banner} ${styles.bannerError}`}>
          <IconLabel icon="error">{jobId == null ? t('İŞ BİLGİSİ YOK') : t(loadError ?? '')}</IconLabel>
        </div>
      )}
      {overBent && !correcting && (
        <div className={`${styles.banner} ${styles.bannerError}`}>
          <IconLabel icon="warning">{t('PARÇA FAZLA BÜKÜLDÜ — YENİ PARÇAYLA BÜKÜN')}</IconLabel>
        </div>
      )}
      {banner && !(overBent && banner.kind === 'warn') && (
        <div
          className={`${styles.banner} ${
            banner.kind === 'ok'
              ? styles.bannerOk
              : banner.kind === 'error'
                ? styles.bannerError
                : banner.kind === 'warn'
                  ? styles.bannerWarn
                  : styles.bannerInfo
          }`}
        >
          <IconLabel icon={banner.kind === 'ok' ? 'success' : banner.kind === 'info' ? 'info' : 'warning'}>
            {t(banner.text)}
          </IconLabel>
        </div>
      )}
      {!paramsUsable && job && (
        <div className={`${styles.banner} ${styles.bannerWarn}`}>
          <IconLabel icon="warning">{t('BÜKÜM PARAMETRELERİ BULUNAMADI — KAYDET / YENİ PARÇA KAPALI')}</IconLabel>
        </div>
      )}

      <div className={styles.columns}>
        {/* ── Sol: özet + düzeltme geçmişi ── */}
        <div className={styles.col}>
          <div className={styles.summary}>
            <SummaryRow label={t('HEDEF ÇAP')} value={job ? `Ø ${fmtNum(job.targetDiameterMm)}` : '—'} unit="mm" />
            <SummaryRow label={t('MEVCUT HEDEF KONUM')} value={fmtNum(current)} unit="mm" strong />
            <SummaryRow label={t('ADIM (G)')} value={job ? fmtNum(job.stepDistanceMm) : '—'} unit="mm" />
            <SummaryRow label={t('PROFİL A')} value={job ? fmtNum(job.profileA) : '—'} unit="mm" />
          </div>

          <div className={styles.history}>
            <div className={styles.historyHead}>
              {t('DÜZELTME GEÇMİŞİ')}
              {hiddenCount > 0 && <span className={styles.historyMore}>{t('+{n} ÖNCEKİ', { n: hiddenCount })}</span>}
            </div>
            {visibleHistory.length === 0 ? (
              <div className={styles.historyEmpty}>{t('HENÜZ DÜZELTME YOK')}</div>
            ) : (
              visibleHistory.map((h, i) => (
                <div key={`${h.at}-${i}`} className={styles.historyRow}>
                  <span className={styles.historyMode} data-mode={h.mode}>
                    {h.mode === 'part' ? t('PARÇA') : t('YENİ PARÇA')}
                  </span>
                  <span className={styles.mono}>
                    {fmtNum(h.fromMm)} → {fmtNum(h.toMm)}
                  </span>
                  <span className={styles.historyMeas}>
                    {h.measuredDiameterMm != null ? `Ø ${fmtNum(h.measuredDiameterMm)}` : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Sağ: ölçüm → yeni hedef ── */}
        <div className={styles.col}>
          {correcting ? (
            <div className={styles.progress}>
              <div className={styles.progressTitle}>{t('DÜZELTME PASOSU UYGULANIYOR')}</div>
              <div className={styles.progressTarget}>
                {fmtNum(corrStatus?.previousPushDepthMm ?? current)} → {fmtNum(corrStatus?.pushDepthMm ?? newTarget)} mm
              </div>
              <div className={styles.progressMsg}>{t(corrStatus?.message || 'BAŞLATILIYOR...')}</div>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnStop}`}
                onClick={() => void stopCorrection()}
                disabled={stopping}
              >
                <IconLabel icon="stop">{stopping ? t('DURDURULUYOR...') : t('İPTAL')}</IconLabel>
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className={styles.valueBox}
                onClick={() => setModal('measured')}
                disabled={!job || current == null || busy}
              >
                <span className={styles.valueLabel}>{t('ÖLÇÜLEN ÇAP')}</span>
                <span className={styles.valueBig}>
                  {measured != null ? `Ø ${fmtNum(measured)}` : t('DOKUNUN')}
                  {measured != null && <span className={styles.valueUnit}>mm</span>}
                </span>
              </button>

              <button
                type="button"
                className={`${styles.valueBox} ${styles.valueBoxTarget}`}
                onClick={() => setModal('target')}
                disabled={!job || current == null || busy}
              >
                <span className={styles.valueLabel}>{t('YENİ HEDEF KONUM')}</span>
                <span className={styles.valueBig}>
                  {calcBusy ? t('HESAPLANIYOR...') : newTarget != null ? fmtNum(newTarget) : '—'}
                  {!calcBusy && newTarget != null && <span className={styles.valueUnit}>mm</span>}
                </span>
                <span className={styles.delta} data-sign={delta == null ? undefined : delta > 0 ? 'pos' : 'neg'}>
                  {delta != null ? t('FARK {d} mm', { d: `${delta > 0 ? '+' : ''}${fmtNum(delta)}` }) : t('ÖLÇÜ GİRİN VEYA HEDEFİ YAZIN')}
                </span>
              </button>

              <div className={styles.nudgeRow}>
                {[-1, -0.1, 0.1, 1].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={styles.nudge}
                    onClick={() => nudge(s)}
                    disabled={current == null || busy}
                  >
                    {s > 0 ? `+${s}` : s}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={!canApply || busy}
          onClick={() => void applyToPart()}
        >
          <IconLabel icon="play">{t('PARÇAYA UYGULA')}</IconLabel>
        </button>
        <button
          type="button"
          className={`${styles.btn} ${overBent ? styles.btnPrimary : ''}`}
          disabled={busy || newTarget == null || current == null || !paramsUsable}
          onClick={bendNewPart}
        >
          <IconLabel icon="repeat">{t('YENİ PARÇAYLA BÜK')}</IconLabel>
        </button>
        <button
          type="button"
          className={styles.btn}
          disabled={busy || !job || current == null || !paramsUsable || overBent}
          onClick={startSave}
        >
          <IconLabel icon="download">{saving ? t('KAYDEDİLİYOR...') : t('KAYDET')}</IconLabel>
        </button>
        <button type="button" className={styles.btn} disabled={busy} onClick={finishWithoutSave}>
          <IconLabel icon="next">{t('KAYDETMEDEN BİTİR')}</IconLabel>
        </button>
      </div>

      {modal === 'measured' && (
        <NumpadModal
          fieldLabel={t('ÖLÇÜLEN ÇAP (mm)')}
          // 2026-11-17: her ölçüm temiz başlar (önceki değerin sonuna eklenmesin)
          initialValue=""
          onClose={() => setModal(null)}
          onConfirm={(v) => {
            setModal(null)
            const d = parseFloat(v)
            if (!Number.isFinite(d) || d <= 0) return
            // Yazım hatası koruması: hedef çapın 1/4'ü ile 4 katı dışı ölçü anlamsız kabul edilir
            if (job && (d < job.targetDiameterMm / 4 || d > job.targetDiameterMm * 4)) {
              setBanner({ kind: 'error', text: t('ÖLÇÜLEN ÇAP ANLAMSIZ ({d} mm) — TEKRAR GİRİN', { d }) })
              return
            }
            void suggestFromMeasured(d)
          }}
        />
      )}
      {modal === 'target' && (
        <NumpadModal
          fieldLabel={t('YENİ HEDEF KONUM (mm)')}
          initialValue=""
          onClose={() => setModal(null)}
          onConfirm={(v) => {
            setModal(null)
            const n = parseFloat(v)
            if (!Number.isFinite(n) || n <= 0) return
            // Piston kursu (422 mm) üstü veya mevcut hedeften 150 mm'den fazla sapma yazım hatasıdır
            if (n > 422 || (current != null && Math.abs(n - current) > 150)) {
              setBanner({ kind: 'error', text: t('HEDEF KONUM GEÇERSİZ ({n} mm) — TEKRAR GİRİN', { n }) })
              return
            }
            setNewTarget(round2(n))
          }}
        />
      )}
      {modal === 'name' && job && (
        <KeyboardModal
          label={t('KAYIT ADI')}
          maxLength={100}
          initialValue={defaultSavedBendName(job.targetDiameterMm, job.profileA)}
          onClose={() => setModal(null)}
          onConfirm={(v) => {
            if (!v.trim()) return
            void persist('create', v)
          }}
        />
      )}
      {modal === 'saveChoice' && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <p className={styles.dialogText}>
              {t('BU BÜKÜM KAYITLI BİR BÜKÜMDEN ÇALIŞTIRILDI. KAYDI GÜNCELLEMEK Mİ, YENİ KAYIT MI?')}
            </p>
            <div className={styles.dialogActions}>
              <button type="button" className={styles.btn} onClick={() => setModal(null)}>
                {t('VAZGEÇ')}
              </button>
              <button type="button" className={styles.btn} onClick={() => setModal('name')}>
                {t('YENİ KAYIT OLARAK')}
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => void persist('update')}
              >
                {t('GÜNCELLE')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryRow({ label, value, unit, strong }: { label: string; value: string; unit: string; strong?: boolean }) {
  return (
    <div className={styles.summaryRow} data-strong={strong || undefined}>
      <span className={styles.summaryLabel}>{label}</span>
      <span className={styles.summaryValue}>
        {value}
        {value !== '—' && <span className={styles.valueUnit}>{unit}</span>}
      </span>
    </div>
  )
}
