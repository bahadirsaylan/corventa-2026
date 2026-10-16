// Çok dilli arayüz — basit sözlük tabanlı çeviri.
//
// ANAHTAR = TÜRKÇE KAYNAK METİN (birebir). Türkçe seçiliyse metin olduğu gibi döner; diğer dillerde
// sözlükte karşılığı varsa o, yoksa Türkçe kaynak gösterilir (eksik çeviri ekranı bozmaz).
// Değişkenli metinler: t('PASO {n} BÜKÜLÜYOR', { n: 3 }) — sözlükte de aynı {n} yer tutucusu.
//
// Yeni dil eklemek: ./<kod>/ klasörü aç (ör. ./de/), içine herhangi isimde sözlük dosyaları koy
// (`export default { 'TÜRKÇE': 'Deutsch', ... }`). Klasör OTOMATİK yüklenir — burada kayıt gerekmez.
// Eksik çevirileri görmek için: npm run i18n:check -- de   (anahtar listesini ./en/ ile kıyaslar)
// Seçili dil LanguagePage'den kaydedilir (localStorage 'corventa.language') ve canlı değişir.

import { create } from 'zustand'

export type LangCode = 'tr' | 'en' | 'de' | 'ru' | 'ar' | 'fr'

const STORAGE_KEY = 'corventa.language'

// ./<dil>/*.ts sözlük dosyaları derleme anında toplanır; aynı dildeki dosyalar birleştirilir.
const modules = import.meta.glob<{ default: Record<string, string> }>('./*/*.ts', { eager: true })
const DICTS: Partial<Record<LangCode, Record<string, string>>> = {}
for (const [path, mod] of Object.entries(modules)) {
  const lang = path.split('/')[1] as LangCode
  DICTS[lang] = { ...DICTS[lang], ...mod.default }
}

function readStored(): LangCode {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'tr' || v === 'en' || v === 'de' || v === 'ru' || v === 'ar' || v === 'fr') return v
  } catch {
    /* varsayılan */
  }
  return 'tr'
}

interface LangState {
  lang: LangCode
  setLang: (lang: LangCode) => void
}

export const useLangStore = create<LangState>((set) => ({
  lang: readStored(),
  setLang: (lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* depolama kapalı — bu oturumda geçerli */
    }
    set({ lang })
  },
}))

export type TVars = Record<string, string | number>

function format(s: string, vars?: TVars): string {
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}

export function translate(source: string, lang: LangCode, vars?: TVars): string {
  if (lang === 'tr') return format(source, vars)
  return format(DICTS[lang]?.[source] ?? source, vars)
}

/** Bileşen dışı (yardımcı fonksiyon, sabit) kullanım — o anki dili okur, re-render tetiklemez. */
export function t(source: string, vars?: TVars): string {
  return translate(source, useLangStore.getState().lang, vars)
}

/** Bileşenlerde: const t = useT() — dil değişince bileşen yeniden çizilir. */
export function useT(): (source: string, vars?: TVars) => string {
  const lang = useLangStore((s) => s.lang)
  return (source, vars) => translate(source, lang, vars)
}

/** Bu dilin sözlüğü var mı (Türkçe kaynak dil, hep hazır). */
export function hasDictionary(lang: LangCode): boolean {
  return lang === 'tr' || DICTS[lang] !== undefined
}

export function useLang(): LangCode {
  return useLangStore((s) => s.lang)
}

export { translateProgress } from './progress'
