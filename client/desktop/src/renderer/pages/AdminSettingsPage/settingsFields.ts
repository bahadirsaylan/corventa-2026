// Ayar ekranlarının alan tanımları. Anahtarlar Bending API MachineSettings / GonyeSettings / Stage
// JSON alanlarıyla (camelCase) birebir aynı. Aralıklar backend doğrulamasıyla uyumlu tutuldu
// (SettingsController.Validate*) — ekran daha dar sınır koyabilir, daha geniş koyamaz.
// Sadece makinede GERÇEKTEN kullanılan ayarlar listelenir (kayıt amaçlı / eski alanlar gösterilmez).

import type { FieldDef, SectionDef } from '@/components/SettingsForm/SettingsForm'

// Proses parametreleri DB'ye kaydedilir; makine yazılımı şimdilik aynı değerleri sabit kullanıyor.
const PENDING = 'Kaydedilir; makine yazılımına bağlanması sonraki güncellemede.'

export const MACHINE_SECTIONS: { tab: string; sections: SectionDef[] }[] = [
  {
    tab: 'MAKİNE',
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
        title: 'GÜVENLİK VE HAZIRLIK',
        fields: [
          { key: 'safetyMarginMm', label: 'PİSTON GÜVENLİK PAYI', unit: 'mm', min: 0, max: 50, desc: 'Pasif piston geri çekilme limiti için.' },
          { key: 'zeroResetDistanceMm', label: 'PARÇA SIFIRLAMA MESAFESİ', unit: 'mm', min: 0, max: 5000, desc: 'Sensörden "0" noktasına olan mesafe.' },
          { key: 'defaultSafetyMarginMm', label: 'PARÇA UÇ GÜVENLİK PAYI', unit: 'mm', min: 0, max: 1000, desc: 'İş kaydında güvenlik payı girilmezse kullanılır.' },
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
        ],
      },
      {
        title: 'ADAPTİF TEMAS (PASO 1)',
        note: PENDING,
        fields: [
          { key: 'adaptiveJogSpeedPercent', label: 'TEMAS ARAMA HIZI', unit: '%', min: 5, max: 100, integer: true },
          { key: 'adaptiveSampleIntervalMm', label: 'ÖRNEK ARALIĞI', unit: 'mm', min: 0.1, max: 10, desc: 'Piston her bu kadar ilerlediğinde bir encoder örneği alınır.' },
          { key: 'adaptiveWindowSampleCount', label: 'PENCERE ÖRNEK SAYISI', min: 2, max: 50, integer: true, desc: 'Karşılaştırılan son örnek sayısı.' },
          { key: 'adaptiveEncoderStopToleranceMm', label: 'DURMA EŞİĞİ', unit: 'mm', min: 0.01, max: 5, desc: 'Pencere boyunca encoder bu kadardan az değişirse temas kabul edilir.' },
        ],
      },
    ],
  },
  {
    tab: 'SIKIŞTIRMA',
    sections: [
      {
        title: 'PARÇA SIKIŞTIRMA',
        note: 'Üst top yürüme basıncını izleyerek iner, temas basınç artışında durur. Hedef konum bu değerlerle hesaplanır.',
        fields: [
          { key: 'upperLowerCenterDistanceMm', label: 'ÜST-ALT TOP MERKEZ MESAFESİ', unit: 'mm', min: 1, max: 2000, desc: 'Sıkıştırma konum hesabı (üst piston en üstte, alt mekanik limitte).' },
          { key: 'clampOverpressMm', label: 'SIKIŞTIRMA EKSTRA BASKI', unit: 'mm', min: 0, max: 10 },
        ],
      },
      {
        title: 'SIKIŞTIRMA HAREKETİ',
        note: PENDING,
        fields: [
          { key: 'clampContactDeltaBar', label: 'TEMAS BASINÇ ARTIŞI', unit: 'bar', min: 1, max: 20, integer: true, desc: 'Yürüme basıncı + bu değer görülünce üst top durur.' },
          { key: 'clampJogSpeedPercent', label: 'SIKIŞTIRMA HIZI', unit: '%', min: 5, max: 100, integer: true },
          { key: 'clampSlowSpeedPercent', label: 'SON BÖLÜM YAVAŞ HIZ', unit: '%', min: 5, max: 100, integer: true },
          { key: 'clampSlowdownPercentOfTarget', label: 'YAVAŞLAMA NOKTASI', unit: '%', min: 50, max: 100, integer: true, desc: 'Hedef konumun bu yüzdesinde yavaşlar ve yürüme basıncını okur.' },
        ],
      },
      {
        title: 'BOŞLUK ALMA HIZI',
        note: PENDING,
        fields: [{ key: 'slackSpeedPercent', label: 'BOŞLUK ALMA HIZI', unit: '%', min: 5, max: 100, integer: true }],
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
        ],
      },
      {
        title: 'GERİ ESNEME DÜZELTMESİ',
        note: PENDING,
        fields: [
          { key: 'springbackMaxIterations', label: 'ÇEMBER EN FAZLA İTERASYON', min: 1, max: 20, integer: true },
          { key: 'arcMeasureMaxIterations', label: 'ÇOK AÇILI EN FAZLA İTERASYON', min: 1, max: 20, integer: true },
          { key: 'springbackRotationOnlyMaxMm', label: 'SADECE ROTASYON SINIRI', unit: 'mm', min: 0, max: 500, desc: 'Çap farkı bu kadar veya altındaysa düzeltme bükümü yapılmaz, sadece rotasyon.' },
          { key: 'springbackStableTimeMs', label: 'SENSÖR SABİTLENME SÜRESİ', unit: 'ms', min: 50, max: 10000, integer: true },
          { key: 'springbackIncreaseThresholdMm', label: 'ÖLÇÜM ARTIŞ EŞİĞİ', unit: 'mm', min: 0.01, max: 5 },
          { key: 'springbackMinThresholdMm', label: 'ÖLÇÜM EN KÜÇÜK EŞİK', unit: 'mm', min: 0.01, max: 5 },
        ],
      },
      {
        title: 'YARIÇAP SENSÖRLERİ (GT2)',
        fields: [
          { key: 'radiusSensorMmPerPulse', label: 'PULSE BAŞINA MM', unit: 'mm', min: 0.000001, max: 1 },
          { key: 'leftRadiusSensorZeroOffsetMm', label: 'SOL SENSÖR SIFIR OFSETİ', unit: 'mm', min: -1000, max: 1000, negative: true },
          { key: 'rightRadiusSensorZeroOffsetMm', label: 'SAĞ SENSÖR SIFIR OFSETİ', unit: 'mm', min: -1000, max: 1000, negative: true },
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

/** Makinede tanımlanabilecek stage sayısı (aktif / pasif yapılarak yönetilir). */
export const STAGE_SLOTS = 5

export const STAGE_ACTIVE_FIELD: FieldDef = {
  type: 'select',
  key: 'active',
  label: 'DURUM',
  desc: 'Pasif stage gönye ekranında ve otomatik stage önerisinde kullanılmaz.',
  options: [
    { value: 'on', label: 'AKTİF' },
    { value: 'off', label: 'PASİF' },
  ],
}

export const STAGE_FIELDS: FieldDef[] = [
  // Üst sınırlar piston stroklarından (sol/sağ 422, alt 195) gönye payı düşülerek
  { key: 'leftOffsetMm', label: 'SOL OFSET', unit: 'mm', min: 0, max: 415 },
  { key: 'rightOffsetMm', label: 'SAĞ OFSET', unit: 'mm', min: 0, max: 415 },
  { key: 'lowerOffsetMm', label: 'ALT OFSET', unit: 'mm', min: 0, max: 180 },
  { key: 'xA1Mm', label: 'XA1', unit: 'mm', min: -5000, max: 5000, negative: true, nullable: true, desc: 'Stage merkezi (üst top referansı). Ölçüm sürüşü de bu değeri kullanır.' },
  { key: 'yA1Mm', label: 'YA1', unit: 'mm', min: -5000, max: 5000, negative: true, nullable: true },
  { key: 'maxProfileAMm', label: 'MAKSİMUM PROFİL A', unit: 'mm', min: 0, max: 1000, nullable: true, desc: 'Otomatik stage önerisi. Boş = öneride kullanılmaz.' },
]
