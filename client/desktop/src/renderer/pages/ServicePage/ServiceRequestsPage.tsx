// SEKIL-51 — Servis Talepleri + Servis Raporları (iki sütun).
// Sol: müşteri talep listesi. Sağ: tamamlanan servisin raporları.
// Bottom: YENİ TALEP OLUŞTUR | TALEPLERİ GÖRÜNTÜLE | RAPOR GÖRÜNTÜLE | SERVİSİ DEĞERLENDİR

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  ServiceRequestStatus,
  type ServiceRequest,
} from '@shared/types'

import { useServiceRequests } from '@/hooks/useService'
import { useT } from '@/i18n'
import { useCloudConfig } from '@/stores/cloudConfigStore'

import CategoryBadge from './CategoryBadge'
import ServiceRequestRating from './ServiceRequestRating'
import ServicePageShell from './ServicePageShell'
import styles from './ServiceRequestsPage.module.css'

export default function ServiceRequestsPage() {
  const navigate = useNavigate()
  const t = useT()
  const { requests, reports, loading, refresh } = useServiceRequests()
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null)
  const [selectedReport, setSelectedReport] = useState<ServiceRequest | null>(null)
  const [showRating, setShowRating] = useState(false)
  // Bulut v2 (BULUT_API_V2.md §1 madde 42): talebin bulut durumu + atanan teknisyen (localId = talep id)
  const cloudStates = useCloudConfig()?.serviceRequests ?? []
  const cloudOf = (id: number) => cloudStates.find((c) => c.localId === String(id)) ?? null
  const selectedCloud = selectedRequest ? cloudOf(selectedRequest.id) : null

  // Eğer rating panel açıksa onu göster
  if (showRating && selectedReport) {
    return (
      <ServicePageShell
        title="SERVİSİ DEĞERLENDİR"
        onBack={() => setShowRating(false)}
      >
        <ServiceRequestRating
          request={selectedReport}
          onSaved={async () => {
            setShowRating(false)
            await refresh()
          }}
        />
      </ServicePageShell>
    )
  }

  return (
    <ServicePageShell title="SERVİS TALEPLERİ & RAPORLARI" onBack={() => navigate('/service')}>
      <div className={styles.columns}>
        {/* ── SOL: Servis Talepleri ───────────── */}
        <section className={styles.column}>
          <div className={styles.colHeader}>
            <span className={styles.colTitle}>{t('SERVİS TALEPLERİ')}</span>
          </div>
          <div className={styles.list}>
            {loading && <div className={styles.empty}>{t('Yükleniyor...')}</div>}
            {!loading && requests.length === 0 && (
              <div className={styles.empty}>{t('Henüz talep yok')}</div>
            )}
            {requests.map((r) => {
              const cloud = cloudOf(r.id)
              return (
              <button
                key={r.id}
                className={[
                  styles.row,
                  selectedRequest?.id === r.id ? styles.rowSelected : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setSelectedRequest(r)}
              >
                <span className={styles.rowCode}>{r.code}</span>
                <span className={styles.rowSep}>-</span>
                <span className={styles.rowLabel}>{t(purposeLabel(r.purpose))}</span>
                <span className={styles.rowStatus}>
                  {cloud?.status || cloud?.assignedTo ? (
                    <span className={styles.cloudStatus}>
                      <span>{t(cloudStatusLabel(cloud.status) ?? requestStatusLabel(r.status))}</span>
                      {cloud.assignedTo && <span className={styles.assignee}>{cloud.assignedTo}</span>}
                    </span>
                  ) : t(requestStatusLabel(r.status))}
                </span>
              </button>
              )
            })}
          </div>
        </section>

        {/* ── Orta — Badge ─────────────────────── */}
        <div className={styles.middleBadge}>
          <CategoryBadge label="TALEPLER" letter="T" compact />
        </div>

        {/* ── SAĞ: Servis Raporları ───────────── */}
        <section className={styles.column}>
          <div className={styles.colHeader}>
            <span className={styles.colTitle}>{t('SERVİS RAPORLARI')}</span>
          </div>
          <div className={styles.list}>
            {!loading && reports.length === 0 && (
              <div className={styles.empty}>{t('Henüz rapor yok')}</div>
            )}
            {reports.map((r) => (
              <button
                key={r.id}
                className={[
                  styles.row,
                  selectedReport?.id === r.id ? styles.rowSelected : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setSelectedReport(r)}
              >
                <span className={styles.rowCode}>{r.reportCode ?? r.code}</span>
                <span className={styles.rowSep}>-</span>
                <span className={styles.rowLabel}>{t(purposeLabel(r.purpose))}</span>
                {r.rating !== null && (
                  <span className={styles.rowRating}>{r.rating}/10</span>
                )}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Seçili öğenin alt önizleme bloğu — SEKIL-51-TO/TG'deki gibi alt önizleme */}
      {selectedRequest && (
        <div className={styles.previewBox}>
          <div className={`${styles.previewHeader} ${selectedCloud ? styles.previewHeaderCloud : ''}`}>
            <span>{selectedRequest.code} - {t(purposeLabel(selectedRequest.purpose))}</span>
            {/* Bulut durumu + atanan teknisyen — başlık satırında (önizleme yüksekliği değişmesin) */}
            {selectedCloud && (
              <span className={styles.cloudLine} title={selectedCloud.note ?? undefined}>
                <strong>{t('BULUT')}:</strong>{' '}
                {t(cloudStatusLabel(selectedCloud.status) ?? requestStatusLabel(selectedRequest.status))}
                {selectedCloud.assignedTo && (
                  <> · {t('ATANAN')}: <strong>{selectedCloud.assignedTo}</strong>{selectedCloud.assignedOrg ? ` (${selectedCloud.assignedOrg})` : ''}</>
                )}
                {selectedCloud.note && <> · {selectedCloud.note}</>}
              </span>
            )}
          </div>
          <div className={styles.previewBody}>
            {selectedRequest.problemDescription ?? t('(Açıklama yok)')}
          </div>
        </div>
      )}

      {/* Alt aksiyon barı */}
      <div className={styles.actionBar}>
        <button
          className={styles.actionBtn}
          onClick={() => navigate('/service/requests/new')}
        >
          {t('YENİ TALEP OLUŞTUR')}
        </button>
        <button
          className={styles.actionBtn}
          onClick={() => selectedRequest && navigate(`/service/requests/${selectedRequest.id}`)}
          disabled={!selectedRequest}
        >
          {t('TALEPLERİ GÖRÜNTÜLE')}
        </button>
        <button
          className={styles.actionBtn}
          onClick={() => selectedReport && navigate(`/service/requests/${selectedReport.id}?mode=report`)}
          disabled={!selectedReport}
        >
          {t('RAPOR GÖRÜNTÜLE')}
        </button>
        <button
          className={styles.actionBtn}
          onClick={() => selectedReport && setShowRating(true)}
          disabled={!selectedReport || selectedReport.status !== ServiceRequestStatus.Completed}
        >
          {t('SERVİSİ DEĞERLENDİR')}
        </button>
      </div>
    </ServicePageShell>
  )
}

function purposeLabel(p: number): string {
  return ['ARIZA GİDERME', 'GENEL BAKIM', 'AĞIR BAKIM', 'KURULUM', 'EĞİTİM'][p] ?? '?'
}

/** Bulut talep durumu → etiket (bilinmeyen kod olduğu gibi; boş → null = yerel durum) */
function cloudStatusLabel(s: string | null | undefined): string | null {
  if (!s) return null
  switch (s.toUpperCase()) {
    case 'OPEN':
    case 'NEW':
      return 'AÇIK'
    case 'ASSIGNED':
      return 'ATANDI'
    case 'IN_PROGRESS':
      return 'DEVAM EDİYOR'
    case 'DONE':
    case 'RESOLVED':
    case 'COMPLETED':
    case 'CLOSED':
      return 'TAMAMLANDI'
    case 'CANCELLED':
      return 'İPTAL'
    default:
      return s
  }
}

function requestStatusLabel(s: ServiceRequestStatus): string {
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
