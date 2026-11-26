// STANDART SÜRÜM (2026-11-17) — BÜKÜM SONUCU: ÇOK AÇILI / SERPANTİN / SIVAMA.
// ÇEMBER'den farkı: parçaya düzeltme pasosu (PARÇAYA UYGULA) YOK — düzeltme YENİ PARÇAYA uygulanır.
// Operatör parçayı kendi aletiyle ölçer → alan başına ÖLÇÜLEN (opsiyonel) → önerilen yeni girdi
//   R_yeni = R_girdi × R_hedef / R_ölçülen      (services/methodCorrection.ts)
// ± / numpad ile değiştirir. Kararlar:
//   YENİ PARÇAYLA BÜK   — yeni girdiler metot parametrelerine → tahliye → parça yükleme (hedef yeniden hesaplanır).
//                         ÇOK AÇILI'da plan (validate-plan) önce kontrol edilir; uzatma / sıra değişirse ölçü ekranına gidilir.
//   KAYDET / GÜNCELLE   — bu parçayı büken girdiler kayıtlı büküme → tahliye
//   KAYDETMEDEN BİTİR   — tahliye

import { chosenStage } from '@/services/stageChoice'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Icon, IconLabel } from '@/components/Icon'
import KeyboardModal from '@/components/KeyboardModal/KeyboardModal'
import NumpadModal from '@/components/NumpadModal/NumpadModal'
import { useT } from '@/i18n'
import {
  applyMethodValues,
  initialTargets,
  methodFields,
  methodProfileA,
  methodTitle,
  primaryRadius,
  suggestCorrected,
  type MethodField,
} from '@/services/methodCorrection'
import { SAVED_BEND_METHOD_BY_ID, cleanIpcError, fmtNum, snapshotParamsJson } from '@/services/savedBends'
import { useMachineStateStore } from '@/stores/machineStateStore'
import { methodParamsKey, useBendingJobStore, type BendingJobParams } from '@/store/bendingJobStore'
import { BendingMethod, type BendingJob, type SavedBendCorrection } from '@shared/types'
import base from './BendingResultPage.module.css'
import styles from './MethodResult.module.css'

/** Tabloda aynı anda gösterilen satır (kaydırma çubuğu yok — fazlası sayfalanır) */
const ROWS_PER_PAGE = 4

type Banner = { kind: 'ok' | 'warn' | 'error' | 'info'; text: string } | null
type Modal = { kind: 'measured' | 'value'; id: string } | { kind: 'name' } | { kind: 'saveChoice' } | null

const JOB_METHOD: Record<string, number> = {
  arc: BendingMethod.Arc,
  spiral: BendingMethod.Serpantin,
  sivama: BendingMethod.Sivama,
}

const round2 = (v: number) => Math.round(v * 100) / 100

function readNav(state: unknown): { jobId: number | null; savedBendId: number | null; jobMessage: string | null } {
  const s = state && typeof state === 'object' ? (state as Record<string, unknown>) : {}
  const int = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null)
  return {
    jobId: int(s.jobId),
    savedBendId: int(s.savedBendId),
    jobMessage: typeof s.jobMessage === 'string' && s.jobMessage ? s.jobMessage : null,
  }
}

