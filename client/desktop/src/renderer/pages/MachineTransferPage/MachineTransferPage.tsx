// Ayarlar > Satış / Takas / Hibe — makine sahiplik devri (üretici tarafı işlem).
// Sahiplik tipi seç + yeni sahip bilgileri + belge upload + Corventa merkez onayı.
// Backend: DataApi.machineIdentity.transferOwnership (henüz yok, mock).

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang, useT } from '@/i18n'
import styles from './MachineTransferPage.module.css'

type TransferType = 'SATIŞ' | 'TAKAS' | 'HİBE'

interface TransferForm {
  newOwnerCompany: string
  newOwnerAuthorized: string
  newOwnerTaxNo: string
  newOwnerPhone: string
  newOwnerAddress: string
  reason: string
  documentUploaded: boolean
}

const EMPTY_FORM: TransferForm = {
  newOwnerCompany: '', newOwnerAuthorized: '', newOwnerTaxNo: '',
  newOwnerPhone: '', newOwnerAddress: '', reason: '', documentUploaded: false,
}

const TRANSFER_INFO: Record<TransferType, { color: string; badge: string; desc: string }> = {
  'SATIŞ': { color: '#1a6fd4', badge: '💰', desc: 'Makine yeni müşteriye satılıyor. Fatura + tapu benzeri devir belgesi yüklenmeli.' },
  'TAKAS': { color: '#f59e0b', badge: '↔️', desc: 'Makine başka bir makine ile takas ediliyor. Takas sözleşmesi yüklenmeli.' },
  'HİBE':  { color: '#16a34a', badge: '🎁', desc: 'Makine bedelsiz olarak yeni sahibine devrediliyor. Hibe protokolü yüklenmeli.' },
}

// Mock mevcut makine
const MACHINE = {
  serialNo: 'CRV-BND-2025-1147',
  currentOwner: 'Sersovis A.Ş.',
  ownerSince: '2025-11-04',
  model: 'CORVENTA 4-CYLINDER PROFILE BENDER',
}

