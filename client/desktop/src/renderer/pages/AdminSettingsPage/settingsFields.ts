// Ayar ekranlarının alan tanımları. Anahtarlar Bending API MachineSettings / GonyeSettings / Stage
// JSON alanlarıyla (camelCase) birebir aynı. Aralıklar backend doğrulamasıyla uyumlu tutuldu
// (SettingsController.Validate*) — ekran daha dar sınır koyabilir, daha geniş koyamaz.

import type { FieldDef, SectionDef } from '@/components/SettingsForm/SettingsForm'

const UNUSED = 'Kayıt amaçlı — şu an hesapta kullanılmıyor.'

export const MACHINE_SECTIONS: { tab: string; sections: SectionDef[] }[] = [
  {
    tab: 'PİSTON & EKSEN',
    sections: [
      {
        title: 'PİSTON STROKLARI',
        note: 'Fiziksel kurs boyları. Güvenli geri limit ve fiziksel konum takibi bu değerlerle yapılır.',
        fields: [
          { key: 'leftPistonStrokeMm', label: 'SOL PİSTON STROK', unit: 'mm', min: 1, max: 1000 },
          { key: 'rightPistonStrokeMm', label: 'SAĞ PİSTON STROK', unit: 'mm', min: 1, max: 1000 },
          { key: 'upperPistonStrokeMm', label: 'ÜST PİSTON STROK', unit: 'mm', min: 1, max: 1000 },
          { key: 'lowerPistonStrokeMm', label: 'ALT PİSTON STROK', unit: 'mm', min: 1, max: 1000 },
        ],
      },
      {
        title: 'ENCODER MAKSİMUM DEĞERLERİ',
        note: 'Kayıt amaçlı — PLC pozisyon ölçeklemesini kendi parametreleriyle yapar.',
        fields: [
          { key: 'leftPistonMaxReg', label: 'SOL PİSTON MAX REGISTER', min: 1, max: 65535, integer: true },
          { key: 'rightPistonMaxReg', label: 'SAĞ PİSTON MAX REGISTER', min: 1, max: 65535, integer: true },
          { key: 'upperPistonMaxReg', label: 'ÜST PİSTON MAX REGISTER', min: 1, max: 65535, integer: true },
          { key: 'lowerPistonMaxReg', label: 'ALT PİSTON MAX REGISTER', min: 1, max: 65535, integer: true },
        ],
      },
      {
        title: 'PNÖMATİK VE ROTASYON',
        fields: [
          { key: 'pneumaticStrokeMm', label: 'PNÖMATİK STROK', unit: 'mm', min: 1, max: 1000, desc: UNUSED },
          { key: 'pneumaticMaxReg', label: 'PNÖMATİK MAX REGISTER', min: 1, max: 65535, integer: true, desc: UNUSED },
          { key: 'rollerDiameterMm', label: 'VALS ÇAPI', unit: 'mm', min: 1, max: 1000, desc: UNUSED },
          { key: 'rotationEncoderPpr', label: 'ROTASYON ENCODER PPR', min: 1, max: 100000, integer: true, desc: UNUSED },
        ],
      },
    ],
  },
  {
    tab: 'BÜKÜM',
    sections: [
      {
        title: 'BÜKÜM GEOMETRİSİ',
        note: 'Bu değerler piston hedef hesabını doğrudan değiştirir. Sahada ölçülmeden değiştirmeyin.',
        fields: [
          { key: 'defaultBallDiameterMm', label: 'TOP ÇAPI', unit: 'mm', min: 1, max: 1000 },
          { key: 'defaultCenterDistanceMm', label: 'EKSEN MESAFESİ (NORMAL)', unit: 'mm', min: 1, max: 2000, desc: 'Sol-sağ top arası. Arc Normal / Ters Normal segmentler.' },
          { key: 'centerDistanceMiddleRadiusMm', label: 'EKSEN MESAFESİ (RADIUS ORTADA)', unit: 'mm', min: 1, max: 2000, nullable: true, desc: 'Arc Middle segmentler. Boş = normal eksen mesafesi kullanılır.' },
          { key: 'defaultThetaDeg', label: 'THETA AÇISI', unit: '°', min: 0, max: 180 },
          { key: 'defaultXA1', label: 'VARSAYILAN XA1', unit: 'mm', min: -5000, max: 5000, negative: true, desc: 'Stage\'de XA1 tanımlı değilse kullanılır.' },
          { key: 'defaultYA1', label: 'VARSAYILAN YA1', unit: 'mm', min: -5000, max: 5000, negative: true, desc: 'Stage\'de YA1 tanımlı değilse kullanılır.' },
        ],
      },
      {
        title: 'İŞ VARSAYILANLARI',
        fields: [
          { key: 'defaultSafetyMarginMm', label: 'PARÇA UÇ GÜVENLİK PAYI', unit: 'mm', min: 0, max: 1000, desc: 'İş kaydında güvenlik payı girilmezse kullanılır.' },
          { key: 'defaultPistonSpeedPercent', label: 'PİSTON HIZI', unit: '%', min: 1, max: 100, integer: true },
          { key: 'defaultRotationSpeedPercent', label: 'ROTASYON HIZI', unit: '%', min: 1, max: 100, integer: true },
          {
            type: 'select',
            key: 'defaultActiveSensorSide',
            label: 'VARSAYILAN SENSÖR TARAFI',
            options: [
              { value: 'Left', label: 'SOL' },
              { value: 'Right', label: 'SAĞ' },
            ],
          },
        ],
      },
    ],
  },
  {
    tab: 'SIKIŞTIRMA',
    sections: [
      {
        title: 'PARÇA SIKIŞTIRMA',
        fields: [
          { key: 'defaultClampPressureBar', label: 'SIKIŞTIRMA BASINCI', unit: 'bar', min: 0, max: 300, integer: true, desc: 'Hedef üst top kursunun dışına düşen işlerde basınç modu hedefi.' },
          { key: 'upperLowerCenterDistanceMm', label: 'ÜST-ALT TOP MERKEZ MESAFESİ', unit: 'mm', min: 1, max: 2000, desc: 'Sıkıştırma pozisyon hesabı (üst piston en üstte, alt mekanik limitte).' },
          { key: 'clampOverpressMm', label: 'SIKIŞTIRMA EKSTRA BASKI', unit: 'mm', min: 0, max: 10 },
        ],
      },
      {
        title: 'ÇEMBER — BOŞLUK ALMA',
        fields: [
          { key: 'circularSlackDistanceMm', label: 'BOŞLUK ALMA MESAFESİ', unit: 'mm', min: 0, max: 10, desc: '0 = basınç modu.' },
          { key: 'circularSlackPressureBar', label: 'BOŞLUK ALMA BASINCI', unit: 'bar', min: 0, max: 300, integer: true },
          { key: 'circularAdaptiveInitialSlackDistanceMm', label: 'PASO 1 ÖNCESİ BOŞLUK', unit: 'mm', min: 0, max: 10, nullable: true, desc: 'Boş = boşluk alma mesafesi kullanılır.' },
        ],
      },
      {
        title: 'ÇOK AÇILI — BOŞLUK ALMA',
        fields: [
          { key: 'arcSlackDistanceMm', label: 'BOŞLUK ALMA MESAFESİ', unit: 'mm', min: 0, max: 10, desc: '0 = basınç modu.' },
          { key: 'arcSlackPressureBar', label: 'BOŞLUK ALMA BASINCI', unit: 'bar', min: 0, max: 300, integer: true },
          { key: 'arcAdaptiveInitialSlackDistanceMm', label: 'İLK SEGMENT PASO 1 ÖNCESİ BOŞLUK', unit: 'mm', min: 0, max: 10, nullable: true, desc: 'Boş = boşluk alma mesafesi kullanılır.' },
        ],
      },
      {
        title: 'DİĞER METOTLAR — BOŞLUK ALMA',
        fields: [
          { key: 'defaultSlackDistanceMm', label: 'BOŞLUK ALMA MESAFESİ', unit: 'mm', min: 0, max: 10 },
          { key: 'defaultSlackPressureBar', label: 'BOŞLUK ALMA BASINCI', unit: 'bar', min: 0, max: 300, integer: true },
          { key: 'adaptiveInitialSlackDistanceMm', label: 'PASO 1 ÖNCESİ BOŞLUK', unit: 'mm', min: 0, max: 10, nullable: true },
        ],
      },
    ],
  },
  {
    tab: 'ÖLÇÜM & SENSÖR',
    sections: [
      {
        title: 'GERİ ESNEME ÖLÇÜMÜ',
        fields: [
          { key: 'defaultToleranceMm', label: 'GERİ ESNEME TOLERANSI', unit: 'mm', min: 0.01, max: 500 },
          { key: 'minMeasurableArcLengthMm', label: 'ÖLÇÜLEBİLİR EN KISA YAY', unit: 'mm', min: 0, max: 10000, nullable: true, desc: 'Boş = eşik yok.' },
          { key: 'defaultMeasurementDistanceMm', label: 'ÖLÇÜM MESAFESİ (T)', unit: 'mm', min: 1, max: 10000, desc: UNUSED },
        ],
      },
      {
        title: 'YARIÇAP SENSÖRLERİ (GT2)',
        fields: [
          { key: 'radiusSensorMmPerPulse', label: 'PULSE BAŞINA MM', unit: 'mm', min: 0.000001, max: 1 },
          { key: 'radiusSensorStrokeMm', label: 'SENSÖR STROK', unit: 'mm', min: 0.1, max: 100, desc: UNUSED },
          { key: 'leftRadiusSensorZeroOffsetMm', label: 'SOL SENSÖR SIFIR OFSETİ', unit: 'mm', min: -1000, max: 1000, negative: true },
          { key: 'rightRadiusSensorZeroOffsetMm', label: 'SAĞ SENSÖR SIFIR OFSETİ', unit: 'mm', min: -1000, max: 1000, negative: true },
        ],
      },
      {
        title: 'SLPIS (ESKİ SENSÖR)',
        fields: [
          { key: 'slpisZeroOffsetMm', label: 'SLPIS SIFIR OFSETİ', unit: 'mm', min: -1000, max: 1000, negative: true },
          { key: 'slpisLMm', label: 'SLPIS L', unit: 'mm', min: 0.01, max: 1000 },
          { key: 'slpisRulmanCapMm', label: 'SLPIS RULMAN ÇAPI', unit: 'mm', min: 0.01, max: 1000 },
        ],
      },
    ],
  },
  {
    tab: 'GÜVENLİK & SİSTEM',
    sections: [
      {
        title: 'GÜVENLİK VE HAZIRLIK',
        fields: [
          { key: 'safetyMarginMm', label: 'PİSTON GÜVENLİK PAYI', unit: 'mm', min: 0, max: 50, desc: 'Pasif piston geri çekilme limiti için.' },
          { key: 'zeroResetDistanceMm', label: 'PARÇA SIFIRLAMA MESAFESİ', unit: 'mm', min: 0, max: 5000, desc: 'Sensörden "0" noktasına olan mesafe.' },
        ],
      },
      {
        title: 'SİSTEM',
        fields: [
          { key: 'stateSnapshotIntervalSec', label: 'DURUM KAYIT ARALIĞI', unit: 'sn', min: 0, max: 3600, integer: true, desc: '0 = kayıt kapalı.' },
        ],
      },
    ],
  },
]

