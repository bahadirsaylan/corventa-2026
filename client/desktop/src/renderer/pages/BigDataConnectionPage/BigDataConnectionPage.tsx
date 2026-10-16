// Ayarlar > Big Data Bağlantı Ayarları — cloud endpoint + API key + connection status.
// Şu an mock — DataApi/Big Data entegrasyonu Faz-7'de. Layout mekanikçi review'u için.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang, useT, type TVars } from '@/i18n'
import styles from './BigDataConnectionPage.module.css'

type ConnStatus = 'connected' | 'disconnected' | 'error' | 'testing'

export default function BigDataConnectionPage() {
  const navigate = useNavigate()
  const t = useT()
  const locale = useLang() === 'en' ? 'en-GB' : 'tr-TR'

  // Mock defaults — gerçek değerler DataApi'den gelecek.
  const [endpoint, setEndpoint] = useState('https://cloud.corventa.com/ingest')
  const [apiKey, setApiKey] = useState('••••••••••••••••••••••••••••••••')
  const [showKey, setShowKey] = useState(false)
  const [pushIntervalSec, setPushIntervalSec] = useState(60)
  const [enabled, setEnabled] = useState(true)
  const [status, setStatus] = useState<ConnStatus>('connected')
  const [lastSync, setLastSync] = useState<string>('2026-08-14 14:32')

  function handleTestConnection() {
    setStatus('testing')
    setTimeout(() => {
      setStatus('connected')
      setLastSync(new Date().toLocaleString(locale, { hour12: false }))
    }, 1200)
  }

  function handleSave() {
    alert(t('Kaydedildi (mock) — Big Data ayarları gelecekte DataApi.settings.updateBigData ile yazılacak.'))
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label={t('Geri')}>←</button>
        <h1 className={styles.title}>{t('BİG DATA BAĞLANTI AYARLARI')}</h1>
      </div>

      <div className={styles.body}>
        {/* ── Bağlantı Durumu ─────────────────────── */}
        <div className={styles.card}>
          <div className={styles.sectionTitle}>{t('BAĞLANTI DURUMU')}</div>
          <div className={styles.statusRow}>
            <div className={`${styles.statusDot} ${styles[status]}`} />
            <div className={styles.statusText}>
              <span className={styles.statusLabel}>{t('DURUM')}</span>
              <span className={styles.statusValue}>{statusText(status, t)}</span>
            </div>
            <div className={styles.statusText}>
              <span className={styles.statusLabel}>{t('SON SENKRON')}</span>
              <span className={styles.statusValue}>{lastSync}</span>
            </div>
            <button
              type="button"
              className={styles.testBtn}
              onClick={handleTestConnection}
              disabled={status === 'testing'}
            >
              {status === 'testing' ? t('TEST EDİLİYOR...') : t('BAĞLANTIYI TEST ET')}
            </button>
          </div>
        </div>

        {/* ── Endpoint + API Key ──────────────────── */}
        <div className={styles.card}>
          <div className={styles.sectionTitle}>{t('SUNUCU BİLGİLERİ')}</div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>CLOUD ENDPOINT URL</span>
            <input
              type="text"
              className={styles.input}
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://cloud.corventa.com/ingest"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t('API ANAHTARI')}</span>
            <div className={styles.inputWithBtn}>
              <input
                type={showKey ? 'text' : 'password'}
                className={styles.input}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="API key"
              />
              <button type="button" className={styles.showHideBtn} onClick={() => setShowKey((v) => !v)}>
                {showKey ? t('GİZLE') : t('GÖSTER')}
              </button>
            </div>
          </label>
        </div>

        {/* ── Veri gönderim aralığı + aktif toggle ── */}
        <div className={styles.card}>
          <div className={styles.sectionTitle}>{t('GÖNDERİM AYARLARI')}</div>

          <div className={styles.rowSpaced}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>{t('VERİ GÖNDERİM ARALIĞI')}</span>
              <div className={styles.numInputRow}>
                <input
                  type="number"
                  min={5}
                  max={3600}
                  className={styles.numInput}
                  value={pushIntervalSec}
                  onChange={(e) => setPushIntervalSec(Number(e.target.value))}
                />
                <span className={styles.unit}>{t('saniye')}</span>
              </div>
            </div>

            <label className={styles.toggleField}>
              <span className={styles.fieldLabel}>{t('CLOUD SENKRON')}</span>
              <button
                type="button"
                className={`${styles.toggle} ${enabled ? styles.toggleOn : ''}`}
                onClick={() => setEnabled((v) => !v)}
                aria-pressed={enabled}
              >
                <span className={styles.toggleKnob} />
                <span className={styles.toggleText}>{enabled ? t('AÇIK') : t('KAPALI')}</span>
              </button>
            </label>
          </div>
        </div>

        <div className={styles.footerRow}>
          <button type="button" className={styles.saveBtn} onClick={handleSave}>{t('KAYDET')}</button>
          <p className={styles.note}>
            {t('Değişiklikler kaydedildikten sonra Cloud senkron servisi otomatik yeniden başlar. Ağ kapalıyken makine çalışmaya devam eder; veriler yerelde biriktirilir.')}
          </p>
        </div>
      </div>
    </div>
  )
}

function statusText(s: ConnStatus, t: (source: string, vars?: TVars) => string): string {
  switch (s) {
    case 'connected': return t('BAĞLI')
    case 'disconnected': return t('BAĞLI DEĞİL')
    case 'error': return t('HATA')
    case 'testing': return t('TEST EDİLİYOR')
  }
}
