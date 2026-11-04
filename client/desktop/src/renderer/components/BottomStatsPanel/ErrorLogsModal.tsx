// 2026-09-22: Alt panel şeridinden açılan Hata Kayıtları modalı.
//   Kompakt liste görünümü (son N kayıt). Detay/filtre için Settings → Hata Raporları
//   sayfasına yönlendiren buton var.
// 2026-11-01: mock veri kaldırıldı — kaynak Hata Raporları sayfasıyla aynı: DataApi
//   GET /api/error-snapshots (window.corventa.service.listErrorSnapshots), en yeni 30 kayıt.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { translateProgress, useLang, useT } from '@/i18n'
import { Icon, IconLabel } from '@/components/Icon'
import type { ErrorSnapshotSummary } from '@shared'
import styles from './ErrorLogsModal.module.css'

const LIMIT = 30

const TRIGGER_LABELS: Record<string, string> = {
  JobFailed: 'İŞ BAŞARISIZ',
  EmergencyStop: 'ACİL STOP (YAZILIM)',
  PhysicalEmergencyStop: 'ACİL STOP (FİZİKSEL)',
  SafetyAlarm: 'GÜVENLİK ALARMI',
  SafetyWarning: 'GÜVENLİK UYARISI',
  EncoderStall: 'ENCODER DURMASI',
}

/** Yerel saat — "2026-11-01 14:05" */
function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

interface Props {
  onClose: () => void
}

export default function ErrorLogsModal({ onClose }: Props) {
  const navigate = useNavigate()
  const t = useT()
  const lang = useLang()
  const [rows, setRows] = useState<ErrorSnapshotSummary[] | null>(null)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)

  //   ESC ile kapat
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let alive = true
    window.corventa.service
      .listErrorSnapshots({ page: 1, pageSize: LIMIT })
      .then((res) => {
        if (!alive) return
        setRows(res.items)
        setTotal(res.total)
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : String(e))
      })
    return () => { alive = false }
  }, [])

  const errorCount = rows?.filter((r) => r.severity === 'error').length ?? 0
  const warningCount = rows?.filter((r) => r.severity !== 'error').length ?? 0

  function handleOpenFullPage() {
    onClose()
    navigate('/settings/error-reports')
  }

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={t('Hata Kayıtları')}
      onClick={(e) => {
        //   Overlay'e tıklanınca kapat (içerik dışında)
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{t('HATA KAYITLARI')}</h2>
            <div className={styles.subtitle}>
              {rows == null
                ? t('Yükleniyor...')
                : t('Son {n} kayıt gösteriliyor', { n: rows.length }) + (total > rows.length ? ` / ${total}` : '')}
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label={t('Kapat')}
          >
            <Icon name="close" size="sm" />
          </button>
        </div>

        {/* Özet chip'ler */}
        <div className={styles.counters}>
          <span className={`${styles.chip} ${styles.chipError}`}>{t('HATA')} {errorCount}</span>
          <span className={`${styles.chip} ${styles.chipWarning}`}>{t('UYARI')} {warningCount}</span>
        </div>

        {/* Liste */}
        <div className={styles.listWrap}>
          {error ? (
            <div className={styles.empty}>{t('Kayıtlar okunamadı')}: {error}</div>
          ) : rows == null ? (
            <div className={styles.empty}>{t('Yükleniyor...')}</div>
          ) : rows.length === 0 ? (
            <div className={styles.empty}>{t('Kayıt yok')}</div>
          ) : (
            <ul className={styles.list}>
              {rows.map((row) => {
                const sev = row.severity === 'error' ? 'ERROR' : 'WARNING'
                return (
                  <li key={row.id} className={styles.row}>
                    <span className={`${styles.sev} ${styles['sev' + sev]}`}>
                      {t(sev === 'ERROR' ? 'HATA' : 'UYARI')}
                    </span>
                    <div className={styles.rowBody}>
                      <div className={styles.rowLine1}>
                        <span className={styles.category}>
                          {t(TRIGGER_LABELS[row.triggerType] ?? row.triggerType)}
                          {row.bendingJobId != null ? ` · #${row.bendingJobId}` : ''}
                        </span>
                        <span className={styles.timestamp}>{fmtDateTime(row.capturedAt)}</span>
                      </div>
                      <div className={styles.message}>
                        {row.reason.split(' | ').map((p) => translateProgress(p, lang)).join(' | ') || '—'}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={handleOpenFullPage}
          >
            <IconLabel icon="next" trailing>{t('TÜM RAPORLAR')}</IconLabel>
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={onClose}
          >
            {t('KAPAT')}
          </button>
        </div>
      </div>
    </div>
  )
}
