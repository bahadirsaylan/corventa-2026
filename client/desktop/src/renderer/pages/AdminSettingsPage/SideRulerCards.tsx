// Admin Ayarları > ÖLÇÜM & SENSÖR — YAN DAYAMA CETVELLERİ (2026-11-19). Her cetvel kendi kartında (PagedColumns
// iki sütun, kaydırmasız sayfalama): canlı ham + kalibre mm + ofsetli mm, EN GERİ / EN İLERİ HAM DEĞER, STROK,
// SIFIR OFSETİ alanları ve düğmeler. Düğmeler SADECE formu doldurur — kayıt normal KAYDET (onaylı) ile yapılır.
//   EN GERİ DEĞERİ KAYDET  → RawMin = anlık ham      EN İLERİ DEĞERİ KAYDET → RawMax = anlık ham
//   BURAYI SIFIR YAP       → OffsetMm = anlık kalibre mm (formdaki kalibrasyonla)   SIFIRI KALDIR → OffsetMm = 0
// Ham değer alanı elle ya da düğmeyle değişince KALİBRASYON = KALİBRE EDİLDİ olur (sol taraf varsayılanla gelir).
// Sadece gösterim — yan dayama hareketine etkisi yok. Eski PLC programında cetvel yoksa canlı satır "OKUNAMIYOR".

import { FieldRow, settingsFormStyles as styles, type SettingValue, type Values } from '@/components/SettingsForm/SettingsForm'
import { useT } from '@/i18n'
import { useMachineStateStore } from '@/stores/machineStateStore'
import { SIDE_RULERS, sideRulerToMm, type SideRulerDef } from '@shared/sideRulers'
import { SIDE_RULER_FIELD_DEFS } from './settingsFields'
import own from './SideRulerCards.module.css'

const same = (a: SettingValue | undefined, b: SettingValue | undefined) => a === b || (a == null && b == null)

interface Props {
  values: Values
  original: Values
  onChange: (key: string, v: SettingValue) => void
}

export default function SideRulerCards({ values, original, onChange }: Props) {
  const t = useT()
  // Bölüm başlığı + açıklama AYRI küçük kartta: tüm cetvel kartları aynı (kısa) boyda kalır, sütuna bölünmeden sığar
  return (
    <>
      <div className={`${styles.card} ${own.card}`}>
        <div className={styles.sectionTitle}>{t('YAN DAYAMA CETVELLERİ')}</div>
        <p className={styles.sectionNote}>
          {t('Yan dayama cetvelleri sadece gösterim içindir. Dayamayı en geriye / en ileriye sürüp değeri kaydedin; düğmeler formu doldurur, KAYDET ile kaydedilir.')}
        </p>
      </div>
      {SIDE_RULERS.map((r) => (
        <RulerCard key={r.key} def={r} values={values} original={original} onChange={onChange} />
      ))}
    </>
  )
}

function RulerCard({ def, values, original, onChange }: Props & { def: SideRulerDef }) {
  const t = useT()
  const f = SIDE_RULER_FIELD_DEFS(def.key)
  const live = useMachineStateStore((s) => s.state.sideSupportRulers?.[def.key])
  const available = live?.available === true
  const raw = available ? live.raw : null

  const num = (key: string, d: number) => {
    const v = Number(values[key])
    return Number.isFinite(v) ? v : d
  }
  const rawMin = num(f.rawMin.key, def.rawMin)
  const rawMax = num(f.rawMax.key, def.rawMax)
  const stroke = num(f.strokeMm.key, def.strokeMm)
  const offset = num(f.offsetMm.key, 0)
  // Formdaki (kaydedilmemiş olabilir) kalibrasyonla hesap — düğmelerin etkisi kaydetmeden görünsün
  const calMm = raw == null ? null : sideRulerToMm(raw, rawMin, rawMax, stroke)
  const shownMm = calMm == null ? null : Math.round((calMm - offset) * 100) / 100
  const calibrated = values[f.calibrated.key] !== false
  const hasSettings = values[f.rawMin.key] !== undefined

  const setRaw = (key: string, v: SettingValue) => {
    onChange(key, v)
    if (!calibrated) onChange(f.calibrated.key, true)
  }

  const row = (fd: typeof f.rawMin, handler: (k: string, v: SettingValue) => void) => (
    <FieldRow
      field={fd}
      value={values[fd.key]}
      changed={!same(values[fd.key], original[fd.key])}
      onChange={(v) => handler(fd.key, v)}
      disabled={!hasSettings}
    />
  )

  return (
    <div className={`${styles.card} ${own.card}`}>
      <div className={own.head}>
        <span className={styles.sectionTitle}>{t(def.label)}</span>
        {!calibrated && <span className={own.badge}>{t('KALİBRE EDİLMEDİ')}</span>}
      </div>
      <div className={own.live}>
        {available ? (
          <>
            <span className={own.big}>
              {shownMm!.toFixed(1)} <span className={own.unit}>mm</span>
            </span>
            <span className={own.sub}>
              {t('HAM')}: {raw} · {t('KALİBRE')}: {calMm!.toFixed(1)} mm · {t('OFSET')}: {offset.toFixed(1)} mm
            </span>
          </>
        ) : (
          <span className={own.sub}>{t('CETVEL OKUNAMIYOR (PLC programı eski olabilir)')}</span>
        )}
      </div>
      {!hasSettings && (
        <p className={styles.message} data-kind="err">
          {t('Bu cetvelin ayarları makine yazılımında yok — yazılımı güncelleyin.')}
        </p>
      )}
      <div className={styles.rows}>
        {row(f.rawMin, setRaw)}
        {row(f.rawMax, setRaw)}
        {row(f.strokeMm, onChange)}
        {row(f.offsetMm, onChange)}
      </div>
      <div className={own.btnRow}>
        <button type="button" className={styles.resetBtn} disabled={raw == null || !hasSettings} onClick={() => setRaw(f.rawMin.key, raw)}>
          {t('EN GERİ DEĞERİ KAYDET')}
        </button>
        <button type="button" className={styles.resetBtn} disabled={raw == null || !hasSettings} onClick={() => setRaw(f.rawMax.key, raw)}>
          {t('EN İLERİ DEĞERİ KAYDET')}
        </button>
      </div>
      <div className={own.btnRow}>
        <button type="button" className={styles.resetBtn} disabled={calMm == null || !hasSettings} onClick={() => onChange(f.offsetMm.key, calMm)}>
          {t('BURAYI SIFIR YAP')}
        </button>
        <button type="button" className={styles.resetBtn} disabled={!hasSettings || offset === 0} onClick={() => onChange(f.offsetMm.key, 0)}>
          {t('SIFIRI KALDIR')}
        </button>
      </div>
    </div>
  )
}
