// Kalıp sorgu sonucu kartı + lisans etkinleştirme (BULUT_API_V2.md §2.3–2.4, §6).
// Büküm akışındaki KALIP KODU ekranı ve Ayarlar > KALIP KODU SORGULA kullanır.
// Lisans anahtarı ekran klavyesiyle girilir (KL-XXXX-XXXX-XXXX), etkinleştirme çevrimiçi (DataApi → bulut).

import { useState } from 'react'
import KeyboardModal from '@/components/KeyboardModal/KeyboardModal'
import { Icon, IconLabel } from '@/components/Icon'
import { cloudSourceLabel } from '@/stores/cloudConfigStore'
import { MOLD_PROFILE_LABELS, moldDimensionText, moldProfileToBendingProfile } from '@/constants/moldProfiles'
import { ProfileShape } from '@/pages/AiBendingPage/BendingProfileGrid'
import { useLang, useT } from '@/i18n'
import { moldUsability, type MoldLookupState } from './useMoldLookup'
import styles from './MoldResultCard.module.css'

const LICENSE_RE = /^KL-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/

/** Lisans anahtarı: büyük harf, A-Z0-9, "KL-" + 4'lü 3 grup */
export function formatLicenseKey(raw: string): string {
  let clean = raw.replace(/[iİı]/g, 'I').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (clean.startsWith('KL')) clean = clean.slice(2)
  clean = clean.slice(0, 12)
  const groups = clean.match(/.{1,4}/g) ?? []
  return ['KL', ...groups].join('-')
}

function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—'
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + 'Z')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })
}

interface Props {
  state: MoldLookupState
  /** flow = büküm akışı (profil tipi 'custom' reddedilir) · settings = sadece bilgi */
  mode: 'flow' | 'settings'
}

