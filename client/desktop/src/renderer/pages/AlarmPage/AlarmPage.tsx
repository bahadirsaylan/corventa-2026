// Şekil 15 / 17 — büküm sırasında ACİL STOP (fiziksel buton, faz, motor termik) veya basınç düşüşü (parça
// bozuldu) ile iş KESİLDİ (BendingJobStatus.Interrupted). AppLayout iş Running'den Interrupted'a geçince açar.
//   MANUEL TAHLİYE → Şekil 16 çift el onayı → tahliye ekranı (iş Cancelled)
//   DEVAM ET       → büküm kaldığı yerden sürer (sıkıştırma / parça sıfırlama yok) — sadece dairesel bükümde,
//                    acil stop bırakılmış + hidrolik motor çalışıyorken. Koşullar backend resume-status'tan.
// Sadece ekran: kararlar backend'de (POST /api/bending-job/{id}/resume | abandon).

import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ConfirmModal from '@/components/ConfirmModal/ConfirmModal'
import { Icon, IconLabel } from '@/components/Icon'
import { translateProgress, useLang, useT } from '@/i18n'
import { useMachineStateStore } from '@/stores/machineStateStore'
import type { BendingJob, ResumeStatusResponse } from '@shared/types'
import styles from './AlarmPage.module.css'

const POLL_MS = 1000

/** Alarm koduna göre başlatma önerisi (Şekil 15/17) */
const SUGGESTIONS: Record<number, string> = {
  111: 'DURUMU GÖZLEMLEDİKTEN SONRA UYGUN BİR DEVAM YOLU SEÇİNİZ.',
  536: 'DURDURMAK İÇİN GÖZLEMLENEN ACİL DURUM ORTADAN KALKTIĞINDA YUKARIDAKİ SEÇENEKLERİ DEĞERLENDİREBİLİRSİNİZ.',
  537: 'MOTOR SOĞUYUP TERMİK KORUMA KALKTIĞINDA YUKARIDAKİ SEÇENEKLERİ DEĞERLENDİREBİLİRSİNİZ.',
  538: 'FAZ SIRASI DÜZELTİLDİKTEN SONRA YUKARIDAKİ SEÇENEKLERİ DEĞERLENDİREBİLİRSİNİZ.',
}

function readJobId(navState: unknown): number | null {
  const v = navState && typeof navState === 'object' ? (navState as Record<string, unknown>).jobId : undefined
  return typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null
}

export default function AlarmPage() {
  const navigate = useNavigate()
  const { state: navState } = useLocation()
  const jobId = readJobId(navState)
  const t = useT()
  const lang = useLang()
  const motorState = useMachineStateStore((s) => s.state.hydraulicMotorState)
  const estopOk = useMachineStateStore((s) => s.state.safety.emergencyStopOK)

  const [job, setJob] = useState<BendingJob | null>(null)
  const [status, setStatus] = useState<ResumeStatusResponse | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [motorBusy, setMotorBusy] = useState(false)

  useEffect(() => {
    if (jobId == null) return
    let alive = true
    window.corventa.bending.getJob(jobId).then((j: BendingJob) => alive && setJob(j)).catch(() => {})
    const poll = () => {
      window.corventa.bending
        .getResumeStatus(jobId)
        .then((s) => alive && setStatus(s))
        .catch(() => {})
    }
    poll()
    const timer = setInterval(poll, POLL_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [jobId])

  const code = job?.interruptAlertCode ?? status?.alertCode ?? null
  // Backend sebebi: kural varsa translateProgress, yoksa sabit metin sözlükten (en/alarm.ts)
  const message = job?.errorMessage ? t(translateProgress(job.errorMessage, lang)) : t('MAKİNE DURDURULDU')
  const suggestion = code != null ? SUGGESTIONS[code] : undefined
  const pending = status?.pendingChecks ?? []
  const canResume = status?.canResume === true
  const resumeReady = canResume && pending.length === 0

  async function startMotor() {
    if (motorBusy) return
    setMotorBusy(true)
    try {
      await window.corventa.machine.setHydraulicMotor(true)
    } catch {
      /* durum SignalR'dan izlenir */
    } finally {
      setMotorBusy(false)
    }
  }

  async function resume() {
    if (jobId == null) return
    setBusy(true)
    setError(null)
    try {
      const r = await window.corventa.bending.resumeJob(jobId)
      if (r?.success) {
        setConfirm(false)
        navigate('/dashboard')
        return
      }
      setError(r?.error ? t(r.error) : t('DEVAM EDİLEMEDİ'))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      setConfirm(false)
    }
  }

  function manualUnload() {
    navigate('/bending/alarm/manual-unload', {
      state: { jobId, jobMessage: job?.errorMessage ?? null },
    })
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
        <div className={styles.actions}>
          <button type="button" className={styles.actionBtn} onClick={manualUnload} disabled={jobId == null}>
            {t('MANUEL TAHLİYE')}
          </button>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.resumeBtn}`}
            disabled={!resumeReady || busy}
            onClick={() => setConfirm(true)}
          >
            {busy ? t('BEKLEYİN...') : t('DEVAM ET')}
          </button>
        </div>

        <div className={styles.alertBox}>
          <div className={styles.alertCode}>{code != null ? t('ALERT CODE {code}', { code }) : t('ALARM')}</div>
          <div className={styles.alertMsg}>{message}</div>
          {suggestion && (
            <>
              <div className={styles.suggestTitle}>{t('BAŞLATMA ÖNERİLERİ')}:</div>
              <div className={styles.suggest}>{t(suggestion)}</div>
            </>
          )}
        </div>

        {/* DEVAM ET durumu — neden kapalı / ne yapılmalı */}
        <div className={styles.statusRow}>
          {status == null ? (
            <span className={styles.statusInfo}>{t('Yükleniyor...')}</span>
          ) : !canResume ? (
            <span className={styles.statusBad}>
              <IconLabel icon="blocked">{t('DEVAM EDİLEMEZ')}: {translateProgress(status.reason ?? '', lang)} — {t('MANUEL TAHLİYE YAPIN')}</IconLabel>
            </span>
          ) : pending.length > 0 ? (
            <span className={styles.statusWarn}>
              <IconLabel icon="warning">{t('DEVAM ETMEK İÇİN')}: {pending.map((p) => t(p)).join(' · ')}</IconLabel>
            </span>
          ) : (
            <span className={styles.statusOk}>
              <IconLabel icon="check">
                {t('KALDIĞI YERDEN DEVAM EDİLEBİLİR — {n} PASO TAMAMLANMIŞTI', { n: status.completedPasos })}
              </IconLabel>
            </span>
          )}
          {estopOk && motorState !== 2 && (
            <button type="button" className={styles.motorBtn} disabled={motorBusy || motorState === 1} onClick={() => void startMotor()}>
              <Icon name="play" size="sm" /> {motorState === 1 ? t('BAŞLIYOR…') : t('HİDROLİK MOTORU ÇALIŞTIR')}
            </button>
          )}
        </div>

        {error && <div className={styles.error}>{error}</div>}
      </div>

      {confirm && (
        <ConfirmModal
          message="BÜKÜM KALDIĞI YERDEN DEVAM EDECEK. SIKIŞTIRMA VE SIFIRLAMA YAPILMAYACAK — PARÇA YERİNDE VE SIKILI OLMALI. DEVAM EDİLSİN Mİ?"
          confirmLabel="DEVAM ET"
          cancelLabel="VAZGEÇ"
          variant="primary"
          onCancel={() => setConfirm(false)}
          onConfirm={() => void resume()}
        />
      )}
    </div>
  )
}
