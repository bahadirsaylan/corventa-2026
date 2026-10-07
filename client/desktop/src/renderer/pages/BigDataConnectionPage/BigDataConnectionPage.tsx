// Ayarlar > Big Data Bağlantı Ayarları — cloud endpoint + API key + connection status.
// Şu an mock — DataApi/Big Data entegrasyonu Faz-7'de. Layout mekanikçi review'u için.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './BigDataConnectionPage.module.css'

type ConnStatus = 'connected' | 'disconnected' | 'error' | 'testing'

export default function BigDataConnectionPage() {
  const navigate = useNavigate()

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
      setLastSync(new Date().toLocaleString('tr-TR', { hour12: false }))
    }, 1200)
  }

  function handleSave() {
    alert('Kaydedildi (mock) — Big Data ayarları gelecekte DataApi.settings.updateBigData ile yazılacak.')
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label="Geri">←</button>
        <h1 className={styles.title}>BİG DATA BAĞLANTI AYARLARI</h1>
      </div>

      <div className={styles.body}>
        {/* ── Bağlantı Durumu ─────────────────────── */}
        <div className={styles.card}>
          <div className={styles.sectionTitle}>BAĞLANTI DURUMU</div>
          <div className={styles.statusRow}>
            <div className={`${styles.statusDot} ${styles[status]}`} />
            <div className={styles.statusText}>
              <span className={styles.statusLabel}>DURUM</span>
              <span className={styles.statusValue}>{statusText(status)}</span>
            </div>
            <div className={styles.statusText}>
              <span className={styles.statusLabel}>SON SENKRON</span>
              <span className={styles.statusValue}>{lastSync}</span>
            </div>
            <button
              type="button"
              className={styles.testBtn}
              onClick={handleTestConnection}
              disabled={status === 'testing'}
            >
              {status === 'testing' ? 'TEST EDİLİYOR...' : 'BAĞLANTIYI TEST ET'}
            </button>
          </div>
        </div>

        {/* ── Endpoint + API Key ──────────────────── */}
        <div className={styles.card}>
          <div className={styles.sectionTitle}>SUNUCU BİLGİLERİ</div>

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
            <span className={styles.fieldLabel}>API ANAHTARI</span>
            <div className={styles.inputWithBtn}>
              <input
                type={showKey ? 'text' : 'password'}
                className={styles.input}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="API key"
              />
              <button type="button" className={styles.showHideBtn} onClick={() => setShowKey((v) => !v)}>
                {showKey ? 'GİZLE' : 'GÖSTER'}
              </button>
            </div>
          </label>
        </div>

        {/* ── Veri gönderim aralığı + aktif toggle ── */}
        <div className={styles.card}>
          <div className={styles.sectionTitle}>GÖNDERİM AYARLARI</div>

          <div className={styles.rowSpaced}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>VERİ GÖNDERİM ARALIĞI</span>
              <div className={styles.numInputRow}>
                <input
                  type="number"
                  min={5}
                  max={3600}
                  className={styles.numInput}
                  value={pushIntervalSec}
                  onChange={(e) => setPushIntervalSec(Number(e.target.value))}
                />
                <span className={styles.unit}>saniye</span>
              </div>
            </div>

            <label className={styles.toggleField}>
              <span className={styles.fieldLabel}>CLOUD SENKRON</span>
              <button
                type="button"
                className={`${styles.toggle} ${enabled ? styles.toggleOn : ''}`}
                onClick={() => setEnabled((v) => !v)}
                aria-pressed={enabled}
              >
                <span className={styles.toggleKnob} />
                <span className={styles.toggleText}>{enabled ? 'AÇIK' : 'KAPALI'}</span>
              </button>
            </label>
          </div>
        </div>

        <div className={styles.footerRow}>
          <button type="button" className={styles.saveBtn} onClick={handleSave}>KAYDET</button>
          <p className={styles.note}>
            Değişiklikler kaydedildikten sonra Cloud senkron servisi otomatik yeniden başlar.
            Ağ kapalıyken makine çalışmaya devam eder; veriler yerelde biriktirilir.
          </p>
        </div>
      </div>
    </div>
  )
}

function statusText(s: ConnStatus): string {
  switch (s) {
    case 'connected': return 'BAĞLI'
    case 'disconnected': return 'BAĞLI DEĞİL'
    case 'error': return 'HATA'
    case 'testing': return 'TEST EDİLİYOR'
  }
}
