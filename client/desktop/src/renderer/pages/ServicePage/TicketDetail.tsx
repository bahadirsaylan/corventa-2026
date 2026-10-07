// SEKIL 33 / 37 / 41 — ticket detay + cevap + iki karar butonu.
// Type'a göre buton etiketleri ve aksiyon değişir.

import { useState } from 'react'

import type { ServiceTicket } from '@shared/types'

import { useUpdateTicketStatus, type TicketTypeStr } from '@/hooks/useService'

import CategoryBadge from './CategoryBadge'
import styles from './TicketDetail.module.css'

interface Props {
  ticket: ServiceTicket
  type: TicketTypeStr
  onClose: () => Promise<void>
}

export default function TicketDetail({ ticket, type, onClose }: Props) {
  const { update } = useUpdateTicketStatus()
  const [working, setWorking] = useState(false)
  const cfg = DETAIL_CONFIG[type]

  async function handleAction(action: 'in-progress' | 'resolved') {
    setWorking(true)
    try {
      await update(ticket.id, action)
      await onClose()
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className={styles.root}>
      {/* Intro */}
      <div className={styles.introRow}>
        <div className={styles.badgeWrap}>
          <CategoryBadge label={cfg.smallLabel} letter={cfg.letter} compact />
        </div>
        <div className={styles.intro}>{cfg.intro}</div>
      </div>

      {/* Ticket gövdesi */}
      <div className={styles.responseBox}>
        <div className={styles.responseHeader}>
          {ticket.code} - {ticket.title.toUpperCase()}
        </div>
        <div className={styles.responseBody}>
          {ticket.response ?? '(Henüz cevaplanmadı. Teknik ekibimiz size en kısa sürede dönüş yapacaktır.)'}
        </div>
      </div>

      {/* İki karar butonu */}
      <div className={styles.actionRow}>
        <button
          className={styles.dangerBtn}
          onClick={() => handleAction('in-progress')}
          disabled={working}
        >
          {cfg.continueBtn}
          {cfg.continueSub && <span className={styles.btnSub}>{cfg.continueSub}</span>}
        </button>
        <button
          className={styles.successBtn}
          onClick={() => handleAction('resolved')}
          disabled={working}
        >
          {cfg.resolveBtn}
        </button>
      </div>
    </div>
  )
}

interface DetailConfig {
  smallLabel: string
  letter: string
  intro: string
  continueBtn: string
  continueSub?: string
  resolveBtn: string
}

const DETAIL_CONFIG: Record<TicketTypeStr, DetailConfig> = {
  question: {
    smallLabel: 'SORU',
    letter: 'S',
    intro:
      'TEKNOLOJİNİN BİZE SUNDUĞU EN ÖNEMLİ DEĞER İLETİŞİMDİR. TAKILDIĞINIZ HER KONUDA BİLGİ VE TECRÜBEMİZLE SİZ DEĞERLİ MÜŞTERİLERİMİZE YARDIMCI OLMAYA ÇALIŞACAĞIZ.',
    continueBtn: 'SORUNUM DEVAM EDİYOR',
    continueSub: '( CANLI TEKNİK DESTEK TALEP EDİYORUM )',
    resolveBtn: 'SORUNUM ÇÖZÜLDÜ',
  },
  suggestion: {
    smallLabel: 'ÖNERİ',
    letter: 'Ö',
    intro:
      'SİZLERİN DEĞERLİ FİKİRLERİ BİZİM İÇİN ÇOK KIYMETLİDİR. GELECEĞİ FİKİRLER ŞEKİLLENDİRİR. ŞİRKET POLİTİKAMIZ GEREĞİ HER ÖNERİ DEĞERLENDİRİLEREK TARAFINIZA BİLGİLENDİRME YAPILACAKTIR.',
    continueBtn: 'TEKRAR DETAYLANDIR',
    continueSub: '( ANLAŞILMADIĞINI DÜŞÜNÜYORSAN YENİDEN DENE )',
    resolveBtn: 'ÖNERİYİ SONLANDIR',
  },
  complaint: {
    smallLabel: 'ŞİKAYET',
    letter: 'Ş',
    intro:
      'HER NE KADAR SORUNLAR MÜKEMMELLİYETİN BİR PARÇASI OLSA DA, OLUŞTURDUĞUMUZ MADURİYETTEN DOLAYI ÖZÜR DİLERİZ. GÖSTERMİŞ OLDUĞUNUZ ANLAYIŞ İÇİN TEŞEKKÜR EDERİZ.',
    continueBtn: 'SORUNUM DEVAM EDİYOR',
    continueSub: '( CANLI TEKNİK DESTEK TALEP EDİYORUM )',
    resolveBtn: 'SORUNUM ÇÖZÜLDÜ',
  },
}
