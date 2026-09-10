// Ayarlar > Sertifika Sorgula — sertifika no input + doğrulama sonuç kartı.
// Backend: DataApi.certificate.verify (henüz yok, mock).

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './CertificateQueryPage.module.css'

type Status = 'idle' | 'searching' | 'found' | 'notfound' | 'expired'

interface CertificateResult {
  code: string
  ownerName: string
  ownerCompany: string
  issuedAt: string
  validUntil: string
  courseName: string
  certifiedBy: string
  isExpired: boolean
}

// Mock DB
const MOCK_DB: Record<string, CertificateResult> = {
  'CRV-2026-001': {
    code: 'CRV-2026-001',
    ownerName: 'Ahmet Yılmaz',
    ownerCompany: 'Sersovis A.Ş.',
    issuedAt: '2026-02-15',
    validUntil: '2028-02-15',
    courseName: 'Corventa Bending Machine — Temel Operatör Eğitimi',
    certifiedBy: 'Corventa Teknik Eğitim',
    isExpired: false,
  },
  'CRV-2025-042': {
    code: 'CRV-2025-042',
    ownerName: 'Mehmet Demir',
    ownerCompany: 'Sersovis A.Ş.',
    issuedAt: '2025-06-10',
    validUntil: '2027-06-10',
    courseName: 'İleri Seviye Bakım Eğitimi',
    certifiedBy: 'Corventa Teknik Eğitim',
    isExpired: false,
  },
  'CRV-2024-018': {
    code: 'CRV-2024-018',
    ownerName: 'Osman Şahin',
    ownerCompany: 'Sersovis A.Ş.',
    issuedAt: '2024-03-20',
    validUntil: '2026-03-20',
    courseName: 'Temel Operatör Eğitimi',
    certifiedBy: 'Corventa Teknik Eğitim',
    isExpired: true,
  },
}

export default function CertificateQueryPage() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<CertificateResult | null>(null)

  function handleSearch() {
    if (!code.trim()) return
    setStatus('searching')
    setResult(null)

    setTimeout(() => {
      const found = MOCK_DB[code.trim().toUpperCase()]
      if (!found) {
        setStatus('notfound')
      } else if (found.isExpired) {
        setStatus('expired')
        setResult(found)
      } else {
        setStatus('found')
        setResult(found)
      }
    }, 700)
  }

  function reset() {
    setCode('')
    setStatus('idle')
    setResult(null)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label="Geri">←</button>
        <h1 className={styles.title}>SERTİFİKA SORGULA</h1>
      </div>

      <div className={styles.body}>
        {/* Search card */}
        <div className={styles.searchCard}>
          <div className={styles.sectionTitle}>SERTİFİKA NUMARASI GİRİN</div>
          <div className={styles.searchRow}>
            <input
              type="text"
              className={styles.codeInput}
              placeholder="CRV-YYYY-NNN"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
            />
            <button
              className={styles.searchBtn}
              onClick={handleSearch}
              disabled={!code.trim() || status === 'searching'}
            >
              {status === 'searching' ? 'SORGULANIYOR...' : '🔍 SORGULA'}
            </button>
            <button className={styles.clearBtn} onClick={reset} disabled={status === 'idle' && !code}>
              TEMİZLE
            </button>
          </div>
          <p className={styles.hint}>Örnek: <strong>CRV-2026-001</strong>, CRV-2025-042, CRV-2024-018</p>
        </div>

        {/* Result */}
        {status === 'notfound' && (
          <div className={`${styles.resultCard} ${styles.resultNotFound}`}>
            <div className={styles.resultIcon}>✕</div>
            <div className={styles.resultBody}>
              <h2 className={styles.resultTitle}>SERTİFİKA BULUNAMADI</h2>
              <p className={styles.resultText}>
                <strong>{code}</strong> numaralı bir sertifika kayıtlı değildir.
                Lütfen numarayı kontrol edip tekrar deneyin.
              </p>
            </div>
          </div>
        )}

        {result && (status === 'found' || status === 'expired') && (
          <div className={`${styles.resultCard} ${status === 'expired' ? styles.resultExpired : styles.resultFound}`}>
            <div className={styles.resultIcon}>{status === 'expired' ? '⚠' : '✓'}</div>
            <div className={styles.resultBody}>
              <h2 className={styles.resultTitle}>
                {status === 'expired' ? 'SERTİFİKA SÜRESİ DOLMUŞ' : 'SERTİFİKA GEÇERLİ'}
              </h2>
              <div className={styles.resultGrid}>
                <ResultRow label="SERTİFİKA NO"  value={result.code} mono />
                <ResultRow label="AD SOYAD"      value={result.ownerName} />
                <ResultRow label="ŞİRKET"        value={result.ownerCompany} />
                <ResultRow label="EĞİTİM"        value={result.courseName} />
                <ResultRow label="VEREN KURUM"   value={result.certifiedBy} />
                <ResultRow label="VERİLİŞ TARİHİ" value={formatDate(result.issuedAt)} />
                <ResultRow label="GEÇERLİLİK SONU" value={formatDate(result.validUntil)} highlight={status === 'expired' ? 'red' : 'green'} />
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
}
