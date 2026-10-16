// Ayarlar > Müşteri Değişikliği — mevcut müşteri özet + yeni müşteri form + SMS onayı.
// Bu kritik bir işlem: sertifika/garanti sahipliği yeni müşteriye devredilir.
// Backend: DataApi.machineIdentity.changeCustomer (henüz yok, mock).

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang, useT } from '@/i18n'
import styles from './CustomerChangePage.module.css'

interface CustomerForm {
  companyName: string
  taxNo: string
  authorizedPerson: string
  phone: string
  email: string
  address: string
  city: string
}

const EMPTY_FORM: CustomerForm = {
  companyName: '', taxNo: '', authorizedPerson: '', phone: '', email: '', address: '', city: '',
}

// Mock mevcut müşteri — gerçek veri DataApi.machineIdentity'den
const CURRENT_CUSTOMER = {
  companyName: 'Sersovis A.Ş.',
  taxNo: '1234567890',
  authorizedPerson: 'Serkan Öztürk',
  phone: '+90 532 000 0000',
  email: 'info@sersovis.com',
  address: 'Organize Sanayi Bölgesi, 5. Cadde No:14',
  city: 'Bursa',
  since: '2025-11-04',
}

export default function CustomerChangePage() {
  const navigate = useNavigate()
  const t = useT()
  const locale = useLang() === 'en' ? 'en-GB' : 'tr-TR'
  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM)
  const [smsSent, setSmsSent] = useState(false)
  const [smsCode, setSmsCode] = useState('')

  const isFormValid = form.companyName && form.taxNo && form.authorizedPerson && form.phone

  function update(k: keyof CustomerForm, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  function sendSms() {
    if (!isFormValid) return
    setSmsSent(true)
    alert(t('Onay kodu mevcut yetkiliye SMS ile gönderildi (mock — +90 532 *** ****)'))
  }

  function submit() {
    if (smsCode.length !== 6) {
      alert(t('6 haneli SMS onay kodu girin'))
      return
    }
    alert(`${t('Müşteri değişikliği tamamlandı (mock):')}\n${CURRENT_CUSTOMER.companyName} → ${form.companyName}`)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label={t('Geri')}>←</button>
        <h1 className={styles.title}>{t('MÜŞTERİ DEĞİŞİKLİĞİ')}</h1>
      </div>

      <div className={styles.body}>
        <div className={styles.warnBar}>
          ⚠ {t('BU İŞLEM KRİTİKTİR — GARANTİ VE SERTİFİKA SAHİPLİĞİ YENİ MÜŞTERİYE DEVREDİLİR.')}
          &nbsp;{t('İŞLEM GERİ ALINAMAZ.')}
        </div>

        <div className={styles.twoCol}>
          {/* Mevcut müşteri */}
          <div className={`${styles.card} ${styles.currentCard}`}>
            <div className={styles.sectionTitle}>{t('MEVCUT MÜŞTERİ')}</div>
            <InfoRow label={t('ŞİRKET')}          value={CURRENT_CUSTOMER.companyName} />
            <InfoRow label={t('VERGİ NO')}        value={CURRENT_CUSTOMER.taxNo} mono />
            <InfoRow label={t('YETKİLİ')}         value={CURRENT_CUSTOMER.authorizedPerson} />
            <InfoRow label={t('TELEFON')}         value={CURRENT_CUSTOMER.phone} mono />
            <InfoRow label={t('E-POSTA')}         value={CURRENT_CUSTOMER.email} mono />
            <InfoRow label={t('ADRES')}           value={`${CURRENT_CUSTOMER.address}, ${CURRENT_CUSTOMER.city}`} />
            <InfoRow label={t('SAHİPLİK TARİHİ')} value={new Date(CURRENT_CUSTOMER.since).toLocaleDateString(locale)} highlight />
          </div>

          {/* Yeni müşteri */}
          <div className={`${styles.card} ${styles.newCard}`}>
            <div className={styles.sectionTitle}>{t('YENİ MÜŞTERİ')}</div>
            <FormField label={t('ŞİRKET ADI *')}     value={form.companyName} onChange={(v) => update('companyName', v)} />
            <FormField label={t('VERGİ NO *')}        value={form.taxNo} onChange={(v) => update('taxNo', v)} placeholder={t('10 haneli')} />
            <FormField label={t('YETKİLİ AD SOYAD *')} value={form.authorizedPerson} onChange={(v) => update('authorizedPerson', v)} />
            <FormField label={t('TELEFON *')}         value={form.phone} onChange={(v) => update('phone', v)} placeholder="+90 ..." />
            <FormField label={t('E-POSTA')}           value={form.email} onChange={(v) => update('email', v)} placeholder={t('ornek@sirket.com')} />
            <FormField label={t('ADRES')}             value={form.address} onChange={(v) => update('address', v)} />
            <FormField label={t('ŞEHİR')}             value={form.city} onChange={(v) => update('city', v)} />
          </div>
        </div>

        {/* SMS onay */}
        <div className={styles.smsCard}>
          <div className={styles.sectionTitle}>{t('SMS ONAYI')}</div>
          <div className={styles.smsRow}>
            <button
              className={styles.sendSmsBtn}
              onClick={sendSms}
              disabled={!isFormValid || smsSent}
            >
              {smsSent ? `✓ ${t('KOD GÖNDERİLDİ')}` : t('MEVCUT YETKİLİYE KOD GÖNDER')}
            </button>
            <div className={styles.smsInputBlock}>
              <label className={styles.smsLabel}>{t('6 HANELİ ONAY KODU')}</label>
              <input
                type="text"
                maxLength={6}
                className={styles.smsInput}
                value={smsCode}
                onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ''))}
                placeholder="_ _ _ _ _ _"
                disabled={!smsSent}
              />
            </div>
            <button
              className={styles.submitBtn}
              onClick={submit}
              disabled={!smsSent || smsCode.length !== 6}
            >
              {t('MÜŞTERİYİ DEĞİŞTİR')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={`${styles.infoValue} ${mono ? styles.mono : ''} ${highlight ? styles.highlight : ''}`}>{value}</span>
    </div>
  )
}

function FormField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        type="text"
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  )
}
