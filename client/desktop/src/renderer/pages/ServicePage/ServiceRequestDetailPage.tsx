// SEKIL-51-TO + SEKIL-52/53 — Servis talebi/raporu detayı + tamamlama onay kodu girişi.
// URL: /service/requests/:id   (?mode=report rapor modunda)
//
// Akış:
//   1) İlk render — talep veya rapor okunur, alt başlık ve detay gösterilir
//   2) Rapor modunda + Completed durumunda → "ONAY KODUNU GİRİNİZ" alanı aktiflenir
//   3) Operatör kodu girer → confirm endpoint → IsConfirmed=true → yeşil onay

import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import {
  ServiceRequestStatus,
} from '@shared/types'

import { useServiceRequest } from '@/hooks/useService'

import ServicePageShell from './ServicePageShell'
import styles from './ServiceRequestDetailPage.module.css'

export default function ServiceRequestDetailPage() {
  const navigate = useNavigate()
  const { id: idStr } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const id = Number(idStr)
  const isReportMode = searchParams.get('mode') === 'report'

  const { request, loading, refresh } = useServiceRequest(Number.isFinite(id) ? id : null)

  const [confirmInput, setConfirmInput] = useState('')
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [confirmSuccess, setConfirmSuccess] = useState(false)
  const [working, setWorking] = useState(false)

  // Operatör onay kodunu girdiğinde tetiklenir
  async function handleConfirm() {
    if (!request) return
    setWorking(true)
    setConfirmError(null)
    try {
      const res = await window.corventa.service.confirmRequest(request.id, confirmInput)
      if (res.success) {
        setConfirmSuccess(true)
        await refresh()
      }
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : String(err))
    } finally {
      setWorking(false)
    }
  }

  // Servisi tamamlandı olarak işaretle (teknisyen tarafı için butonu burada da bırakıyoruz)
  async function handleComplete() {
    if (!request) return
    setWorking(true)
    try {
      await window.corventa.service.completeRequest(request.id)
      await refresh()
    } finally {
      setWorking(false)
    }
  }

  if (loading || !request) {
    return (
      <ServicePageShell title="SERVİS DETAYI" onBack={() => navigate('/service/requests')}>
        <div className={styles.loading}>Yükleniyor...</div>
      </ServicePageShell>
    )
  }

  const showConfirmBox =
    isReportMode &&
    request.status === ServiceRequestStatus.Completed &&
    !request.isConfirmed

  return (
    <ServicePageShell
      title={isReportMode ? 'SERVİS RAPORU' : 'SERVİS TALEBİ'}
      subtitle={request.reportCode ?? request.code}
      onBack={() => navigate('/service/requests')}
    >
      <div className={styles.root}>
        {/* Üst — onay kodu giriş (rapor + tamamlanmış + onaysız) */}
        {showConfirmBox && (
          <div className={styles.confirmBox}>
            <div className={styles.confirmLabel}>
              {confirmSuccess ? (
                <span className={styles.confirmSuccessLabel}>SERVİS ONAYI ALINDI</span>
              ) : (
                'ONAY KODUNU GİRİNİZ'
              )}
            </div>
            <div className={styles.confirmInputRow}>
              <span className={styles.confirmHint}>
                {confirmSuccess ? 'OK' : 'RE'}.{request.reportCode?.replace('SR.', '') ?? '------'}
              </span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="_ _ _ _ _ _"
                className={[styles.confirmInput, confirmSuccess ? styles.confirmInputOk : '']
                  .filter(Boolean)
                  .join(' ')}
                disabled={confirmSuccess}
              />
              {!confirmSuccess && (
                <button
                  className={styles.confirmBtn}
                  disabled={working || confirmInput.length !== 6}
                  onClick={handleConfirm}
                >
                  DOĞRULA
                </button>
              )}
            </div>
            {confirmError && <div className={styles.errorBox}>{confirmError}</div>}
          </div>
        )}

        {/* Müşteri / makina meta */}
        <div className={styles.metaBox}>
          <Row label="MÜŞTERİ" value={`${request.customerName} – ${request.customerAddress}`} />
          <Row label="MAKİNA MODELİ" value={`${request.machineModel} – ${request.machineProductionYear}`} />
          <Row label="MAKİNA KODU" value={`${request.machineCode} / ${request.machineVeAiCode}`} />
          <Row label="TEKNİSYEN" value={request.technicianName || '(atanmamış)'} />
          <Row label="AMAÇ" value={purposeLabel(request.purpose)} />
          <Row label="DURUM" value={statusLabel(request.status)} />
          {request.rating !== null && (
            <Row label="DEĞERLENDİRME" value={`${request.rating}/10`} />
          )}
        </div>

        {/* Detay metni */}
        <div className={styles.detailBox}>
          <div className={styles.detailHeader}>PROBLEM TANIMI / TEKNİK YANIT</div>
          <div className={styles.detailBody}>
            {request.problemDescription ?? '(Detay yok)'}
          </div>
        </div>

        {/* Teknisyen aksiyonu (sadece InProgress → Completed) */}
        {request.status === ServiceRequestStatus.InProgress && !isReportMode && (
          <button className={styles.completeBtn} onClick={handleComplete} disabled={working}>
            SERVİSİ TAMAMLA → RAPOR ÜRET
          </button>
        )}
      </div>
    </ServicePageShell>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowSep}>:</span>
      <span className={styles.rowValue}>{value}</span>
    </div>
  )
}

function purposeLabel(p: number): string {
  return ['ARIZA GİDERME', 'GENEL BAKIM', 'AĞIR BAKIM', 'KURULUM', 'EĞİTİM'][p] ?? '?'
}

function statusLabel(s: ServiceRequestStatus): string {
  switch (s) {
    case ServiceRequestStatus.Planned:
      return 'PLANLANDI'
    case ServiceRequestStatus.Sent:
      return 'GÖNDERİLDİ'
    case ServiceRequestStatus.InProgress:
      return 'DEVAM EDİYOR'
    case ServiceRequestStatus.Completed:
      return 'TAMAMLANDI'
    case ServiceRequestStatus.Cancelled:
      return 'İPTAL'
  }
}
