// SEKIL-51-TG — Yeni servis talebi oluşturma.
// Müşteri makina kimliği zaten DataApi'den makina ayarlarına gelecek;
// şimdilik SettingsPage'deki gibi sabit placeholder. İleride MachineSettings dinamik gelir.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  ServicePurpose,
  type ServiceRequestCreateRequest,
} from '@shared/types'

import { useCreateServiceRequest } from '@/hooks/useService'

import ServicePageShell from './ServicePageShell'
import styles from './ServiceRequestFormPage.module.css'

export default function ServiceRequestFormPage() {
  const navigate = useNavigate()
  const { create, submitting, error } = useCreateServiceRequest()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [purpose, setPurpose] = useState<ServicePurpose>(ServicePurpose.ArizaGiderme)
  // İleride MachineSettings'ten dinamik gelecek — şimdilik sabit
  const [customerName] = useState('SERSOVİS A.Ş.')

  async function handleSubmit() {
    if (!title.trim() || !description.trim()) return
    const req: ServiceRequestCreateRequest = {
      customerName: customerName.trim(),
      customerAddress: '40.198517, 28.836939',
      machineModel: '4R CPB MIDI',
      machineProductionYear: '10.2020',
      machineCode: '2010-400-001',
      machineVeAiCode: 'A-400-001',
      purpose,
      problemDescription: `${title.trim()}\n\n${description.trim()}`,
    }
    const created = await create(req)
    if (created) navigate('/service/requests')
  }

  return (
    <ServicePageShell title="YENİ SERVİS TALEBİ" onBack={() => navigate('/service/requests')}>
      <div className={styles.root}>
        {/* Amaç seçimi */}
        <div className={styles.purposeBox}>
          <span className={styles.purposeLabel}>SERVİSİN AMACI :</span>
          <div className={styles.purposeRow}>
            {(
              [
                [ServicePurpose.ArizaGiderme, 'ARIZA GİDERME'],
                [ServicePurpose.GenelBakim, 'GENEL BAKIM'],
                [ServicePurpose.AgirBakim, 'AĞIR BAKIM'],
                [ServicePurpose.Kurulum, 'KURULUM'],
                [ServicePurpose.Egitim, 'EĞİTİM'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                className={[
                  styles.purposeBtn,
                  purpose === val ? styles.purposeBtnActive : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setPurpose(val)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Talep gövdesi */}
        <div className={styles.formBox}>
          <input
            type="text"
            className={styles.titleInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="TALEBİN BAŞLIĞINI GİRİNİZ..."
            maxLength={200}
          />
          <textarea
            className={styles.descInput}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="TALEBİNİZİN DETAYINI YAZINIZ..."
            maxLength={2000}
          />
        </div>

        {error && <div className={styles.errorBox}>Hata: {error}</div>}

        {/* Aksiyon */}
        <div className={styles.actionRow}>
          <button
            className={styles.cancelBtn}
            onClick={() => navigate('/service/requests')}
            disabled={submitting}
          >
            GERİ DÖN
          </button>
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !description.trim()}
          >
            TALEBİ GÖNDER
          </button>
        </div>
      </div>
    </ServicePageShell>
  )
}
