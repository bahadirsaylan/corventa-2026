// UYARI KAYITLARI (2026-11-19) — uyarı penceresinde / şeritte basılan düğmeyi DataApi'ye yaz.
// Fire-and-forget: ekran hiç beklemez. DataApi'ye anlık ulaşılamazsa 3 kez tekrar dener (5 / 15 / 30 sn).
// Mesaj TÜRKÇE yazılır (kayıt dili ekran dilinden bağımsız — ispat metni sabit kalsın).
// Kullanıcı / rol DataApi'de oturumdan alınır; burada gönderilmez.

import type { AlertAckCreateBody } from '@shared/types/alert-ack'
import { useMachineStateStore } from '@/stores/machineStateStore'
import { alertSessionId, alertShownAt } from '@/stores/alertQueueStore'

const RETRY_DELAYS_MS = [5_000, 15_000, 30_000]

/** Kayda eklenen küçük makine durumu (kirlilik bitleri + yağ) */
export function alertMachineStateJson(): string {
  const { state } = useMachineStateStore.getState()
  return JSON.stringify({
    k1: state.safety.contaminationK1,
    k2: state.safety.contaminationK2,
    k3: state.safety.contaminationK3,
    oilTempC: state.sensors.oilTempC,
    oilLevelPercent: state.sensors.oilLevelPercent,
    oilHumidityPercent: state.sensors.oilHumidityPercent,
    motor: state.hydraulicMotorState,
  })
}

export interface AlertAckInput extends Omit<AlertAckCreateBody, 'sessionId' | 'shownAt' | 'machineStateJson'> {
  /** Kuyruk yuvası — verilirse shownAt kuyruğun ilk gösterim anından alınır */
  slotId?: string
  shownAt?: string | null
}

export function logAlertAck(input: AlertAckInput): void {
  const { slotId, ...rest } = input
  const body: AlertAckCreateBody = {
    ...rest,
    shownAt: rest.shownAt ?? (slotId ? alertShownAt(slotId) : new Date().toISOString()),
    sessionId: alertSessionId(),
    machineStateJson: alertMachineStateJson(),
  }
  const send = (attempt: number): void => {
    window.corventa.service.ackAlert(body).catch((err: unknown) => {
      const status = (err as { status?: number } | null)?.status
      // 400 / 401 / 403 tekrar denemeyle düzelmez
      if (status === 400 || status === 401 || status === 403 || attempt >= RETRY_DELAYS_MS.length) {
        console.warn('Uyarı kaydı yazılamadı', err)
        return
      }
      setTimeout(() => send(attempt + 1), RETRY_DELAYS_MS[attempt])
    })
  }
  send(0)
}
