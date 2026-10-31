// Semantik ikon eşleme tablosu — UI'da ikon ADI ile değil ANLAMI ile seçilir (Icon name="warning").
// Kaynak: lucide-react@1.56.0 (ISC lisans). Buradaki tüm adlar paket tip tanımından doğrulandı.
// Yeni ikon gerekiyorsa önce buraya semantik bir ad ekle; bileşenlerde lucide'yi doğrudan import etme.

import {
  ArrowBigDown,
  ArrowBigLeft,
  ArrowBigRight,
  ArrowBigUp,
  ArrowBigUpDash,
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  Award,
  BadgeDollarSign,
  Bot,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  CircleQuestionMark,
  CircleX,
  ClipboardList,
  ClipboardPen,
  Cpu,
  Delete,
  Download,
  Gift,
  Globe,
  Hand,
  HardHat,
  Headset,
  House,
  Info,
  Keyboard,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Minus,
  OctagonX,
  Play,
  Plus,
  RefreshCw,
  Repeat,
  RotateCcw,
  RotateCw,
  Search,
  Settings,
  SkipForward,
  Sparkles,
  Square,
  Star,
  TriangleAlert,
  User,
  Wifi,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'

export const ICONS = {
  // ── Durum ────────────────────────────────────────────
  warning: TriangleAlert, // ⚠  uyarı (sarı/amber)
  error: CircleAlert, //     hata mesajı başlığı
  blocked: OctagonX, //      ⛔ engellendi / kritik
  emergency: OctagonX, //    acil durdurma
  success: CircleCheck, //   ✓ tamamlandı (rozet / sonuç kartı)
  check: Check, //        ✓ satır içi onay işareti (checkbox, buton)
  failure: CircleX, //       ✕ başarısız sonuç kartı
  info: Info,
  help: CircleQuestionMark, // "?" bilgi butonu

  // ── Eylem ────────────────────────────────────────────
  close: X, //               ✕ kapat
  confirm: Check, //      ✓ ONAYLA
  cancel: X,
  play: Play, //             ▶ DEVAM / başlat
  stop: Square, //           ■ / ⏹ durdur / iptal
  skip: SkipForward, //      ⏭ atla
  reset: RotateCcw, //       ↺ SIFIRLA
  reference: RefreshCw, //   ↻ GÖNYE AL
  reverse: RefreshCw, //     🔄 ters sıra
  repeat: Repeat, //         ↻ tekrar izle
  search: Search, //         🔍
  download: Download, //     ↓ dışa aktar
  send: Mail, //             ✉ kod gönder
  edit: ClipboardPen,
  plus: Plus,
  minus: Minus,

  // ── Yön / gezinme ────────────────────────────────────
  back: ArrowLeft, //        ← geri
  next: ArrowRight, //       → ileri / devam bağlantısı
  up: ArrowUp,
  down: ArrowDown,
  chevronLeft: ChevronLeft, //   ◀ küçük ok
  chevronRight: ChevronRight, // ▶ küçük ok
  chevronUp: ChevronUp, //       ▲ sıralama yukarı
  chevronDown: ChevronDown, //   ▼ / ▾ açılır liste
  jogLeft: ArrowBigLeft, //      ◀ büyük basılı-tut hareket
  jogRight: ArrowBigRight, //    ▶
  jogUp: ArrowBigUp, //          ▲
  jogDown: ArrowBigDown, //      ▼
  rotateCw: RotateCw, //         ↻ CW
  rotateCcw: RotateCcw, //       ↺ CCW
  swap: ArrowLeftRight, //       ↔ takas
  home: House,

  // ── Klavye ───────────────────────────────────────────
  backspace: Delete, //      ⌫
  shift: ArrowBigUp, //      ⇧
  capsLock: ArrowBigUpDash, // ⇪
  keyboard: Keyboard, //     ⌨
  language: Globe, //        🌐

  // ── Alan / nesne ─────────────────────────────────────
  settings: Settings,
  maintenance: Wrench, //    🔧
  technician: HardHat, //    🧑‍🔧 usta / yarı oto
  user: User,
  lock: Lock,
  mail: Mail,
  clipboard: ClipboardList, // 📋 log / ilk büküm
  ai: Cpu, //                🤖 AI kontrol
  bot: Bot,
  energy: Zap, //            ⚡ hızlandırma
  sale: BadgeDollarSign, //  💰
  gift: Gift, //             🎁
  service: Headset,
  logout: LogOut,
  hand: Hand,
  signal: Wifi,
  dashboard: LayoutDashboard,
  star: Star,
  sparkle: Sparkles, //      ✦
  award: Award,
} as const satisfies Record<string, LucideIcon>

export type IconName = keyof typeof ICONS