export default function MethodResult() {
  const t = useT()
  const navigate = useNavigate()
  const { state: navState } = useLocation()
  const nav = readNav(navState)
  const jobId = nav.jobId

  const params = useBendingJobStore((s) => s.params)
  const setParams = useBendingJobStore((s) => s.setParams)
  const method = params.bendingMethod

  // Bu parçayı büken girdiler (mağaza) — ekran açıkken değişmez
  const fields = useMemo(() => methodFields(params), [params])
  // Düzeltme bağlamı bu parametrelere mi ait (operatör sonradan elle değiştirdiyse geçersiz)
  const ctx = params.methodRun && params.methodRun.paramsKey === methodParamsKey(params) ? params.methodRun : null
  const targets = useMemo<Record<string, number>>(
    () => ({ ...initialTargets(fields), ...(ctx?.targets ?? {}) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields, ctx?.targets],
  )
  const savedBendId = ctx ? (nav.savedBendId ?? ctx.savedBendId ?? null) : null

  const [job, setJob] = useState<BendingJob | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [history] = useState<SavedBendCorrection[]>(() => ctx?.corrections ?? [])
  const [measured, setMeasured] = useState<Record<string, number>>({})
  const [next, setNext] = useState<Record<string, number>>(() =>
    Object.fromEntries(fields.map((f) => [f.id, f.value])),
  )
  const [page, setPage] = useState(0)
  const [modal, setModal] = useState<Modal>(null)
  const [banner, setBanner] = useState<Banner>(nav.jobMessage ? { kind: 'warn', text: nav.jobMessage } : null)
  const [busy, setBusy] = useState(false)

  const machineStage = useMachineStateStore((s) => s.state.physicalInfo?.currentStage ?? 0)
  const stageNumber = machineStage > 0 ? machineStage : null

  useEffect(() => {
    if (jobId == null) return
    let alive = true
    window.corventa.bending
      .getJob(jobId)
      .then((j) => alive && setJob(j))
      .catch((err) => alive && setLoadError(cleanIpcError(err) || 'İŞ YÜKLENEMEDİ'))
    return () => {
      alive = false
    }
  }, [jobId])

  // Mağazadaki parametreler bu işe mi ait (metot + profil A)
  const profileA = methodProfileA(params)
  const paramsMatchJob =
    !job ||
    (method != null &&
      JOB_METHOD[method] === Number(job.method) &&
      (profileA == null || Math.abs(profileA - job.profileA) < 1e-3))
  const paramsUsable = !!params.profileId && fields.length > 0 && paramsMatchJob

  const changed = fields.filter((f) => Math.abs((next[f.id] ?? f.value) - f.value) > 1e-6)
  const pageCount = Math.max(1, Math.ceil(fields.length / ROWS_PER_PAGE))
  const safePage = Math.min(page, pageCount - 1)
  const visible = fields.slice(safePage * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE + ROWS_PER_PAGE)

  function setValue(f: MethodField, v: number) {
    const clamped = round2(Math.min(f.max, Math.max(f.min, v)))
    setNext((n) => ({ ...n, [f.id]: clamped }))
  }

  function onMeasured(f: MethodField, d: number) {
    const target = targets[f.id]
    // Yazım hatası koruması: hedefin 1/4'ü ile 4 katı dışı ölçü anlamsız
    if (target != null && (d < target / 4 || d > target * 4)) {
      setBanner({ kind: 'error', text: t('ÖLÇÜLEN DEĞER ANLAMSIZ ({d} mm) — TEKRAR GİRİN', { d }) })
      return
    }
    setBanner(null)
    setMeasured((m) => ({ ...m, [f.id]: d }))
    if (f.suggest && target != null) {
      const s = suggestCorrected(f.value, target, d)
      if (s != null) setValue(f, s)
    }
  }

  /** Bu ekranda değişen / ölçülen alanların geçmiş kayıtları */
  function newEntries(): SavedBendCorrection[] {
    const at = new Date().toISOString()
    return fields
      .filter((f) => changed.includes(f) || measured[f.id] != null)
      .map((f) => ({
        at,
        fromMm: f.value,
        toMm: next[f.id] ?? f.value,
        measuredDiameterMm: null,
        mode: 'newPart' as const,
        field: f.id,
        measuredValue: measured[f.id] ?? null,
        targetValue: targets[f.id] ?? null,
      }))
  }

  // ── YENİ PARÇAYLA BÜK ───────────────────────────────────────────────────
  async function bendNewPart() {
    if (busy || !paramsUsable) return
    setBanner(null)
    let partial: Partial<BendingJobParams> = applyMethodValues(params, next)
    let nextPath = '/bending/ai/part-loading'

    // ÇOK AÇILI: yay boyları değişir → plan (parça boyu bütçesi / sıra) tekrar kontrol edilir.
    // Uzatma gerekmez ve sıra aynı kalırsa doğrudan parça yükleme; aksi halde ölçü ekranı (ONAYLA) üzerinden.
    if (method === 'arc' && partial.arcBending && changed.some((f) => f.kind === 'radius')) {
      const ab = partial.arcBending
      setBusy(true)
      try {
        const res = await window.corventa.bending.validateArcPlan({
          partLengthMm: ab.LTotal ?? 0,
          xa1AbsMm: 0,
          profileAMm: ab.A ?? 0,
          stageNumber: chosenStage(ab.A ?? 0) ?? undefined,
          segments: (ab.segments ?? []).map((s, i) => ({
            segmentOrder: i + 1,
            radiusMm: s.R ?? 0,
            angleDeg: s.Alpha ?? 0,
            straightAfterMm: s.L ?? 0,
          })),
        })
        if (!res || res.success === false) {
          setBanner({ kind: 'error', text: res?.error || 'PLAN KONTROLÜ BAŞARISIZ' })
          return
        }
        const sameOrder = (res.isReversed ?? false) === (params.arcBending?.isReversedOrder ?? false)
        if ((res.extensionMm ?? 0) > 0 || !sameOrder) {
          // Parça boyu / sıra değişiyor — operatör ölçü ekranında planı görüp onaylasın
          nextPath = '/bending/ai/measurements/arc'
        } else {
          partial = { arcBending: { ...ab, isReversedOrder: res.isReversed ?? false } }
        }
      } catch (err) {
        setBanner({ kind: 'error', text: cleanIpcError(err) || 'PLAN KONTROLÜ BAŞARISIZ' })
        return
      } finally {
        setBusy(false)
      }
    }

    const merged = { ...params, ...partial }
    setParams({
      ...partial,
      manualTarget: null,
      methodRun: {
        targets,
        savedBendId,
        corrections: [...history, ...newEntries()],
        paramsKey: methodParamsKey(merged),
      },
      // Aynı vals dizilimi — tekrar onay istenmez (SEKIL-20 TEKRARLA gibi)
      rollArrangementConfirmed: true,
    })
    navigate('/bending/unload', { state: { jobOutcome: 'completed', jobId, next: nextPath } })
  }

  // ── KAYDET ──────────────────────────────────────────────────────────────
  function startSave() {
    if (busy || !paramsUsable) return
    setModal(savedBendId != null ? { kind: 'saveChoice' } : { kind: 'name' })
  }

  async function persist(mode: 'create' | 'update', name?: string) {
    if (!method) return
    setModal(null)
    setBusy(true)
    setBanner(null)
    // Kaydedilen = BU PARÇAYI büken girdiler (ekrandaki öneri değil)
    const r = targets.R1 ?? targets.R ?? primaryRadius(params)
    const corrections = [...history, ...newEntries().filter((e) => e.measuredValue != null).map((e) => ({ ...e, toMm: e.fromMm }))]
    const body = {
      method: SAVED_BEND_METHOD_BY_ID[method],
      paramsJson: snapshotParamsJson(params, targets),
      ...(r != null ? { targetDiameterMm: round2(r * 2) } : {}),
      profileA: profileA ?? job?.profileA ?? 0,
      ...(method === 'arc' && params.arcBending?.G ? { stepDistanceMm: params.arcBending.G } : {}),
      stageNumber,
      correctionsJson: JSON.stringify(corrections),
      ...(jobId != null ? { sourceJobId: jobId } : {}),
    }
    try {
      const saved =
        mode === 'update' && savedBendId != null
          ? await window.corventa.bending.updateSavedBend(savedBendId, body)
          : await window.corventa.bending.createSavedBend({ ...body, name: (name ?? '').trim() })
      // TEKRARLA (SEKIL-20) bu kayda bağlı kalsın
      setParams({
        methodRun: { targets, savedBendId: saved.id, corrections, paramsKey: methodParamsKey(params) },
      })
      finish()
    } catch (err) {
      setBanner({ kind: 'error', text: cleanIpcError(err) || 'KAYDEDİLEMEDİ' })
    } finally {
      setBusy(false)
    }
  }

  function finish() {
    navigate('/bending/unload', { state: { jobOutcome: 'completed', jobId } })
  }

  function defaultName(): string {
    const d = new Date()
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const r = targets.R1 ?? targets.R ?? primaryRadius(params)
    return `${t(methodTitle(method))} · R${fmtNum(r)} · A${fmtNum(profileA)} · ${day}`
  }

  const modalField =
    modal && (modal.kind === 'measured' || modal.kind === 'value') ? fields.find((f) => f.id === modal.id) ?? null : null
  const lastEntry = history.length > 0 ? history[history.length - 1] : null

  return (
    <div className={base.page}>
      <div className={base.titleBand}>
        <span className={base.title}>
          {t('BÜKÜM SONUCU')} · {t(methodTitle(method))}
        </span>
        <span className={base.titleSub}>
          {jobId != null ? t('İŞ #{id}', { id: jobId }) : ''}
          {savedBendId != null ? ` · ${t('KAYITLI BÜKÜM #{id}', { id: savedBendId })}` : ''}
        </span>
      </div>

      <div className={base.hint}>{t('PARÇAYI ÖLÇÜN — DÜZELTME YENİ PARÇAYA UYGULANIR')}</div>

      {(loadError || jobId == null) && (
        <div className={`${base.banner} ${base.bannerError}`}>
          <IconLabel icon="error">{jobId == null ? t('İŞ BİLGİSİ YOK') : t(loadError ?? '')}</IconLabel>
        </div>
      )}
      {method === 'sivama' && (
        <div className={`${base.banner} ${base.bannerInfo}`}>
          <IconLabel icon="info">{t('SIVAMADA TOPLAR STAGE KONUMUNDA KALIR — R / X ÇAPI DEĞİŞTİRMEZ')}</IconLabel>
        </div>
      )}
      {banner && (
        <div
          className={`${base.banner} ${
            banner.kind === 'ok'
              ? base.bannerOk
              : banner.kind === 'error'
                ? base.bannerError
                : banner.kind === 'warn'
                  ? base.bannerWarn
                  : base.bannerInfo
          }`}
        >
          <IconLabel icon={banner.kind === 'ok' ? 'success' : banner.kind === 'info' ? 'info' : 'warning'}>
            {t(banner.text)}
          </IconLabel>
        </div>
      )}
      {!paramsUsable && (
        <div className={`${base.banner} ${base.bannerWarn}`}>
          <IconLabel icon="warning">{t('BÜKÜM PARAMETRELERİ BULUNAMADI — KAYDET / YENİ PARÇA KAPALI')}</IconLabel>
        </div>
      )}

      <div className={styles.table}>
        <div className={`${styles.row} ${styles.head}`}>
          <span>{t('ÖLÇÜ')}</span>
          <span className={styles.num}>{t('İSTENEN')}</span>
          <span className={styles.num}>{t('BÜKÜLEN')}</span>
          <span className={styles.newHead}>{t('ÖLÇÜLEN')}</span>
          <span className={styles.newHead}>{t('YENİ PARÇA İÇİN')}</span>
        </div>
        {visible.map((f) => {
          const nv = next[f.id] ?? f.value
          const diff = round2(nv - f.value)
          return (
            <div key={f.id} className={styles.row}>
              <span className={styles.label}>
                <span className={styles.labelMain}>
                  {f.label}
                  <span className={styles.unit}>{f.kind === 'angle' ? '°' : 'mm'}</span>
                </span>
                {f.sub && <span className={styles.labelSub}>{f.sub}</span>}
              </span>
              <span className={styles.num}>{f.kind === 'step' ? '—' : fmtNum(targets[f.id])}</span>
              <span className={styles.num}>{fmtNum(f.value)}</span>
              {f.measurable ? (
                <button
                  type="button"
                  className={styles.measBtn}
                  data-filled={measured[f.id] != null || undefined}
                  disabled={busy}
                  onClick={() => setModal({ kind: 'measured', id: f.id })}
                >
                  {measured[f.id] != null ? fmtNum(measured[f.id]) : t('GİR')}
                </button>
              ) : (
                <span className={styles.newHead}>—</span>
              )}
              <span className={styles.newCell}>
                <button
                  type="button"
                  className={styles.step}
                  disabled={busy}
                  onClick={() => setValue(f, nv - f.steps[0])}
                >
                  −
                </button>
                <button
                  type="button"
                  className={styles.newBtn}
                  data-changed={Math.abs(diff) > 1e-6 || undefined}
                  disabled={busy}
                  onClick={() => setModal({ kind: 'value', id: f.id })}
                >
                  <span className={styles.newVal}>{fmtNum(nv)}</span>
                  <span className={styles.newDiff} data-sign={diff > 0 ? 'pos' : diff < 0 ? 'neg' : undefined}>
                    {Math.abs(diff) > 1e-6 ? `${diff > 0 ? '+' : ''}${fmtNum(diff)}` : t('AYNI')}
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.step}
                  disabled={busy}
                  onClick={() => setValue(f, nv + f.steps[0])}
                >
                  +
                </button>
              </span>
            </div>
          )
        })}
      </div>

      <div className={styles.infoRow}>
        <span className={styles.formula}>
          {method === 'sivama' ? t('ÖLÇÜLEN DEĞER KAYDA YAZILIR') : t('ÖNERİ: YENİ R = BÜKÜLEN R × İSTENEN R / ÖLÇÜLEN R')}
        </span>
        <span className={styles.histInfo}>
          {t('DÜZELTME GEÇMİŞİ')}: {history.length}
          {lastEntry?.field ? ` · ${lastEntry.field} ${fmtNum(lastEntry.fromMm)} → ${fmtNum(lastEntry.toMm)}` : ''}
        </span>
        {pageCount > 1 && (
          <span className={styles.pager}>
            <button type="button" className={styles.pageBtn} disabled={safePage <= 0} onClick={() => setPage(safePage - 1)}>
              <Icon name="chevronLeft" />
            </button>
            <span className={styles.pageInfo}>
              {safePage + 1} / {pageCount}
            </span>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
            >
              <Icon name="chevronRight" />
            </button>
          </span>
        )}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${base.btn} ${changed.length > 0 ? base.btnPrimary : ''}`}
          disabled={busy || !paramsUsable}
          onClick={() => void bendNewPart()}
        >
          <IconLabel icon="repeat">{t('YENİ PARÇAYLA BÜK')}</IconLabel>
        </button>
        <button type="button" className={base.btn} disabled={busy || !paramsUsable} onClick={startSave}>
          <IconLabel icon="download">{busy ? t('KAYDEDİLİYOR...') : t('KAYDET')}</IconLabel>
        </button>
        <button type="button" className={base.btn} disabled={busy} onClick={finish}>
          <IconLabel icon="next">{t('KAYDETMEDEN BİTİR')}</IconLabel>
        </button>
      </div>

      {modalField && modal?.kind === 'measured' && (
        <NumpadModal
          fieldLabel={t('ÖLÇÜLEN {f} (mm)', { f: modalField.label })}
          initialValue=""
          onClose={() => setModal(null)}
          onConfirm={(v) => {
            setModal(null)
            const d = parseFloat(v)
            if (Number.isFinite(d) && d > 0) onMeasured(modalField, d)
          }}
        />
      )}
      {modalField && modal?.kind === 'value' && (
        <NumpadModal
          fieldLabel={t('YENİ {f} ({u})', { f: modalField.label, u: modalField.kind === 'angle' ? '°' : 'mm' })}
          initialValue=""
          onClose={() => setModal(null)}
          onConfirm={(v) => {
            setModal(null)
            const n = parseFloat(v)
            if (!Number.isFinite(n) || n < modalField.min || n > modalField.max) {
              setBanner({ kind: 'error', text: t('DEĞER GEÇERSİZ ({n}) — TEKRAR GİRİN', { n: v }) })
              return
            }
            setValue(modalField, n)
          }}
        />
      )}
      {modal?.kind === 'name' && (
        <KeyboardModal
          label={t('KAYIT ADI')}
          maxLength={100}
          initialValue={defaultName()}
          onClose={() => setModal(null)}
          onConfirm={(v) => {
            if (!v.trim()) return
            void persist('create', v)
          }}
        />
      )}
      {modal?.kind === 'saveChoice' && (
        <div className={base.overlay} onClick={() => setModal(null)}>
          <div className={base.dialog} onClick={(e) => e.stopPropagation()}>
            <p className={base.dialogText}>
              {t('BU BÜKÜM KAYITLI BİR BÜKÜMDEN ÇALIŞTIRILDI. KAYDI GÜNCELLEMEK Mİ, YENİ KAYIT MI?')}
            </p>
            <div className={base.dialogActions}>
              <button type="button" className={base.btn} onClick={() => setModal(null)}>
                {t('VAZGEÇ')}
              </button>
              <button type="button" className={base.btn} onClick={() => setModal({ kind: 'name' })}>
                {t('YENİ KAYIT OLARAK')}
              </button>
              <button
                type="button"
                className={`${base.btn} ${base.btnPrimary}`}
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
