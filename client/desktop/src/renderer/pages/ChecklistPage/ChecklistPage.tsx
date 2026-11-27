import { useCloudConfig, useCloudConfigStore } from '@/stores/cloudConfigStore'
import ChecklistForm from './ChecklistForm'
import { LOCAL_TEMPLATE } from './checklistShared'
import styles from './ChecklistPage.module.css'

// Bulut v2 (BULUT_API_V2.md §1 madde 47): bulutta checklist şablonu varsa o, yoksa yerleşik günlük check list.
// 2026-11-16: iki durumda da aynı form (ChecklistForm) — madde başına onaylayan + zaman, SERİ DIŞI notu / kod no,
// sonuç DataApi'ye kaydedilir (yerel şablon buluta gönderilmez) ve GEÇMİŞ ekranında görülür.
export default function ChecklistPage() {
  const template = useCloudConfig()?.checklistTemplate
  const loaded = useCloudConfigStore((s) => s.loaded)
  // İlk yükleme (≈ anlık IPC) bitmeden yerel listeyi gösterip sonra buluta zıplamasın
  if (!loaded) return <div className={styles.page} />
  const tpl = template && template.items?.length ? template : LOCAL_TEMPLATE
  // key: şablon değişirse taslak state'i yeniden okunsun
  return <ChecklistForm key={`${tpl.id}.v${tpl.version}`} template={tpl} />
}
