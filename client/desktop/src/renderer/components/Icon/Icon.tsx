// Ortak ikon bileşeni — endüstriyel çizgi ikon standardı (lucide-react).
//   - Renk her zaman currentColor: ikon, içinde bulunduğu metnin/butonun rengini alır.
//   - Çizgi kalınlığı varsayılan 2.25 (kiosk ekranında uzaktan okunur, eldivenli kullanım).
//   - Boyut token'ları: xs 14 · sm 16 · md 20 · lg 24 · xl 32 · xxl 48 · hero 64; 'text' = 1.15em (metinle aynı boy).
//   - label verilmezse dekoratiftir (aria-hidden). Sadece ikon olan butonda aria-label BUTONA verilir.

import type { ReactNode } from 'react'
import type { LucideProps } from 'lucide-react'
import { ICONS, type IconName } from './icons'
import styles from './Icon.module.css'

export const ICON_SIZES = { xs: 14, sm: 16, md: 20, lg: 24, xl: 32, xxl: 48, hero: 64 } as const
export const ICON_STROKE = 2.25

export type IconSizeToken = keyof typeof ICON_SIZES | 'text'
export type IconSize = IconSizeToken | number

export interface IconProps extends Omit<LucideProps, 'ref' | 'size'> {
  name: IconName
  /** Token (xs…hero, 'text') veya piksel. Varsayılan md (20). */
  size?: IconSize
  /** Ekran okuyucu etiketi — sadece ikon tek başına anlam taşıyorsa (butonda değil). */
  label?: string
}

function resolveSize(size: IconSize): number | string {
  if (typeof size === 'number') return size
  if (size === 'text') return '1.15em'
  return ICON_SIZES[size]
}

export function Icon({ name, size = 'md', strokeWidth = ICON_STROKE, label, className, ...rest }: IconProps) {
  const Glyph = ICONS[name]
  return (
    <Glyph
      size={resolveSize(size)}
      strokeWidth={strokeWidth}
      className={className ? `${styles.icon} ${className}` : styles.icon}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      focusable={false}
      {...rest}
    />
  )
}

export interface IconLabelProps {
  icon: IconName
  children?: ReactNode
  size?: IconSize
  /** İkon metnin sağında mı (ör. "TÜM RAPORLAR →") */
  trailing?: boolean
  className?: string
  iconClassName?: string
}

/** İkon + metin satırı (inline-flex, ortalı, 0.4em boşluk). Butonun/başlığın İÇİNE konur. */
export function IconLabel({ icon, children, size = 'text', trailing = false, className, iconClassName }: IconLabelProps) {
  const glyph = <Icon name={icon} size={size} className={iconClassName} />
  return (
    <span className={className ? `${styles.label} ${className}` : styles.label}>
      {!trailing && glyph}
      {children != null && <span>{children}</span>}
      {trailing && glyph}
    </span>
  )
}
