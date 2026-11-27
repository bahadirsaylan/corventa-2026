// 2026-11-27 (kullanıcı) — YAN DAYAMA OFSETİ: hızlı menüden tek tıkla açılan sayfa. Admin Ayarları > ÖLÇÜM & SENSÖR'deki
// YAN DAYAMA CETVELLERİ kartlarının aynısı (canlı değer, BURAYI SIFIR YAP / SIFIRI KALDIR, kalibrasyon) — sadece o alanlar.
// Kayıt Admin Ayarları ile aynı: sadece değişen alanlar, "eski → yeni" onayıyla; büküm sürerken kayıt kapalı.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ConfirmChangesModal,
  PagedColumns,
  SettingsPageShell,
  diffValues,
  patchOf,
  settingsFormStyles as styles,
  type SettingValue,
  type Values,
} from '@/components/SettingsForm/SettingsForm'
import { useBendingActive } from '@/stores/bendingActivityStore'
import { useT, tp } from '@/i18n'
import { SIDE_RULERS } from '@shared/sideRulers'
import SideRulerCards from '@/pages/AdminSettingsPage/SideRulerCards'
import { SIDE_RULER_FIELDS } from '@/pages/AdminSettingsPage/settingsFields'

const errMsg = (e: unknown) => tp(e instanceof Error ? e.message : String(e))

export default function SideOffsetsPage() {
  const t = useT()
  const navigate = useNavigate()
  const bendingActive = useBendingActive()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [machine0, setMachine0] = useState<Values>({})
  const [machine, setMachine] = useState<Values>({})
  const [confirm, setConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const m = (await window.corventa.settings.getMachine()) as Values
      setMachine0(m)
      setMachine(m)
    } catch (e) {
      setLoadError(errMsg(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const changes = useMemo(
    () =>
      diffValues(SIDE_RULER_FIELDS, machine0, machine, t).map((c) => {
        const r = SIDE_RULERS.find((x) => c.key.startsWith(`${x.key}Ruler`))
        return r ? { ...c, label: `${t(r.label)} · ${c.label}` } : c
      }),
    [machine0, machine, t],
  )

  async function save() {
    setSaving(true)
    setSaveError(null)
    try {
      const p = patchOf(SIDE_RULER_FIELDS, machine0, machine)
      if (Object.keys(p).length) await window.corventa.settings.updateMachine(p)
      setConfirm(false)
      setMessage(t('{n} ayar kaydedildi', { n: changes.length }))
      await load()
    } catch (e) {
      setSaveError(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  const onChange = (key: string, v: SettingValue) => {
    setMessage(null)
    setMachine((prev) => ({ ...prev, [key]: v }))
  }

  return (
    <SettingsPageShell title={t('YAN DAYAMA OFSETİ')} onBack={() => navigate(-1)}>
      {loading && !Object.keys(machine0).length ? (
        <p className={styles.message}>{t('Ayarlar yükleniyor…')}</p>
      ) : loadError ? (
        <div className={styles.card}>
          <p className={styles.message} data-kind="err">
            {t('Ayarlar okunamadı')}: {loadError}
          </p>
          <button type="button" className={styles.resetBtn} onClick={() => void load()}>
            {t('TEKRAR DENE')}
          </button>
        </div>
      ) : (
        <>
          {bendingActive && (
            <p className={styles.message} data-kind="err">
              {t('Büküm devam ediyor — bitene kadar ayar kaydedilemez.')}
            </p>
          )}
          {message && (
            <p className={styles.message} data-kind="ok">
              {message}
            </p>
          )}
          <PagedColumns>
            <SideRulerCards values={machine} original={machine0} onChange={onChange} />
          </PagedColumns>
          <div className={`${styles.footer} ${styles.footerInBody}`}>
            <span className={styles.footerInfo}>
              {changes.length ? t('{n} değişiklik kaydedilmedi', { n: changes.length }) : t('Değişiklik yok')}
            </span>
            <button
              type="button"
              className={styles.resetBtn}
              disabled={!changes.length}
              onClick={() => {
                setMachine(machine0)
                setMessage(null)
              }}
            >
              {t('GERİ AL')}
            </button>
            <button
              type="button"
              className={styles.saveBtn}
              disabled={!changes.length || bendingActive}
              onClick={() => {
                setSaveError(null)
                setConfirm(true)
              }}
            >
              {t('KAYDET')}
            </button>
          </div>
        </>
      )}

      {confirm && (
        <ConfirmChangesModal
          changes={changes}
          busy={saving}
          error={saveError}
          warning="Yan dayama ofseti bükümdeki yan dayama konumlarını ve gönye geri sınırını etkiler. Emin değilseniz VAZGEÇ'e basın."
          onConfirm={() => void save()}
          onCancel={() => setConfirm(false)}
        />
      )}
    </SettingsPageShell>
  )
}
