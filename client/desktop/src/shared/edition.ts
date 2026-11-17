// STANDART SÜRÜM (2026-11-17) — uygulama sürümü (edition) için TEK kaynak. Sözleşme: docs/STANDART_SURUM.md (backend repo).
//
//   AI sürümü (varsayılan derleme)      → bugünkü davranış birebir.
//   Standart sürüm (CORVENTA_EDITION=standard ile derlenir) → geri esneme ölçümü / AI reçete / kalıp lisansı /
//                                         bulut ekranları yok; makine geometrik büker, operatör ölçüp düzeltir.
//
// Özellikler tek tek FEATURES bayraklarıyla açılır/kapanır — ileride Standart sürümde bir özellik açılmak
// istenirse sadece buradaki değer değiştirilir (kodda `IS_STANDARD` yerine mümkünse FEATURES.x kullanın).
// main, preload ve renderer'da aynı değer (electron.vite.config.ts `define: __CORVENTA_EDITION__`).

export type Edition = 'ai' | 'standard'

export const EDITION: Edition =
  typeof __CORVENTA_EDITION__ !== 'undefined' && __CORVENTA_EDITION__ === 'standard' ? 'standard' : 'ai'

export const IS_STANDARD = EDITION === 'standard'

/** Ekranda gösterilen sürüm adı (Türkçe kaynak metin — renderer'da t() ile çevrilir) */
export const EDITION_LABEL = IS_STANDARD ? 'STANDART' : 'YAPAY ZEKA'

/** Backend'e verilen değer (env `Corventa__Edition` → IConfiguration["Corventa:Edition"]) */
export const BACKEND_EDITION = IS_STANDARD ? 'Standard' : 'AI'

export interface EditionFeatures {
  /** Ana ekranda AI (tam otomatik) büküm — kapalıysa otomatik büküm 'semi' anlamında çalışır (skipAutoCorrect) */
  aiBending: boolean
  /** Büküm sonunda geri esneme ölçümü + otomatik düzeltme (SLPIS / GT2) */
  springbackMeasure: boolean
  /** AI reçete önizlemesi (benzer iş eşleşmesi, /api/bending-jobs/similar) */
  aiRecipe: boolean
  /** Bulut reçete paylaşımı / çekme (BIG DATA) */
  cloudRecipes: boolean
  /** Kalıp kodu / kalıp kütüphanesi / kalıp lisansı ekranları */
  moldLicense: boolean
  /** Bulut bağlantısı ekranı (aktivasyon, senkron, güncelleme) */
  cloud: boolean
  /** Yarı otomatik mod seçim ekranı (Manuel / Yarı Oto) */
  semiAutoSelect: boolean
  /** Standart sürüm metotları: sadece ÇEMBER açık; diğerleri (YAY / SPİRAL / SIVAMA) */
  arcBending: boolean
  spiralBending: boolean
  sivamaBending: boolean
  /** BÜKÜM SONUCU ekranı (ölç → düzelt / kaydet) + kayıtlı bükümler */
  manualResult: boolean
}

export const FEATURES: Readonly<EditionFeatures> = Object.freeze(
  IS_STANDARD
    ? {
        aiBending: false,
        springbackMeasure: false,
        aiRecipe: false,
        cloudRecipes: false,
        moldLicense: false,
        cloud: false,
        semiAutoSelect: false,
        arcBending: false,
        spiralBending: false,
        sivamaBending: false,
        manualResult: true,
      }
    : {
        aiBending: true,
        springbackMeasure: true,
        aiRecipe: true,
        cloudRecipes: true,
        moldLicense: true,
        cloud: true,
        semiAutoSelect: true,
        arcBending: true,
        spiralBending: true,
        sivamaBending: true,
        manualResult: false,
      },
)

/** Ana ekran OTOMATİK BÜKÜM'ün yazdığı mod: AI sürümünde 'ai', Standart'ta 'semi' (geri esneme düzeltmesi yok) */
export const AUTO_BENDING_MODE: 'ai' | 'semi' = FEATURES.aiBending ? 'ai' : 'semi'
