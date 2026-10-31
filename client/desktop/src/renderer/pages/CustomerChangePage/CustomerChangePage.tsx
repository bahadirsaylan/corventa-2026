// Ayarlar > Müşteri Değişikliği — satış / takas / hibe tek ekranda (UI madde 17).
// Akış: 1) neden seç (SATIŞ / TAKAS / HİBE) → 2) yeni müşteri bilgileri → 3) e-posta ile gelen
// 6 haneli onay kodu (OTP) → onay → makine kimliği yeni müşteriye geçer.
// Backend: DataApi POST /api/customer-change/request + /confirm (main → DataApiClient → ipc → preload;
// demo'da DemoMachine). OTP, DataApi'de ayarlı Corventa onay adresine gider (CustomerChange:OtpRecipientEmail).

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type {
  CustomerChangeReason,
  CustomerChangeRequestBody,
  MachineIdentity,
} from '@shared/types'
import { Icon, IconLabel, type IconName } from '@/components/Icon'
import KeyboardModal from '@/components/KeyboardModal/KeyboardModal'
import NumpadModal from '@/components/NumpadModal/NumpadModal'
import { useT } from '@/i18n'
import styles from './CustomerChangePage.module.css'

type Step = 'reason' | 'form' | 'otp' | 'done'

interface CustomerForm {
  newCustomerName: string
  newCustomerCompany: string
  newCustomerTaxNo: string
  newCustomerPhone: string
  newCustomerEmail: string
  newCustomerAddress: string
  note: string
}

const EMPTY_FORM: CustomerForm = {
  newCustomerName: '', newCustomerCompany: '', newCustomerTaxNo: '', newCustomerPhone: '',
  newCustomerEmail: '', newCustomerAddress: '', note: '',
}

/** Alan tanımları — uzunluk sınırları backend ile birebir (CustomerChangeController) */
const FIELDS: { key: keyof CustomerForm; label: string; max: number; full?: boolean; placeholder?: string }[] = [
  { key: 'newCustomerName',    label: 'MÜŞTERİ ADI *', max: 200 },
  { key: 'newCustomerCompany', label: 'FİRMA UNVANI',  max: 200 },
  { key: 'newCustomerTaxNo',   label: 'VERGİ NO',      max: 50, placeholder: '10 haneli' },
  { key: 'newCustomerPhone',   label: 'TELEFON',       max: 50, placeholder: '+90 ...' },
  { key: 'newCustomerEmail',   label: 'E-POSTA',       max: 200, full: true, placeholder: 'ornek@sirket.com' },
  { key: 'newCustomerAddress', label: 'ADRES',         max: 500, full: true },
  { key: 'note',               label: 'AÇIKLAMA / NOT', max: 1000, full: true },
]

const REASONS: { key: CustomerChangeReason; label: string; badge: IconName; color: string; desc: string }[] = [
  { key: 'SALE',  label: 'SATIŞ', badge: 'sale', color: '#1a6fd4', desc: 'Makine yeni müşteriye satılıyor.' },
  { key: 'TRADE', label: 'TAKAS', badge: 'swap', color: '#f59e0b', desc: 'Makine başka bir makine ile takas ediliyor.' },
  { key: 'GRANT', label: 'HİBE',  badge: 'gift', color: '#16a34a', desc: 'Makine bedelsiz olarak yeni sahibine devrediliyor.' },
]

/** DB'deki OwnershipType (SATIS/TAKAS/HIBE) → ekran etiketi */
const OWNERSHIP_LABEL: Record<string, string> = { SATIS: 'SATIŞ', TAKAS: 'TAKAS', HIBE: 'HİBE' }

const OTP_LENGTH = 6
const RESEND_COOLDOWN_S = 60

/** Ekranda gösterilecek hata — ana mesaj + (varsa) backend'in Türkçe detayı */
interface UiError { message: string; detail?: string }

/**
 * DataApi CustomerChangeController.LooksLikeEmail ile AYNI kural (farklı olursa UI'dan geçen adres 400 alır):
 * tek '@', önünde en az 1 karakter, '@'tan sonra en az 1 karakter ve ardından '.', sonu '.' değil, boşluk yok.
 */
function isValidEmail(s: string): boolean {
  const at = s.indexOf('@')
  return at > 0 && at === s.lastIndexOf('@') && s.indexOf('.', at) > at + 1 && !s.endsWith('.') && !s.includes(' ')
}

