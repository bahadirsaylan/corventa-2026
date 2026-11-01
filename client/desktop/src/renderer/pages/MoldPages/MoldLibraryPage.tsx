// Ayarlar > KALIP KÜTÜPHANESİ (rota /settings/mold-library) — BULUT_API_V2.md §2.4 adım 4, §6.
// DataApi GET /api/molds?q=&profileType=&licensed= — önbellekteki kalıplar. Filtre: arama (kod / ad / üretici),
// profil tipi, lisans durumu. Sayfalı liste (kaydırma çubuğu yok); satıra dokununca KALIP KODU SORGULA açılır.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MoldDto, MoldProfileType } from '@shared/types'
import { Icon } from '@/components/Icon'
import { MOLD_PROFILE_LABELS, MOLD_PROFILE_TYPES, moldDimensionText } from '@/constants/moldProfiles'
import { ProfileShape } from '@/pages/AiBendingPage/BendingProfileGrid'
import { useLang, useT } from '@/i18n'
import styles from './MoldPages.module.css'

const PAGE_SIZE = 8
type LicenseFilter = 'all' | 'usable' | 'needs'
type Item = MoldDto & { licensed?: boolean }

function formatDateTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—'
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + 'Z')
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(locale, { hour12: false, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function licenseChip(m: Item): { cls: string; text: string } {
  if (!m.active) return { cls: 'chipBad', text: 'PASİF' }
  if (!m.requiresLicense) return { cls: 'chipStd', text: 'STANDART' }
  if (m.licensed) return { cls: 'chipOk', text: 'LİSANS ETKİN' }
  return { cls: 'chipWarn', text: 'LİSANS GEREKLİ' }
}

export default function MoldLibraryPage() {
  const navigate = useNavigate()
  const t = useT()
  const locale = useLang() === 'en' ? 'en-GB' : 'tr-TR'
  const [q, setQ] = useState('')
  const [profileType, setProfileType] = useState<MoldProfileType | ''>('')
  const [license, setLicense] = useState<LicenseFilter>('all')
  const [items, setItems] = useState<Item[]>([])
  const [syncedAt, setSyncedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [picker, setPicker] = useState(false)
  const seq = useRef(0)

  useEffect(() => {
    const my = ++seq.current
    const timer = setTimeout(async () => {
      setLoading(true)
      const r = await window.corventa.molds
        .list({ q: q.trim() || undefined, profileType, licensed: license === 'all' ? null : license === 'usable' })
        .catch((e: unknown) => ({ ok: false as const, status: 0, error: e instanceof Error ? e.message : String(e) }))
      if (my !== seq.current) return
      if (r.ok) {
        setItems(r.data.items ?? [])
        setSyncedAt(r.data.syncedAt ?? null)
        setError(null)
      } else {
        setItems([])
        setError(r.status === 0 ? 'DataApi yanıt vermiyor — bağlantıyı kontrol edin' : r.error)
      }
      setPage(0)
      setLoading(false)
    }, q ? 250 : 0)
    return () => clearTimeout(timer)
  }, [q, profileType, license])

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const visible = useMemo(() => items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE), [items, page])
  const filtered = !!q || !!profileType || license !== 'all'

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label={t('Geri')}>
          <Icon name="back" size="lg" />
        </button>
        <h1 className={styles.title}>{t('KALIP KÜTÜPHANESİ')}</h1>
        <span className={styles.headerMeta}>
          {t('SON SENKRON')}: {formatDateTime(syncedAt, locale)}
        </span>
      </div>

      <div className={styles.libBody}>
        <div className={styles.filters}>
          <input
            type="text"
            className={styles.search}
            placeholder={t('KOD / AD / ÜRETİCİ ARA')}
            aria-label={t('KOD / AD / ÜRETİCİ ARA')}
            maxLength={40}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="button" className={`${styles.filterBtn} ${profileType ? styles.filterOn : ''}`} onClick={() => setPicker(true)}>
            {t('PROFİL')}: {profileType ? t(MOLD_PROFILE_LABELS[profileType]) : t('TÜMÜ')}
          </button>
          <div className={styles.segment}>
            {(['all', 'usable', 'needs'] as const).map((k) => (
              <button
                key={k}
                type="button"
                className={`${styles.segBtn} ${license === k ? styles.segOn : ''}`}
                onClick={() => setLicense(k)}
              >
                {k === 'all' ? t('TÜMÜ') : k === 'usable' ? t('KULLANILABİLİR') : t('LİSANS GEREKLİ')}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.clearFilters}
            disabled={!filtered}
            onClick={() => { setQ(''); setProfileType(''); setLicense('all') }}
          >
            {t('TEMİZLE')}
          </button>
        </div>

        <div className={styles.table}>
          <div className={`${styles.tr} ${styles.th}`}>
            <span />
            <span>{t('KALIP KODU')}</span>
            <span>{t('AD / PROFİL')}</span>
            <span>{t('ÖLÇÜ')}</span>
            <span>{t('ÜRETİCİ')}</span>
            <span>{t('LİSANS')}</span>
          </div>
          {loading && !items.length && <div className={styles.empty}>{t('Yükleniyor…')}</div>}
          {!loading && error && <div className={`${styles.empty} ${styles.emptyErr}`}>{t(error)}</div>}
          {!loading && !error && !items.length && <div className={styles.empty}>{t('Filtreye uyan kalıp yok')}</div>}
          {visible.map((m) => {
            const chip = licenseChip(m)
            return (
              <button
                key={m.code}
                type="button"
                className={`${styles.tr} ${styles.rowBtn}`}
                onClick={() => navigate(`/settings/mold-code?code=${encodeURIComponent(m.code)}&from=library`)}
              >
                <span className={styles.miniShape}>
                  {m.profileType !== 'custom' ? <ProfileShape id={m.profileType} /> : <Icon name="help" size="md" />}
                </span>
                <span className={styles.codeCell}>{m.code}</span>
                <span className={styles.nameCell}>
                  <span className={styles.nameMain}>{m.name || t(MOLD_PROFILE_LABELS[m.profileType])}</span>
                  <span className={styles.nameSub}>
                    {t(MOLD_PROFILE_LABELS[m.profileType] ?? m.profileType)}
                    {m.kind === 'CUSTOM' ? ` · ${t('ÖZEL')}` : ''}
                  </span>
                </span>
                <span className={styles.dimCell}>{moldDimensionText(m, t('DOLU'))}</span>
                <span className={styles.makerCell}>{m.makerName ?? m.makerCode}</span>
                <span><span className={`${styles.chip} ${styles[chip.cls]}`}>{t(chip.text)}</span></span>
              </button>
            )
          })}
        </div>

        <div className={styles.pager}>
          <span className={styles.count}>{t('{n} kalıp', { n: items.length })}</span>
          <button type="button" className={styles.pageBtn} disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label={t('Önceki sayfa')}>
            <Icon name="chevronLeft" size="lg" />
          </button>
          <span className={styles.pageNo}>{page + 1} / {pageCount}</span>
          <button type="button" className={styles.pageBtn} disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)} aria-label={t('Sonraki sayfa')}>
            <Icon name="chevronRight" size="lg" />
          </button>
        </div>
      </div>

      {picker && (
        <div className={styles.overlay} onClick={() => setPicker(false)}>
          <div className={styles.pickerModal} onClick={(e) => e.stopPropagation()} role="dialog">
            <div className={styles.pickerTitle}>{t('PROFİL TİPİ SEÇİN')}</div>
            <div className={styles.pickerGrid}>
              <button type="button" className={`${styles.pickerTile} ${!profileType ? styles.pickerOn : ''}`} onClick={() => { setProfileType(''); setPicker(false) }}>
                <span className={styles.pickerLabel}>{t('TÜMÜ')}</span>
              </button>
              {MOLD_PROFILE_TYPES.map((pt) => (
                <button
                  key={pt}
                  type="button"
                  className={`${styles.pickerTile} ${profileType === pt ? styles.pickerOn : ''}`}
                  onClick={() => { setProfileType(pt); setPicker(false) }}
                >
                  <span className={styles.pickerShape}>{pt !== 'custom' ? <ProfileShape id={pt} /> : <Icon name="help" size="xl" />}</span>
                  <span className={styles.pickerLabel}>{t(MOLD_PROFILE_LABELS[pt])}</span>
                </button>
              ))}
            </div>
            <button type="button" className={styles.pickerClose} onClick={() => setPicker(false)}>{t('KAPAT')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