export default function MachineTransferPage() {
  const navigate = useNavigate()
  const t = useT()
  const locale = useLang() === 'en' ? 'en-GB' : 'tr-TR'
  const [transferType, setTransferType] = useState<TransferType>('SATIŞ')
  const [form, setForm] = useState<TransferForm>(EMPTY_FORM)

  const info = TRANSFER_INFO[transferType]
  const isFormValid = form.newOwnerCompany && form.newOwnerAuthorized && form.newOwnerTaxNo && form.documentUploaded

  function update<K extends keyof TransferForm>(k: K, v: TransferForm[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  function uploadDocument() {
    // Mock — gerçekte dialog + file picker
    setTimeout(() => {
      update('documentUploaded', true)
      alert(t('Belge yüklendi (mock — devir_belgesi.pdf, 2.4 MB)'))
    }, 500)
  }

  function submit() {
    alert(
      `${t('Corventa merkezine devir talebi gönderildi (mock):')}\n\n` +
      `${t('Tip: {v}', { v: t(transferType) })}\n` +
      `${t('Makine: {v}', { v: MACHINE.serialNo })}\n` +
      `${t('Eski: {v}', { v: MACHINE.currentOwner })}\n` +
      `${t('Yeni: {v}', { v: form.newOwnerCompany })}\n\n` +
      t('Merkez onayı sonrası sertifika/garanti transfer edilir.'),
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label={t('Geri')}>←</button>
        <h1 className={styles.title}>{t('SATIŞ / TAKAS / HİBE')}</h1>
      </div>

      <div className={styles.body}>
        {/* Makine bilgisi */}
        <div className={styles.machineCard}>
          <div className={styles.machineLeft}>
            <span className={styles.machineLabel}>{t('MAKİNE')}</span>
            <span className={styles.machineSerial}>{MACHINE.serialNo}</span>
            <span className={styles.machineModel}>{MACHINE.model}</span>
          </div>
          <div className={styles.machineRight}>
            <span className={styles.machineLabel}>{t('MEVCUT SAHİP')}</span>
            <span className={styles.machineOwner}>{MACHINE.currentOwner}</span>
            <span className={styles.machineSince}>{t('{date} tarihinden beri', { date: new Date(MACHINE.ownerSince).toLocaleDateString(locale) })}</span>
          </div>
        </div>

        {/* Transfer tipi seçim */}
        <div className={styles.card}>
          <div className={styles.sectionTitle}>{t('DEVİR TİPİ')}</div>
          <div className={styles.typeGrid}>
            {(['SATIŞ', 'TAKAS', 'HİBE'] as TransferType[]).map((tt) => {
              const ti = TRANSFER_INFO[tt]
              const isActive = transferType === tt
              return (
                <button
                  key={tt}
                  className={`${styles.typeCard} ${isActive ? styles.typeActive : ''}`}
                  onClick={() => setTransferType(tt)}
                  style={isActive ? { borderColor: ti.color, background: ti.color + '22' } : {}}
                >
                  <span className={styles.typeBadge}>{ti.badge}</span>
                  <span className={styles.typeName} style={isActive ? { color: ti.color } : {}}>{t(tt)}</span>
                </button>
              )
            })}
          </div>
          <p className={styles.typeDesc}>{t(info.desc)}</p>
        </div>

        {/* Yeni sahip formu */}
        <div className={styles.card}>
          <div className={styles.sectionTitle}>{t('YENİ SAHİP BİLGİLERİ')}</div>
          <div className={styles.formGrid}>
            <FormField label={t('ŞİRKET ADI *')}       value={form.newOwnerCompany}    onChange={(v) => update('newOwnerCompany', v)} />
            <FormField label={t('YETKİLİ AD SOYAD *')} value={form.newOwnerAuthorized} onChange={(v) => update('newOwnerAuthorized', v)} />
            <FormField label={t('VERGİ NO *')}          value={form.newOwnerTaxNo}      onChange={(v) => update('newOwnerTaxNo', v)} placeholder={t('10 haneli')} />
            <FormField label={t('TELEFON')}             value={form.newOwnerPhone}      onChange={(v) => update('newOwnerPhone', v)} placeholder="+90 ..." />
            <FormField label={t('ADRES')} full          value={form.newOwnerAddress}    onChange={(v) => update('newOwnerAddress', v)} />
            <FormField label={t('DEVİR AÇIKLAMASI')} full textarea value={form.reason} onChange={(v) => update('reason', v)}
              placeholder={t("Örn: Sersovis A.Ş. Corventa Otomasyon Ltd.'ye bağış (patent geçişi kapsamında)")} />
          </div>
        </div>

        {/* Belge upload + gönder */}
        <div className={styles.actionCard}>
          <div className={styles.uploadBlock}>
            <span className={styles.uploadLabel}>{t('DEVİR BELGESİ *')}</span>
            <button className={styles.uploadBtn} onClick={uploadDocument} disabled={form.documentUploaded}>
              {form.documentUploaded ? `✓ ${t('BELGE YÜKLENDİ (devir_belgesi.pdf)')}` : `📎 ${t('BELGE YÜKLE')}`}
            </button>
          </div>
          <button
            className={styles.submitBtn}
            onClick={submit}
            disabled={!isFormValid}
            style={{ background: isFormValid ? info.color : '#9ca3af' }}
          >
            {t('CORVENTA MERKEZE GÖNDER')}
          </button>
        </div>

        <p className={styles.note}>
          {t('Devir işlemi Corventa merkezi teknik ekip tarafından onaylandıktan sonra tamamlanır (~3 iş günü).')}
          {' '}{t('Garanti süresi, sertifikalar ve servis geçmişi yeni sahibe otomatik transfer edilir.')}
        </p>
      </div>
    </div>
  )
}

function FormField({
  label, value, onChange, placeholder, textarea, full,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; textarea?: boolean; full?: boolean
}) {
  return (
    <label className={`${styles.field} ${full ? styles.fieldFull : ''}`}>
      <span className={styles.fieldLabel}>{label}</span>
      {textarea ? (
        <textarea className={styles.textarea} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} />
      ) : (
        <input type="text" className={styles.input} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </label>
  )
}