function formatMmSs(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function CustomerChangePage() {
  const navigate = useNavigate()
  const t = useT()

  // Mevcut müşteri — DataApi machine-identity
  const [identity, setIdentity] = useState<MachineIdentity | null>(null)
  const [identityError, setIdentityError] = useState(false)

  const [step, setStep] = useState<Step>('reason')
  const [reason, setReason] = useState<CustomerChangeReason | null>(null)
  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM)
  const [keyboardField, setKeyboardField] = useState<keyof CustomerForm | null>(null)

  // OTP aşaması
  const [requestId, setRequestId] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState('')
  const [expiresAtMs, setExpiresAtMs] = useState(0)
  const [lastSentAtMs, setLastSentAtMs] = useState(0)
  const [otp, setOtp] = useState('')
  const [numpadOpen, setNumpadOpen] = useState(false)
  /** Kod artık kullanılamaz (süre doldu / deneme bitti / daha yeni talep) → sadece yeni kod istenebilir */
  const [codeDead, setCodeDead] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<UiError | null>(null)
  const [info, setInfo] = useState('')

  useEffect(() => {
    let alive = true
    window.corventa.settings.getIdentity()
      .then((id) => { if (alive) setIdentity(id) })
      .catch(() => { if (alive) setIdentityError(true) })
    return () => { alive = false }
  }, [])

  // OTP aşamasında saniyelik sayaç (kalan süre + tekrar gönder bekleme)
  useEffect(() => {
    if (step !== 'otp') return
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [step])

  const remainingSec = Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000))
  const expired = step === 'otp' && remainingSec === 0
  const cooldownSec = Math.max(0, RESEND_COOLDOWN_S - Math.floor((nowMs - lastSentAtMs) / 1000))
  const codeUsable = !codeDead && !expired
  // Kod kullanılamaz hale geldiyse 60 sn beklemeye gerek yok
  const canResend = !busy && (cooldownSec === 0 || !codeUsable)

  const nameOk = form.newCustomerName.trim().length > 0
  const emailOk = !form.newCustomerEmail.trim() || isValidEmail(form.newCustomerEmail.trim())
  const isFormValid = nameOk && emailOk

  function update(k: keyof CustomerForm, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  function chooseReason(r: CustomerChangeReason) {
    setReason(r)
    setError(null)
    setStep('form')
  }

  function buildBody(): CustomerChangeRequestBody | null {
    if (!reason) return null
    const opt = (v: string): string | null => (v.trim() ? v.trim() : null)
    return {
      reason,
      newCustomerName: form.newCustomerName.trim(),
      newCustomerCompany: opt(form.newCustomerCompany),
      newCustomerTaxNo: opt(form.newCustomerTaxNo),
      newCustomerPhone: opt(form.newCustomerPhone),
      newCustomerEmail: opt(form.newCustomerEmail),
      newCustomerAddress: opt(form.newCustomerAddress),
      note: opt(form.note),
    }
  }

  /** Talep aç + OTP e-postası gönder (ilk gönderim ve "yeni kod gönder" aynı çağrı) */
  async function sendCode() {
    const body = buildBody()
    if (!body || !isFormValid || busy) return
    setBusy(true)
    setError(null)
    setInfo('')
    try {
      const res = await window.corventa.settings.requestCustomerChange(body)
      if (!res.ok) {
        setError(requestErrorText(res.status, res.error))
        return
      }
      const sentAt = Date.now()
      setRequestId(res.data.requestId)
      setSentTo(res.data.sentTo)
      setExpiresAtMs(new Date(res.data.expiresAt).getTime())
      setLastSentAtMs(sentAt)
      setNowMs(sentAt)
      setOtp('')
      setCodeDead(false)
      if (step === 'otp') setInfo(t('Yeni onay kodu gönderildi. Önceki kod artık geçersiz.'))
      setStep('otp')
    } catch (err) {
      setError({ message: t('Talep gönderilemedi.'), detail: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(false)
    }
  }

  async function confirm() {
    if (!requestId || otp.length !== OTP_LENGTH || !codeUsable || busy) return
    setBusy(true)
    setError(null)
    setInfo('')
    try {
      const res = await window.corventa.settings.confirmCustomerChange(requestId, otp)
      if (res.ok) {
        setIdentity((prev) => ({ ...(prev ?? {}), ...res.data.machineIdentity }))
        setStep('done')
        return
      }
      setOtp('')
      switch (res.status) {
        case 400:
          setError(res.remainingAttempts != null
            ? { message: t('Onay kodu hatalı. Kalan deneme hakkı: {n}', { n: res.remainingAttempts }) }
            : { message: t('6 haneli onay kodunu girin.'), detail: res.error })
          break
        case 410:
          setCodeDead(true)
          setError({ message: t('Onay kodunun süresi doldu veya kod geçersiz. "YENİ KOD GÖNDER" ile yeni kod isteyin.'), detail: res.error })
          break
        case 429:
          setCodeDead(true)
          setError({ message: t('Deneme hakkı bitti (5 yanlış deneme). "YENİ KOD GÖNDER" ile yeni kod isteyin.') })
          break
        case 404:
          setCodeDead(true)
          setError({ message: t('Talep bulunamadı. "YENİ KOD GÖNDER" ile yeni kod isteyin.') })
          break
        case 409:
          setCodeDead(true)
          setError({ message: t('Bu talep zaten onaylanmış. Müşteri bilgisi güncellenmiş olabilir — sayfayı yeniden açın.') })
          break
        case 0:
          setError({ message: t('Veri servisine (DataApi) ulaşılamadı. Bağlantıyı kontrol edip tekrar deneyin.'), detail: res.error })
          break
        default:
          setError({ message: t('Onay başarısız.'), detail: res.error })
      }
    } catch (err) {
      setError({ message: t('Onay başarısız.'), detail: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(false)
    }
  }

  function requestErrorText(status: number, detail: string): UiError {
    switch (status) {
      case 503:
        return { message: t('E-posta servisi ayarlı değil — onay kodu gönderilemedi. DataApi e-posta (SMTP) ve onay adresi ayarları yapılmalı.'), detail }
      case 502:
        return { message: t('E-posta gönderilemedi — onay kodu iletilemedi. İnternet bağlantısını kontrol edip tekrar deneyin.'), detail }
      case 400:
        return { message: t('Bilgiler geçersiz — lütfen kontrol edin.'), detail }
      case 0:
        return { message: t('Veri servisine (DataApi) ulaşılamadı. Bağlantıyı kontrol edip tekrar deneyin.'), detail }
      default:
        return { message: t('Talep gönderilemedi.'), detail }
    }
  }

  function goBack() {
    setError(null)
    setInfo('')
    if (step === 'form') setStep('reason')
    else if (step === 'otp') setStep('form')
    else navigate('/settings')
  }

  const reasonInfo = REASONS.find((r) => r.key === reason) ?? null
  const ownershipLabel = (o: string | undefined): string => t(OWNERSHIP_LABEL[o ?? ''] ?? (o || '—'))
  const dash = (v: string | null | undefined): string => (v && v.trim() ? v : '—')
  const stepIndex = step === 'reason' ? 1 : step === 'form' ? 2 : 3
  const activeField = FIELDS.find((f) => f.key === keyboardField) ?? null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={goBack} disabled={busy} aria-label={t('Geri')}><Icon name="back" size="lg" /></button>
        <h1 className={styles.title}>{t('MÜŞTERİ DEĞİŞİKLİĞİ')}</h1>
      </div>

      <div className={styles.body}>
        <div className={styles.warnBar}>
          <Icon name="warning" size="lg" className={styles.warnIcon} />
          <span>
            {t('BU İŞLEM KRİTİKTİR — GARANTİ VE SERTİFİKA SAHİPLİĞİ YENİ MÜŞTERİYE DEVREDİLİR.')}
            &nbsp;{t('İŞLEM GERİ ALINAMAZ.')}
          </span>
        </div>

        {/* Mevcut müşteri (gerçek veri: DataApi machine-identity) */}
        <div className={`${styles.card} ${styles.currentCard}`}>
          <div className={styles.sectionTitle}>
            {step === 'done' ? t('GÜNCEL MÜŞTERİ') : t('MEVCUT MÜŞTERİ')}
          </div>
          {identityError && !identity ? (
            <div className={styles.muted}>{t('Makine kimliği alınamadı (DataApi bağlantısını kontrol edin).')}</div>
          ) : !identity ? (
            <div className={styles.muted}>{t('Yükleniyor…')}</div>
          ) : (
            <div className={styles.infoGrid}>
              <InfoRow label={t('MÜŞTERİ')}       value={dash(identity.customerName)} highlight />
              <InfoRow label={t('SAHİPLİK TİPİ')} value={ownershipLabel(identity.ownershipType)} />
              <InfoRow label={t('FİRMA UNVANI')}  value={dash(identity.customerCompany)} />
              <InfoRow label={t('VERGİ NO')}      value={dash(identity.customerTaxNo)} mono />
              <InfoRow label={t('TELEFON')}       value={dash(identity.customerPhone)} mono />
              <InfoRow label={t('E-POSTA')}       value={dash(identity.customerEmail)} mono />
              <InfoRow label={t('SERİ NO')}       value={dash(identity.serialNo)} mono />
              <InfoRow label={t('ADRES')}         value={dash(identity.customerAddress)} />
            </div>
          )}
        </div>

        {step !== 'done' && (
          <div className={styles.stepper}>
            {[t('NEDEN'), t('YENİ MÜŞTERİ'), t('ONAY KODU')].map((label, i) => (
              <div
                key={label}
                className={`${styles.stepItem} ${i + 1 === stepIndex ? styles.stepActive : ''} ${i + 1 < stepIndex ? styles.stepDone : ''}`}
              >
                <span className={styles.stepNo}>{i + 1 < stepIndex ? <Icon name="check" size="sm" /> : i + 1}</span>
                <span className={styles.stepLabel}>{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Adım 1: neden ── */}
        {step === 'reason' && (
          <div className={styles.card}>
            <div className={styles.sectionTitle}>{t('MÜŞTERİ NEDEN DEĞİŞİYOR?')}</div>
            <div className={styles.reasonGrid}>
              {REASONS.map((r) => {
                const active = reason === r.key
                return (
                  <button
                    key={r.key}
                    className={styles.reasonCard}
                    onClick={() => chooseReason(r.key)}
                    style={active ? { borderColor: r.color, background: r.color + '22' } : { borderColor: r.color }}
                  >
                    <span className={styles.reasonBadge} style={{ color: r.color }}><Icon name={r.badge} size="xxl" /></span>
                    <span className={styles.reasonName} style={{ color: r.color }}>{t(r.label)}</span>
                    <span className={styles.reasonDesc}>{t(r.desc)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Adım 2: yeni müşteri bilgileri ── */}
        {step === 'form' && reasonInfo && (
          <div className={`${styles.card} ${styles.newCard}`}>
            <div className={styles.sectionTitleRow}>
              <span className={styles.sectionTitle}>{t('YENİ MÜŞTERİ BİLGİLERİ')}</span>
              <button
                className={styles.reasonChip}
                style={{ borderColor: reasonInfo.color, color: reasonInfo.color }}
                onClick={() => setStep('reason')}
              >
                <IconLabel icon={reasonInfo.badge}>{t(reasonInfo.label)} · {t('DEĞİŞTİR')}</IconLabel>
              </button>
            </div>
            <div className={styles.formGrid}>
              {FIELDS.map((f) => (
                <FormField
                  key={f.key}
                  label={t(f.label)}
                  value={form[f.key]}
                  maxLength={f.max}
                  full={f.full}
                  placeholder={f.placeholder ? t(f.placeholder) : undefined}
                  invalid={f.key === 'newCustomerEmail' && !emailOk}
                  onChange={(v) => update(f.key, v)}
                  onKeyboard={() => setKeyboardField(f.key)}
                  keyboardLabel={t('Ekran klavyesi')}
                />
              ))}
            </div>
            {!emailOk && <div className={styles.fieldError}>{t('E-posta adresi geçersiz.')}</div>}
            <p className={styles.note}>
              {t('Onay kodu kayıtlı onay e-posta adresine gönderilir; gönderilen adres bir sonraki adımda gösterilir. Kod 10 dakika geçerlidir, en fazla 5 deneme hakkı vardır.')}
            </p>
            <button className={styles.primaryBtn} onClick={sendCode} disabled={!isFormValid || busy}>
              {busy ? t('GÖNDERİLİYOR…') : <IconLabel icon="send" size="md">{t('ONAY KODU GÖNDER')}</IconLabel>}
            </button>
          </div>
        )}

        {/* ── Adım 3: OTP ── */}
        {step === 'otp' && (
          <div className={styles.otpCard}>
            <div className={styles.sectionTitle}>{t('E-POSTA ONAYI')}</div>
            <div className={styles.otpSent}>
              {t('Onay kodu {email} adresine gönderildi.', { email: sentTo || '—' })}
            </div>
            <div className={styles.otpSummary}>
              {reasonInfo && <span style={{ color: reasonInfo.color }}><IconLabel icon={reasonInfo.badge}>{t(reasonInfo.label)}</IconLabel></span>}
              <span>{dash(identity?.customerName)} → <b>{form.newCustomerName.trim()}</b></span>
            </div>

            <div className={styles.otpRow}>
              <button
                className={styles.otpBox}
                onClick={() => codeUsable && setNumpadOpen(true)}
                disabled={!codeUsable || busy}
                aria-label={t('6 HANELİ ONAY KODU')}
              >
                {Array.from({ length: OTP_LENGTH }, (_, i) => (
                  <span key={i} className={`${styles.otpDigit} ${otp[i] ? styles.otpDigitFilled : ''}`}>
                    {otp[i] ?? ''}
                  </span>
                ))}
              </button>
              {/* Fiziksel klavyeyle giriş (geliştirme PC'si) — dokunmatikte soldaki kutu tuş takımını açar */}
              <input
                className={styles.otpInput}
                inputMode="numeric"
                maxLength={OTP_LENGTH}
                value={otp}
                disabled={!codeUsable || busy}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                onKeyDown={(e) => { if (e.key === 'Enter') void confirm() }}
                placeholder="______"
                aria-label={t('6 HANELİ ONAY KODU')}
              />
            </div>

            <div className={`${styles.timer} ${remainingSec <= 60 ? styles.timerLow : ''}`}>
              {codeDead
                ? t('Bu kod artık kullanılamaz.')
                : expired
                  ? t('Kodun süresi doldu.')
                  : t('Kalan süre: {t}', { t: formatMmSs(remainingSec) })}
            </div>

            <div className={styles.otpActions}>
              <button className={styles.secondaryBtn} onClick={sendCode} disabled={!canResend}>
                {cooldownSec > 0 && codeUsable
                  ? t('YENİ KOD GÖNDER ({n} sn)', { n: cooldownSec })
                  : t('YENİ KOD GÖNDER')}
              </button>
              <button
                className={styles.submitBtn}
                onClick={confirm}
                disabled={!codeUsable || otp.length !== OTP_LENGTH || busy}
              >
                {busy ? t('KONTROL EDİLİYOR…') : t('ONAYLA VE MÜŞTERİYİ DEĞİŞTİR')}
              </button>
            </div>
          </div>
        )}

        {/* ── Başarı ── */}
        {step === 'done' && (
          <div className={styles.successCard}>
            <div className={styles.successTitle}><IconLabel icon="success" size="lg">{t('MÜŞTERİ DEĞİŞİKLİĞİ TAMAMLANDI')}</IconLabel></div>
            <div className={styles.successText}>
              {t('Makine artık {name} adına kayıtlı. Sahiplik tipi: {type}.', {
                name: dash(identity?.customerName),
                type: ownershipLabel(identity?.ownershipType),
              })}
            </div>
            <button className={styles.primaryBtn} onClick={() => navigate('/settings')}>
              {t('AYARLARA DÖN')}
            </button>
          </div>
        )}

        {info && <div className={styles.infoBar}>{info}</div>}
        {error && (
          <div className={styles.errorBar}>
            <div>{error.message}</div>
            {error.detail && <div className={styles.errorDetail}>{error.detail}</div>}
          </div>
        )}
      </div>

      {activeField && (
        <KeyboardModal
          initialValue={form[activeField.key]}
          label={activeField.label}
          maxLength={activeField.max}
          onConfirm={(v) => { update(activeField.key, v); setKeyboardField(null) }}
          onClose={() => setKeyboardField(null)}
        />
      )}

      {numpadOpen && (
        <NumpadModal
          fieldLabel={t('ONAY KODU')}
          initialValue={otp}
          digitsOnly
          maxLength={OTP_LENGTH}
          onConfirm={(v) => setOtp(v.replace(/\D/g, '').slice(0, OTP_LENGTH))}
          onClose={() => setNumpadOpen(false)}
        />
      )}
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

function FormField({
  label, value, onChange, onKeyboard, keyboardLabel, placeholder, maxLength, full, invalid,
}: {
  label: string; value: string; onChange: (v: string) => void; onKeyboard: () => void; keyboardLabel: string
  placeholder?: string; maxLength: number; full?: boolean; invalid?: boolean
}) {
  return (
    <div className={`${styles.field} ${full ? styles.fieldFull : ''}`}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={styles.inputRow}>
        <input
          type="text"
          className={`${styles.input} ${invalid ? styles.inputInvalid : ''}`}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <button type="button" className={styles.kbBtn} onClick={onKeyboard} aria-label={keyboardLabel}><Icon name="keyboard" size="lg" /></button>
      </div>
    </div>
  )
}
