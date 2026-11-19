// 2026-11-20 (kullanıcı): STAGE, BÜKÜM DEĞERLERİ ONAYLANDIKTAN HEMEN SONRA alınır — parça konmadan önce.
// Eskiden KIVRIMI BAŞLAT'ta (parça topların üzerindeyken) yapılıyordu → parça düşebiliyordu.
// Ölçü ekranındaki ONAYLA'dan sonra bütün metotlar vals topu dizilimi ekranına gelir; ekran açılınca:
//   hedef stage (büküm akışıyla aynı kural, resolveTargetStage) → makine zaten o stage'de ve konumdaysa hiçbir şey,
//   değilse 5 sn geri sayım (StageMoveCountdown, VAZGEÇ) → stage geçişi. Bitene kadar ONAY kapalı.
// Vazgeçilirse / yapılamazsa / koşul yoksa (gönye, cetvel, motor) akış eskisi gibi büküm başlarken yapar.
// Parça sensörü BEKLENMEZ (kullanıcı: "koyarsa kendi bilir") — uyarı geri sayım penceresinde.

import { useCallback, useEffect, useState } from 'react'
import { isAtStage, resolveTargetStage } from '@/services/bendingOrchestrator'
import { awaitStageReturn, stageMoveAllowed } from '@/services/stageReturn'

export type EarlyStagePhase = 'checking' | 'countdown' | 'moving' | 'ready' | 'deferred'

export function useEarlyStage() {
  const [phase, setPhase] = useState<EarlyStagePhase>('checking')
  const [targetStage, setTargetStage] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await awaitStageReturn() // tahliye sonrası dönüş sürüyorsa önce o bitsin
        const target = await resolveTargetStage()
        if (!alive) return
        setTargetStage(target)
        if (await isAtStage(target)) setPhase('ready')
        else if (stageMoveAllowed()) setPhase('countdown')
        else setPhase('deferred')
      } catch {
        if (alive) setPhase('deferred')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const run = useCallback(async () => {
    if (targetStage == null) return
    setPhase('moving')
    try {
      await window.corventa.bending.applyStage({ targetStage, speedPercent: 50 })
      setPhase('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setPhase('deferred')
    }
  }, [targetStage])

  const cancel = useCallback(() => setPhase('deferred'), [])
  const busy = phase === 'checking' || phase === 'countdown' || phase === 'moving'
  return { phase, targetStage, error, clearError: () => setError(null), run, cancel, busy }
}
