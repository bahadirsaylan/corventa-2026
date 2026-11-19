// Ayarlar > Admin Ayarları > Cetvel Sıfırlama — gönye alma (makine referans pozisyonu).
// Sadece Admin Ayarları'ndan açılır (Ayarlar ızgarasında yok); geri butonu /settings/admin'e döner.
// Backend: POST /api/preparation/gonye (Web projesindeki "Gönye Al" ile aynı çağrı, boş body).
// Akış (backend): pistonlar mekanik limite çekilir → tüm cetveller sıfırlanır → gönye ofsetlerine gidilir
// → cetveller tekrar sıfırlanır → fiziksel pozisyon takibi "gönye yapıldı" olarak işaretlenir.
// 2026-11-19 GÜVENLİ GÖNYE: HER gönye güvenlidir — her top son bilinen konumdan beklenen mesafeyle karşılaştırılır,
// erken duran top ENGEL (ileri alınır, cetvel sıfırlanmaz). Beklenen bilinmiyorsa kontrol listesi onayı; engelden sonra
// ATÖLYE SORUMLUSU+ "KONTROL ETTİM, ENGEL YOK — YAVAŞ GÖNYE AL". Canlı tablo: rulerStatus.safeGonye (SignalR).

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import type { SafeGonyeOptions, SafeGonyeReport, StageInfo } from '@shared/types'
import ConfirmModal from '@/components/ConfirmModal/ConfirmModal'
import { SafeGonyeConfirmModal, SafeGonyeTable } from '@/components/SafeGonye/SafeGonyePanel'
import { useHasRole, useSessionStore } from '@/stores/sessionStore'
import { Icon, IconLabel } from '@/components/Icon'
import { useMachineStateStore } from '@/stores/machineStateStore'
import { useBendingActive } from '@/stores/bendingActivityStore'
import { useT, tp } from '@/i18n'
import styles from './EncoderResetPage.module.css'

// Backend POST /api/preparation/stage 1-5 kabul eder (4-5 Admin Ayarları'nda aktif edilirse).
// Liste DataApi'den sadece AKTİF stage'lerle gelir; yedek liste 1-3.
const VALID_STAGES = [1, 2, 3, 4, 5]
const FALLBACK_STAGES: StageInfo[] = [1, 2, 3].map((n) => ({
  id: n, stageNumber: n, name: `Stage ${n}`, leftOffsetMm: 0, rightOffsetMm: 0, lowerOffsetMm: 0,
}))

const STEPS = [
  'TÜM PİSTONLAR MEKANİK LİMİTE GERİ ÇEKİLİR — HER TOP SON BİLİNEN KONUMDAN BEKLENEN MESAFEYLE KARŞILAŞTIRILIR',
  'ERKEN DURAN TOP = ENGEL: TOP HEMEN İLERİ ALINIR, CETVEL SIFIRLANMAZ',
  'TÜM CETVELLER SIFIRLANIR — REFERANS NOKTASI',
  'PİSTONLAR GÖNYE OFSET POZİSYONLARINA GİDER',
  'CETVELLER GÖNYE POZİSYONUNDA TEKRAR SIFIRLANIR',
]

type Status = { kind: 'ok' | 'error'; text: string } | null

