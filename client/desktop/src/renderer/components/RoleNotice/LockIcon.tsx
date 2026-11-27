// Kilit simgesi — yetkisiz işlem göstergesi. Ortak ikon modülüne bağlı (lucide "Lock", currentColor).
// Dış API korunur: <LockIcon className=... /> — boyut çağıranın CSS'inden (width/height) gelir.

import { Icon } from '@/components/Icon'

export function LockIcon({ className }: { className?: string }) {
  return <Icon name="lock" className={className} />
}