export const MACHINE_FIELDS: FieldDef[] = MACHINE_SECTIONS.flatMap((g) => g.sections.flatMap((s) => s.fields))

export const GONYE_SECTION: SectionDef = {
  title: 'GÖNYE OFSETLERİ',
  note: 'Mekanik limitten gönye konumuna mesafeler. Bir sonraki Gönye Al işleminde geçerli olur.',
  fields: [
    { key: 'leftOffsetMm', label: 'SOL', unit: 'mm', min: 0, max: 500 },
    { key: 'rightOffsetMm', label: 'SAĞ', unit: 'mm', min: 0, max: 500 },
    { key: 'upperOffsetMm', label: 'ÜST', unit: 'mm', min: 0, max: 500 },
    { key: 'lowerOffsetMm', label: 'ALT', unit: 'mm', min: 0, max: 500 },
    { key: 'referencePressureBar', label: 'REFERANS BASINCI', unit: 'bar', min: 10, max: 250, integer: true, desc: 'Mekanik limit tespiti için.' },
  ],
}

export const STAGE_FIELDS: FieldDef[] = [
  { key: 'leftOffsetMm', label: 'SOL OFSET', unit: 'mm', min: 0, max: 500 },
  { key: 'rightOffsetMm', label: 'SAĞ OFSET', unit: 'mm', min: 0, max: 500 },
  { key: 'lowerOffsetMm', label: 'ALT OFSET', unit: 'mm', min: 0, max: 500 },
  { key: 'xA1Mm', label: 'XA1', unit: 'mm', min: -5000, max: 5000, negative: true, nullable: true, desc: 'Boş = varsayılan XA1.' },
  { key: 'yA1Mm', label: 'YA1', unit: 'mm', min: -5000, max: 5000, negative: true, nullable: true, desc: 'Boş = varsayılan YA1.' },
  { key: 'maxProfileAMm', label: 'MAKSİMUM PROFİL A', unit: 'mm', min: 0, max: 1000, nullable: true, desc: 'Otomatik stage önerisi. Boş = öneride kullanılmaz.' },
]