export default function MoldResultCard({ state, mode }: Props) {
  const t = useT()
  const locale = useLang() === 'en' ? 'en-GB' : 'tr-TR'
  const [keyboard, setKeyboard] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)
  const { status, result, error, code } = state

  if (status === 'idle') {
    return (
      <div className={`${styles.card} ${styles.cardInfo}`}>
        <div className={styles.infoTitle}>{t('KALIP KODU NASIL OKUNUR')}</div>
        <div className={styles.formatRow}>
          <span className={styles.formatCode}>MMM-AAA-BBB-SS-VV</span>
        </div>
        <ul className={styles.infoList}>
          <li><b>MMM</b> {t('kalıp üreticisi kodu (3 hane)')}</li>
          <li><b>AAA</b> {t('A ölçüsü mm (3 hane, 1000 mm ve üstü 4 hane)')}</li>
          <li><b>BBB</b> {t('B ölçüsü mm — 000 = B yok (boru, dolu mil)')}</li>
          <li><b>SS</b> {t('et kalınlığı mm — 00 = DOLU, 025 = 2,5 mm')}</li>
          <li><b>VV</b> {t('varyant (isteğe bağlı) — aynı ölçüde farklı profil')}</li>
        </ul>
        <div className={styles.examples}>
          <span className={styles.example}><code>001-160-160-02</code> {t('kare kutu 160×160×2')}</span>
          <span className={styles.example}><code>001-114-000-04</code> {t('boru Ø114×4')}</span>
          <span className={styles.example}><code>001-050-050-05-01</code> {t('köşebent 50×50×5')}</span>
        </div>
      </div>
    )
  }

  if (status === 'searching') {
    return (
      <div className={`${styles.card} ${styles.cardInfo} ${styles.center}`}>
        <div className={styles.spinner} />
        <div className={styles.infoTitle}>{t('SORGULANIYOR...')}</div>
      </div>
    )
  }

  if (status === 'notfound' || status === 'error' || !result) {
    return (
      <div className={`${styles.card} ${status === 'notfound' ? styles.cardBad : styles.cardGrey}`}>
        <div className={styles.head}>
          <span className={styles.headIcon}><Icon name={status === 'notfound' ? 'failure' : 'error'} size="xl" /></span>
          <div>
            <div className={styles.headTitle}>{status === 'notfound' ? t('KALIP KODU BULUNAMADI') : t('SORGULAMA YAPILAMADI')}</div>
            <div className={styles.headCode}>{code}</div>
          </div>
        </div>
        <p className={styles.text}>
          {status === 'notfound'
            ? t('Bu kod kalıp kütüphanesinde yok. Kodu kontrol edin; yeni kalıplar bulut bağlantısıyla gelir.')
            : t(error ?? '')}
        </p>
      </div>
    )
  }

  const m = result.mold
  const usability = moldUsability(result)
  const unsupported = mode === 'flow' && moldProfileToBendingProfile(m.profileType) === null
  const ok = usability === 'ok' && !unsupported
  const src = cloudSourceLabel(result.source)
  const step = m.defaultParams?.stepDistanceMm
  const canEnterKey = usability === 'needs-license' || usability === 'license-expired' || usability === 'license-revoked'

  let banner: { kind: 'ok' | 'warn' | 'bad'; text: string }
  if (usability === 'inactive') banner = { kind: 'bad', text: t('KALIP PASİF — KULLANILAMAZ') }
  else if (usability === 'license-revoked') banner = { kind: 'bad', text: t('LİSANS İPTAL EDİLMİŞ — yeni lisans anahtarı gerekli') }
  else if (usability === 'license-expired') banner = { kind: 'bad', text: t('LİSANS SÜRESİ DOLMUŞ ({date}) — yeni lisans anahtarı gerekli', { date: formatDate(result.activation?.expiresAt, locale) }) }
  else if (usability === 'needs-license') banner = { kind: 'warn', text: t('LİSANS GEREKLİ — bu makinede etkin değil') }
  else if (unsupported) banner = { kind: 'bad', text: t('BU PROFİL TİPİ BÜKÜM AKIŞINDA DESTEKLENMİYOR') }
  else banner = { kind: 'ok', text: mode === 'flow' ? t('KALIP KULLANILABİLİR — DEVAM için onaylayın') : t('KALIP KULLANILABİLİR') }

  let licenseText: string
  if (!m.requiresLicense) licenseText = t('GEREKMEZ')
  else if (usability === 'ok') {
    const until = result.activation?.expiresAt ? t('{date} tarihine kadar', { date: formatDate(result.activation.expiresAt, locale) }) : t('SÜRESİZ')
    licenseText = `${t('ETKİN')} · ${until}${result.activation?.licenseKey ? ` · ${result.activation.licenseKey}` : ''}`
  } else if (usability === 'license-expired') licenseText = t('SÜRESİ DOLMUŞ')
  else if (usability === 'license-revoked') licenseText = t('İPTAL EDİLMİŞ')
  else licenseText = t('ETKİN DEĞİL')

  return (
    <div className={`${styles.card} ${ok ? styles.cardOk : banner.kind === 'warn' ? styles.cardWarn : styles.cardBad}`}>
      <div className={styles.head}>
        <span className={styles.shape}>
          {moldProfileToBendingProfile(m.profileType) ? <ProfileShape id={m.profileType} /> : <Icon name="help" size="xl" />}
        </span>
        <div className={styles.headMain}>
          <div className={styles.headCode}>{m.code}</div>
          <div className={styles.headTitle}>{m.name || t(MOLD_PROFILE_LABELS[m.profileType] ?? m.profileType)}</div>
        </div>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${m.kind === 'CUSTOM' ? styles.badgeCustom : ''}`}>
            {m.kind === 'CUSTOM' ? t('ÖZEL') : t('STANDART')}
          </span>
          {src && <span className={`${styles.badge} ${styles.badgeSource}`}>{t(src)}</span>}
        </div>
      </div>

      <div className={styles.grid}>
        <Row label={t('ÜRETİCİ')} value={`${m.makerCode}${m.makerName ? ` · ${m.makerName}` : ''}`} />
        <Row label={t('PROFİL TİPİ')} value={t(MOLD_PROFILE_LABELS[m.profileType] ?? m.profileType)} />
        <Row label={t('ÖLÇÜ (A × B × S)')} value={moldDimensionText(m, t('DOLU'))} strong />
        {step != null && step > 0 && <Row label={t('ÖNERİLEN ADIM')} value={`${step} mm`} />}
        {m.description && <Row label={t('AÇIKLAMA')} value={m.description} />}
        {m.defaultParams?.notes && <Row label={t('NOT')} value={m.defaultParams.notes} />}
        <Row label={t('LİSANS')} value={licenseText} />
      </div>

      <div className={`${styles.banner} ${styles[`banner_${banner.kind}`]}`}>
        <Icon name={banner.kind === 'ok' ? 'success' : banner.kind === 'warn' ? 'warning' : 'blocked'} size="lg" />
        <span>{banner.text}</span>
      </div>

      {state.activationOk && (
        <div className={`${styles.note} ${styles.noteOk}`}>{t('Lisans etkinleştirildi — kalıp bu makinede kullanılabilir.')}</div>
      )}
      {(state.activationError || keyError) && (
        <div className={`${styles.note} ${styles.noteBad}`}>{t(keyError ?? '') || state.activationError}</div>
      )}

      {canEnterKey && (
        <button
          type="button"
          className={styles.licenseBtn}
          disabled={state.activating}
          onClick={() => { setKeyError(null); setKeyboard(true) }}
        >
          {state.activating ? t('ETKİNLEŞTİRİLİYOR...') : <IconLabel icon="lock">{t('LİSANS ANAHTARI GİR')}</IconLabel>}
        </button>
      )}

      {keyboard && (
        <KeyboardModal
          initialValue=""
          label={t('LİSANS ANAHTARI')}
          maxLength={20}
          onConfirm={(v) => {
            setKeyboard(false)
            const key = formatLicenseKey(v)
            if (!LICENSE_RE.test(key)) {
              setKeyError('Lisans anahtarı KL-XXXX-XXXX-XXXX biçiminde olmalı')
              return
            }
            void state.activate(key)
          }}
          onClose={() => setKeyboard(false)}
        />
      )}
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={`${styles.rowValue} ${strong ? styles.rowStrong : ''}`}>{value}</span>
    </div>
  )
}
