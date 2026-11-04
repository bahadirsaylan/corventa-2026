// Eğitim konuları + sınav stub'ı. Şimdilik frontend constants;
// ileride EducationProgress entity + DataApi/Cloud üzerinden dinamikleşecek.
// Hook layer (useTrainingTopics) bu listeyi soyutlar — bileşenler değişmez.

export type QuizQuestionType = 'yes-no' | 'multiple-choice'

export interface QuizQuestion {
  id: string
  type: QuizQuestionType
  prompt: string
  /** yes-no için ['HAYIR','EVET'], multiple-choice için 4 cevap */
  options: string[]
  /** options dizisindeki doğru cevap index'i */
  correctIndex: number
}

export interface TrainingTopic {
  id: string
  title: string
  /** Anlatım metni — SEKIL-44 gibi A/B/C başlıklı bilgi */
  bodySections: { heading: string; text: string }[]
  questions: QuizQuestion[]
}

export const TRAINING_TOPICS: TrainingTopic[] = [
  {
    id: 'bending-basics',
    title: 'KIVRIM ESASLARI VE MALZEME SEÇİMİ',
    bodySections: [
      {
        heading: 'A',
        text: 'KIVRIM İÇ ÇAPIDIR. KIVRIM ESNASINDA MALZEME İÇ YAPISI ORANINDA SIKIŞMAYA İZİN VERİR. ET KALINLIĞI DÜŞÜK MALZEMELERDE KIVRIM ÇAPI KÜÇÜLDÜKÇE MARULLAMA GÖRÜLEBİLİR.',
      },
      {
        heading: 'B',
        text: 'KIVRIM DIŞ ÇAPIDIR. KIVRIM ESNASINDA MALZEME İÇ YAPISI ORANINDA UZAMAYA İZİN VERİR. ET KALINLIĞI DÜŞÜK MALZEMELERDE KIVRIM ÇAPI KÜÇÜLDÜKÇE DÜZLEŞMELER VE ÇÖKMELER GÖRÜLEBİLİR.',
      },
      {
        heading: 'C',
        text: 'KIVRIM MERKEZİDİR. UZAMA GÖZLENMEZ.',
      },
    ],
    questions: [
      {
        id: 'q1',
        type: 'yes-no',
        prompt: 'KIVRIM İÇ ÇAPI "A" OLARAK İFADE EDİLİR Mİ?',
        options: ['HAYIR', 'EVET'],
        correctIndex: 1,
      },
      {
        id: 'q2',
        type: 'multiple-choice',
        prompt: 'AŞAĞIDAKİLERDEN HANGİSİ KIVRIM MERKEZİNİ İFADE EDER?',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 2,
      },
      {
        id: 'q3',
        type: 'yes-no',
        prompt: 'KIVRIM ESNASINDA "B" UZAMAYA İZİN VERİR Mİ?',
        options: ['HAYIR', 'EVET'],
        correctIndex: 1,
      },
      {
        id: 'q4',
        type: 'multiple-choice',
        prompt: 'ET KALINLIĞI DÜŞÜK MALZEMEDE KIVRIM ÇAPI KÜÇÜLDÜKÇE "A" YÖNÜNDE NE GÖZLENİR?',
        options: ['UZAMA', 'ÇÖKMELER', 'MARULLAMA', 'HİÇBİRİ'],
        correctIndex: 2,
      },
    ],
  },
]

export function getTrainingTopic(id: string): TrainingTopic | undefined {
  return TRAINING_TOPICS.find((t) => t.id === id)
}
