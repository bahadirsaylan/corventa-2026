// Ayarlar > Sertifika Sorgula — sertifika no input + doğrulama sonuç kartı.
// Backend: DataApi GET /api/certificates/{code} (main → DataApiClient → ipc → preload; demo'da DemoMachine).
// null = bulunamadı (404), isExpired = süresi dolmuş, reject = bağlantı / sunucu hatası.

import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { normalizeCertificateCode, type Certificate } from '@shared/types'
import { useLang, useT } from '@/i18n'
import { Icon, IconLabel } from '@/components/Icon'
import { cloudSourceLabel } from '@/stores/cloudConfigStore'
import styles from './CertificateQueryPage.module.css'

type Status = 'idle' | 'searching' | 'found' | 'notfound' | 'expired' | 'error'

export default function CertificateQueryPage() {
  const navigate = useNavigate()
  const t = useT()
  const locale = useLang() === 'en' ? 'en-GB' : 'tr-TR'
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<Certificate | null>(null)
  // Sorgulanan (normalize) kod — sonuç kartında gösterilir; input sonradan değişse de sabit kalır
  const [queriedCode, setQueriedCode] = useState('')
  const [errorDetail, setErrorDetail] = useState('')
  // Geç gelen eski cevap yeni sorgunun sonucunu ezmesin
  const requestSeq = useRef(0)

  async function handleSearch() {
    const normalized = normalizeCertificateCode(code)
    if (!normalized || status === 'searching') return
    const seq = ++requestSeq.current
    setCode(normalized)
    setQueriedCode(normalized)
    setStatus('searching')
    setResult(null)
    setErrorDetail('')

    try {
      const found = await window.corventa.settings.getCertificate(normalized)
      if (seq !== requestSeq.current) return
      if (!found) {
        setStatus('notfound')
      } else {
        setResult(found)
        setStatus(found.isExpired ? 'expired' : 'found')
      }
    } catch (err) {
      if (seq !== requestSeq.current) return
      // Electron IPC hatayı "Error invoking remote method '...': HttpError: ..." diye sarar → ön eki at
      const raw = err instanceof Error ? err.message : String(err)
      setErrorDetail(raw.replace(/^Error invoking remote method '[^']*':\s*/, ''))
      setStatus('error')
    }
  }

  function reset() {
    requestSeq.current++
    setCode('')
    setQueriedCode('')
    setStatus('idle')
    setResult(null)
    setErrorDetail('')
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label={t('Geri')}><Icon name="back" size="lg" /></button>
        <h1 className={styles.title}>{t('SERTİFİKA SORGULA')}</h1>
      </div>

      <div className={styles.body}>
        {/* Search card */}
        <div className={styles.searchCard}>
          <div className={styles.sectionTitle}>{t('SERTİFİKA NUMARASI GİRİN')}</div>
          <div className={styles.searchRow}>
            <input
              type="text"
              className={styles.codeInput}
              placeholder="CRV-YYYY-NNN"
              maxLength={64}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleSearch() }}
            />
            <button
              className={styles.searchBtn}
              onClick={() => void handleSearch()}
              disabled={!code.trim() || status === 'searching'}
            >
              {status === 'searching' ? t('SORGULANIYOR...') : <IconLabel icon="search">{t('SORGULA')}</IconLabel>}
            </button>
            <button className={styles.clearBtn} onClick={reset} disabled={status === 'idle' && !code}>
              {t('TEMİZLE')}
            </button>
          </div>
          <p className={styles.hint}>{t('Sertifika numarasında büyük / küçük harf fark etmez.')}</p>
        </div>

        {/* Result */}
        {status === 'notfound' && (
          <div className={`${styles.resultCard} ${styles.resultNotFound}`}>
            <div className={styles.resultIcon}><Icon name="failure" size="xl" /></div>
            <div className={styles.resultBody}>
              <h2 className={styles.resultTitle}>{t('SERTİFİKA BULUNAMADI')}</h2>
              <p className={styles.resultText}>
                <strong>{queriedCode}</strong> {t('numaralı bir sertifika kayıtlı değildir.')}
                {' '}{t('Lütfen numarayı kontrol edip tekrar deneyin.')}
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className={`${styles.resultCard} ${styles.resultError}`}>
            <div className={styles.resultIcon}><Icon name="error" size="xl" /></div>
            <div className={styles.resultBody}>
              <h2 className={styles.resultTitle}>{t('SORGULAMA YAPILAMADI')}</h2>
              <p className={styles.resultText}>
                {t('Sertifika veritabanına ulaşılamadı. Bağlantıyı kontrol edip tekrar deneyin.')}
              </p>
              {errorDetail && <div className={styles.errorDetail}>{errorDetail}</div>}
            </div>
          </div>
        )}

        {result && (status === 'found' || status === 'expired') && (
          <div className={`${styles.resultCard} ${status === 'expired' ? styles.resultExpired : styles.resultFound}`}>
            <div className={styles.resultIcon}><Icon name={status === 'expired' ? 'warning' : 'success'} size="xl" /></div>
            <div className={styles.resultBody}>
              <h2 className={styles.resultTitle}>
                {status === 'expired' ? t('SERTİFİKA SÜRESİ DOLMUŞ') : t('SERTİFİKA GEÇERLİ')}
                {/* Bulut v2: sorgu kaynağı (BULUT / ÖNBELLEK / YEREL) — eski DataApi göndermez */}
                {cloudSourceLabel(result.source) && (
                  <span className={styles.sourceTag}>{t('KAYNAK')}: {t(cloudSourceLabel(result.source)!)}</span>
                )}
              </h2>
              <div className={styles.resultGrid}>
                <ResultRow label={t('SERTİFİKA NO')}  value={result.code} mono />
                <ResultRow label={t('AD SOYAD')}      value={result.ownerName} />
                <ResultRow label={t('ŞİRKET')}        value={result.ownerCompany || '—'} />
                <ResultRow label={t('EĞİTİM')}        value={result.courseName} />
                <ResultRow label={t('VEREN KURUM')}   value={result.certifiedBy} />
                <ResultRow label={t('VERİLİŞ TARİHİ')} value={formatDate(result.issuedAt, locale)} />
                <ResultRow
                  label={t('GEÇERLİLİK SONU')}
                  value={result.validUntil ? formatDate(result.validUntil, locale) : t('SÜRESİZ')}
                  highlight={status === 'expired' ? 'red' : 'green'}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ResultRow({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: 'red' | 'green' }) {
  const cls = [
    styles.resultValue,
    mono ? styles.mono : '',
    highlight === 'red' ? styles.highlightRed : '',
    highlight === 'green' ? styles.highlightGreen : '',
  ].filter(Boolean).join(' ')
  return (
    <div className={styles.resultRow}>
      <span className={styles.resultLabel}>{label}</span>
      <span className={cls}>{value}</span>
    </div>
  )
}

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })
}