export default function EncoderResetPage() {
  const navigate = useNavigate()
  const t = useT()
  const motorState = useMachineStateStore((s) => s.state.hydraulicMotorState)
  // Shallow — physicalInfo her 10 Hz tick'te yeni nesne geliyor, alanlar değişmediyse sayfa çizilmez
  const physical = useMachineStateStore(useShallow((s) => s.state.physicalInfo))
  const bendingActive = useBendingActive()

  const [confirming, setConfirming] = useState(false)
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  // GÜVENLİ GÖNYE — cetvel durumu + canlı / son rapor (SignalR) + son çağrının raporu
  const rulers = useMachineStateStore(useShallow((s) => ({
    valid: s.state.rulerStatus?.valid ?? null,
    reason: s.state.rulerStatus?.invalidMessage ?? null,
    lastKnown: s.state.rulerStatus?.lastKnown ?? null,
    live: s.state.rulerStatus?.safeGonye ?? null,
    liveRunning: s.state.rulerStatus?.safeGonyeRunning ?? false,
  })))
  const [lastReport, setLastReport] = useState<SafeGonyeReport | null>(null)
  const [needConfirm, setNeedConfirm] = useState<string | null>(null) // sebep metni
  const [overrideConfirm, setOverrideConfirm] = useState(false)
  const canOverride = useHasRole('SUPERVISOR')
  const displayName = useSessionStore((s) => s.displayName ?? s.username)
  const pick = running || rulers.liveRunning ? rulers.live : (lastReport ?? rulers.live)
  // Onay istenen (hareketsiz) raporda top satırı yok → adımlar gösterilir
  const shownReport = pick && pick.pistons.length > 0 ? pick : null
  // Beklenen bilinmiyor: cetveller geçersiz ve son konum kaydı kullanılamıyor → önce kontrol listesi
  const expectationUnknown = rulers.valid === false && !(rulers.lastKnown?.usable ?? false)

  // Stage seçimi — DB'deki stage tanımları (okunamazsa 1-3 sabit liste)
  const [stages, setStages] = useState<StageInfo[]>(FALLBACK_STAGES)
  const [stageConfirm, setStageConfirm] = useState<StageInfo | null>(null)
  const [stageRunning, setStageRunning] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    window.corventa.settings
      .getStages()
      .then((list) => {
        const valid = (list ?? [])
          .filter((s) => VALID_STAGES.includes(s.stageNumber))
          .sort((a, b) => a.stageNumber - b.stageNumber)
        if (alive && valid.length > 0) setStages(valid)
      })
      .catch(() => {
        /* DataApi'ye ulaşılamadı — sabit liste kalır */
      })
    return () => {
      alive = false
    }
  }, [])

  const motorReady = motorState === 2
  const busy = running || stageRunning != null
  const blockedReason = bendingActive
    ? 'OTOMATİK BÜKÜM DEVAM EDİYOR — GÖNYE ALINAMAZ.'
    : !motorReady
      ? 'HİDROLİK MOTOR ÇALIŞMIYOR — ÖNCE MOTORU START EDİN.'
      : null
  const stageBlockedReason = blockedReason
    ? blockedReason.replace('GÖNYE ALINAMAZ', 'STAGE DEĞİŞTİRİLEMEZ')
    : !physical.isGonyeCompleted
      ? 'ÖNCE GÖNYE ALINMALI — STAGE GÖNYEYE GÖRE KONUMLANIR.'
      : null

  async function runStage(st: StageInfo) {
    setStageConfirm(null)
    setStageRunning(st.stageNumber)
    setStatus(null)
    try {
      await window.corventa.bending.applyStage({ targetStage: st.stageNumber, speedPercent: 50 })
      setStatus({ kind: 'ok', text: t('{name} KONUMUNA GEÇİLDİ.', { name: st.name.toUpperCase() }) })
    } catch (e) {
      setStatus({ kind: 'error', text: t('STAGE DEĞİŞTİRİLEMEDİ: {err}', { err: tp(e instanceof Error ? e.message : String(e)) }) })
    } finally {
      setStageRunning(null)
    }
  }

  function startGonye() {
    setConfirming(false)
    if (expectationUnknown) {
      setNeedConfirm(rulers.lastKnown?.unusableReason ?? 'SON KONUM KAYDI YOK')
      return
    }
    void runGonye()
  }

  async function runGonye(opts?: SafeGonyeOptions) {
    setConfirming(false)
    setNeedConfirm(null)
    setOverrideConfirm(false)
    setRunning(true)
    setStatus(null)
    setLastReport(null)
    try {
      const res = await window.corventa.bending.executeGonye(opts)
      const rep = res.safeGonye ?? null
      setLastReport(rep)
      if (!res.success && rep?.errorCode === 'CONFIRMATION_REQUIRED') {
        // Backend beklenenin bilinmediğini söyledi → kontrol listesi
        setNeedConfirm(rep.message ?? null)
        return
      }
      setStatus(
        res.success
          ? { kind: 'ok', text: rep && rep.warnings.length > 0
              ? t('GÖNYE TAMAMLANDI — UYARILAR VAR (TABLOYA BAKIN).')
              : t('GÖNYE BAŞARIYLA TAMAMLANDI — CETVELLER SIFIRLANDI.') }
          : { kind: 'error', text: t('GÖNYE BAŞARISIZ: {err}', { err: tp(res.errorMessage) || t('BİLİNMEYEN HATA') }) },
      )
    } catch (e) {
      setStatus({ kind: 'error', text: t('GÖNYE ÇAĞRISI BAŞARISIZ: {err}', { err: tp(e instanceof Error ? e.message : String(e)) }) })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings/admin', { state: { tab: 'gonye' } })} aria-label={t('Geri')} disabled={busy}>
          <Icon name="back" size="lg" />
        </button>
        <h1 className={styles.title}>{t('CETVEL SIFIRLAMA — GÖNYE ALMA')}</h1>
      </div>

      <div className={styles.body}>
        <div className={styles.warnBar}>
          <Icon name="warning" size="lg" className={styles.warnIcon} />
          <span>
            {t('GÖNYE TÜM PİSTONLARI HAREKET ETTİRİR VE MAKİNENİN POZİSYON REFERANSINI YENİDEN BELİRLER.')}
            &nbsp;{t('BAŞLATMADAN ÖNCE MAKİNEDE PARÇA OLMADIĞINDAN VE ÇEVRENİN GÜVENLİ OLDUĞUNDAN EMİN OLUN.')}
          </span>
        </div>

        <div className={`${styles.card} ${styles.stateCard}`}>
          <div className={styles.sectionTitleRow}>
            <span className={styles.sectionTitle}>{t('MEVCUT DURUM')}</span>
          </div>
          <div className={styles.stateRow}>
            <span className={styles.stateLabel}>{t('GÖNYE')}</span>
            <span className={physical.isGonyeCompleted ? styles.stateOk : styles.stateNo}>
              {physical.isGonyeCompleted ? t('YAPILDI') : t('YAPILMADI')}
            </span>
          </div>
          <div className={styles.stateRow}>
            <span className={styles.stateLabel}>{t('STAGE')}</span>
            <span className={styles.stateValue}>
              {physical.currentStageName ?? (physical.currentStage > 0 ? `STAGE ${physical.currentStage}` : '—')}
            </span>
          </div>
          <div className={styles.stateRow}>
            <span className={styles.stateLabel}>{t('CETVELLER')}</span>
            <span className={rulers.valid ? styles.stateOk : styles.stateNo}>
              {rulers.valid == null ? '—' : rulers.valid ? t('GEÇERLİ') : t('GEÇERSİZ')}
            </span>
          </div>
          {rulers.valid === false && rulers.reason && <div className={styles.stateNote}>{tp(rulers.reason)}</div>}
          <div className={styles.stateRow}>
            <span className={styles.stateLabel}>{t('SON KONUM KAYDI')}</span>
            <span className={rulers.lastKnown?.usable ? styles.stateValue : styles.stateNo}>
              {rulers.lastKnown
                ? rulers.lastKnown.usable
                  ? t('{d} GÜN ÖNCE', { d: rulers.lastKnown.ageDays.toFixed(1) })
                  : tp(rulers.lastKnown.unusableReason ?? '') || t('KULLANILAMAZ')
                : t('YOK')}
            </span>
          </div>
          <div className={styles.stateRow}>
            <span className={styles.stateLabel}>{t('HİDROLİK MOTOR')}</span>
            <span className={motorReady ? styles.stateOk : styles.stateNo}>
              {motorReady ? t('HAZIR') : motorState === 1 ? t('BAŞLIYOR') : t('KAPALI')}
            </span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionTitleRow}>
            <span className={styles.sectionTitle}>{t('STAGE SEÇİMİ')}</span>
            <span className={styles.stageHint}>
              {stageRunning != null
                ? t('STAGE {n} KONUMUNA GİDİLİYOR…', { n: stageRunning })
                : t(stageBlockedReason ?? 'DOKUNARAK SEÇİN')}
            </span>
          </div>
          <div className={styles.stageGrid}>
            {stages.map((st) => {
              const current = physical.isGonyeCompleted && physical.currentStage === st.stageNumber
              return (
                <button
                  key={st.stageNumber}
                  type="button"
                  className={styles.stageBtn}
                  data-current={current || undefined}
                  data-running={stageRunning === st.stageNumber || undefined}
                  disabled={busy || stageBlockedReason != null}
                  onClick={() => setStageConfirm(st)}
                >
                  <span className={styles.stageName}>{st.name.toUpperCase()}</span>
                  <span className={styles.stageOffsets}>
                    {t('SOL')} {st.leftOffsetMm.toFixed(2)} · {t('ALT')} {st.lowerOffsetMm.toFixed(2)} · {t('SAĞ')} {st.rightOffsetMm.toFixed(2)}
                  </span>
                  {current && <span className={styles.stageCurrent}><IconLabel icon="check">{t('AKTİF')}</IconLabel></span>}
                </button>
              )
            })}
          </div>
        </div>

        <div className={`${styles.card} ${styles.stepsCard}`}>
          <div className={styles.sectionTitleRow}>
            <span className={styles.sectionTitle}>{shownReport ? t('GÜVENLİ GÖNYE') : t('GÖNYE — İŞLEM ADIMLARI')}</span>
          </div>
          {shownReport ? (
            <SafeGonyeTable report={shownReport} running={running || rulers.liveRunning} />
          ) : (
            <ol className={styles.stepList}>
              {STEPS.map((s) => (
                <li key={s} className={styles.step}>{t(s)}</li>
              ))}
            </ol>
          )}
        </div>

        {/* Güvenli gönye raporu kendi sonuç metnini gösteriyorsa aynı mesaj ikinci kez yazılmaz (750 px'e sığsın) */}
        {status && !(shownReport?.message && !running) && (
          <div className={status.kind === 'ok' ? styles.statusOk : styles.statusError}>{status.text}</div>
        )}

        <div className={styles.actionRow}>
          <span className={styles.actionHint}>
            {running ? t('GÖNYE ALINIYOR — İŞLEM BİTENE KADAR BEKLEYİN…') : t(blockedReason ?? 'MAKİNE HAZIR.')}
          </span>
          {!running && lastReport?.overrideAvailable && (
            canOverride ? (
              <button
                type="button"
                className={styles.overrideBtn}
                onClick={() => setOverrideConfirm(true)}
                disabled={busy || blockedReason != null}
              >
                {t('KONTROL ETTİM, ENGEL YOK — YAVAŞ GÖNYE AL')}
              </button>
            ) : (
              <span className={styles.overrideHint}>{t('ENGEL UYARISINI YOK SAYMAK İÇİN ATÖLYE SORUMLUSU GİRİŞİ GEREKİR')}</span>
            )
          )}
          <button
            type="button"
            className={styles.resetBtn}
            onClick={() => setConfirming(true)}
            disabled={busy || blockedReason != null}
          >
            {running ? t('GÖNYE ALINIYOR…') : <IconLabel icon="reference" size="md">{t('GÖNYE AL')}</IconLabel>}
          </button>
        </div>
      </div>

      {confirming && (
        <ConfirmModal
          message="TÜM PİSTONLAR HAREKET EDECEK VE CETVELLER SIFIRLANACAK. GÖNYE ALINSIN MI"
          variant="danger"
          confirmLabel="GÖNYE AL"
          cancelLabel="VAZGEÇ"
          onCancel={() => setConfirming(false)}
          onConfirm={startGonye}
        />
      )}

      {needConfirm != null && (
        <SafeGonyeConfirmModal
          reason={needConfirm}
          userName={displayName}
          onCancel={() => setNeedConfirm(null)}
          onConfirm={() => void runGonye({ confirmNoObstacle: true })}
        />
      )}

      {overrideConfirm && (
        <ConfirmModal
          message="TOPLARIN ARKASINI KONTROL ETTİNİZ VE ENGEL YOK. ENGEL UYARISI YOK SAYILARAK TOPLAR GÜVENLİ HIZDA MEKANİK SONA ÇEKİLECEK VE CETVELLER ORADA SIFIRLANACAK. DEVAM EDİLSİN Mİ"
          variant="danger"
          confirmLabel="YAVAŞ GÖNYE AL"
          cancelLabel="VAZGEÇ"
          onCancel={() => setOverrideConfirm(false)}
          onConfirm={() => void runGonye({ ignoreExpected: true })}
        />
      )}

      {stageConfirm && (
        <ConfirmModal
          message={t('SOL, ALT VE SAĞ PİSTONLAR {name} KONUMUNA GİDECEK. DEVAM EDİLSİN Mİ', { name: stageConfirm.name.toUpperCase() })}
          variant="danger"
          confirmLabel={t("{name}'E GEÇ", { name: stageConfirm.name.toUpperCase() })}
          cancelLabel="VAZGEÇ"
          onCancel={() => setStageConfirm(null)}
          onConfirm={() => runStage(stageConfirm)}
        />
      )}
    </div>
  )
}
