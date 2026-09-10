// SEKIL 34 / 38 / 42 — Yeni Soru/Öneri/Şikayet oluşturma formu.
// Başlık + gövde + İPTAL/GÖNDER. Endüstriyel klavye için KeyboardModal pattern'i kullanılabilir
// ama bu sürümde standart textarea ile gidiyoruz (Electron focus + on-screen klavye OS seviyesi).

import { useState } from 'react'

import { useCreateTicket, type TicketTypeStr } from '@/hooks/useService'

import CategoryBadge from './CategoryBadge'
import styles from './TicketCompose.module.css'

interface Props {
  type: TicketTypeStr
  onClose: (created: boolean) => Promise<void>
}

export default function TicketCompose({ type, onClose }: Props) {
  const { create, submitting, error } = useCreateTicket(type)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const cfg = COMPOSE_CONFIG[type]

  const titlePlaceholder = title.length === 0 ? cfg.titlePlaceholder : ''
  const bodyPlaceholder = body.length === 0 ? cfg.bodyPlaceholder : ''

  async function handleSubmit() {
    if (!title.trim() || !body.trim()) return
    const created = await create({ title: title.trim(), body: body.trim() })
    if (created) await onClose(true)
  }

  async function handleCancel() {
    await onClose(false)
  }

  return (
    <div className={styles.root}>
      <div className={styles.introRow}>
        <div className={styles.badgeWrap}>
          <CategoryBadge label={cfg.smallLabel} letter={cfg.letter} compact />
        </div>
        <div className={styles.intro}>{cfg.intro}</div>
      </div>

      <div className={styles.formBox}>
        <div className={styles.formHeader}>
          <span className={styles.formCode}>{cfg.codePreview}</span>
          <input
            type="text"
            className={styles.titleInput}
            placeholder={titlePlaceholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={300}
          />
        </div>
        <textarea
          className={styles.bodyInput}
          placeholder={bodyPlaceholder}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={4000}
        />
      </div>

      {error && <div className={styles.errorBox}>Hata: {error}</div>}

      <div className={styles.actionRow}>
        <button
          className={styles.cancelBtn}
          onClick={handleCancel}
          disabled={submitting}
        >
          İPTAL
        </button>
        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !body.trim()}
        >
          GÖNDER
          <span className={styles.btnSub}>(TAHMİNİ GERİ DÖNÜŞ 2 SAAT)</span>
        </button>
      </div>
    </div>
  )
}

interface ComposeConfig {
  smallLabel: string
  letter: string
  intro: string
  codePreview: string
  titlePlaceholder: string
  bodyPlaceholder: string
}

// Kod önizleme — backend gerçek kodu createTicket sonrası üretir.
// Bu UI'da sadece UX hissi için sabit format gösteriyoruz.
function makeCodePreview(prefix: string): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  return `${prefix}.${yy}.${mm}.???`
}

const COMPOSE_CONFIG: Record<TicketTypeStr, ComposeConfig> = {
  question: {
    smallLabel: 'SORU',
    letter: 'S',
    intro:
      'TEKNOLOJİNİN BİZE SUNDUĞU EN ÖNEMLİ DEĞER İLETİŞİMDİR. TAKILDIĞINIZ HER KONUDA BİLGİ VE TECRÜBEMİZLE SİZ DEĞERLİ MÜŞTERİLERİMİZE YARDIMCI OLMAYA ÇALIŞACAĞIZ.',
    codePreview: makeCodePreview('S'),
    titlePlaceholder: 'LÜTFEN SORU BAŞLIĞINI GİRİNİZ...',
    bodyPlaceholder: 'SORACAĞINIZ KONUYU KISACA ÖZETLEYEBİLİR MİSİNİZ?',
  },
  suggestion: {
    smallLabel: 'ÖNERİ',
    letter: 'Ö',
    intro:
      'SİZLERİN DEĞERLİ FİKİRLERİ BİZİM İÇİN ÇOK KIYMETLİDİR. GELECEĞİ FİKİRLER ŞEKİLLENDİRİR. ŞİRKET POLİTİKAMIZ GEREĞİ HER ÖNERİ DEĞERLENDİRİLEREK TARAFINIZA BİLGİLENDİRME YAPILACAKTIR.',
    codePreview: makeCodePreview('Ö'),
    titlePlaceholder: 'LÜTFEN ÖNERİNİZİN BAŞLIĞINI GİRİNİZ...',
    bodyPlaceholder: 'ÖNERİNİZİN KONUSUNU KISACA ÖZETLEYEBİLİR MİSİNİZ?',
  },
  complaint: {
    smallLabel: 'ŞİKAYET',
    letter: 'Ş',
    intro:
      'HER NE KADAR SORUNLAR MÜKEMMELLİYETİN BİR PARÇASI OLSA DA, OLUŞTURDUĞUMUZ MADURİYETTEN DOLAYI ÖZÜR DİLERİZ. GÖSTERMİŞ OLDUĞUNUZ ANLAYIŞ İÇİN TEŞEKKÜR EDERİZ.',
    codePreview: makeCodePreview('Ş'),
    titlePlaceholder: 'LÜTFEN ŞİKAYETİNİZİN BAŞLIĞINI GİRİNİZ...',
    bodyPlaceholder: 'ŞİKAYETİNİZİN KONUSUNU KISACA ÖZETLEYEBİLİR MİSİNİZ?',
  },
}
