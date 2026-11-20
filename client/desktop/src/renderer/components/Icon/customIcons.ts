// Corventa'ya özel çizgi ikonlar (2026-11-17) — lucide ile AYNI ızgara (24×24), currentColor, round uç/birleşim;
// createLucideIcon ile üretilir → <Icon> size / strokeWidth ayarları lucide ikonlarıyla birebir aynı çalışır.

import { createLucideIcon } from 'lucide-react'

/**
 * OTOMATİK BÜKÜM — çember büküm: bükülen profil halkası aynı zamanda dairesel ok (otomatik çevrim),
 * halkanın içinde üst (merkez) top, altında iki yan top. Toplar profile değmez gibi küçük boşlukla çizilir
 * (çizgiler kaynaşıp leke olmasın). Standart sürümde ana ekran OTOMATİK BÜKÜM ve "OTOMATİK MOD" başlıkları.
 */
export const AutoBend = createLucideIcon('corventa-auto-bend', [
  // Profil halkası + ok ucu (lucide rotate-cw oranları)
  ['path', { d: 'M19.4 9.2a7.4 7.4 0 1 1-2.167-5.233L18.08 4.82', key: 'ring' }],
  ['path', { d: 'M18.08 1.82v3h-3', key: 'ring-head' }],
  // Üst (merkez) top — halkanın içinde
  ['circle', { cx: '12', cy: '12.5', r: '2.1', key: 'roll-top' }],
  // Yan toplar — halkanın dışında, altta
  ['circle', { cx: '5.23', cy: '18.86', r: '2.4', key: 'roll-left' }],
  ['circle', { cx: '18.77', cy: '18.86', r: '2.4', key: 'roll-right' }],
])
