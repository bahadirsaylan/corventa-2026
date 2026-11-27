// STANDART SÜRÜM (2026-11-17) — electron.vite.config.ts `define` ile derleme anında yerine konan sabit.
// Doğrudan kullanmayın; src/shared/edition.ts (EDITION / IS_STANDARD / FEATURES) üzerinden okuyun.
declare const __CORVENTA_EDITION__: 'ai' | 'standard'
/** 2026-11-19: true = tek dosya DEMO paketi (package:demo*) — demoBoot.ts */
declare const __CORVENTA_DEMO_BUILD__: boolean
