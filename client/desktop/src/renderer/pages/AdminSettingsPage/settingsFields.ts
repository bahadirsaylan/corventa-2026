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
        // 2026-11-01 — tahliye sınırları ve hızları (UnloadPartHandler'a bağlı). Boş = eski sabit.
        // Varsayılan hareket + tutma süreleri Operatör Ayarları > TAHLİYE'de (aynı tablo).
        title: 'TAHLİYE',
        note: 'Büküm sonrası parça tahliyesi. Boş bırakılırsa eski sabit değer kullanılır.',
        fields: [
          { key: 'unloadMaxUpperRetractMm', label: 'ÜST TOP EN FAZLA GERİ ÇEKME', unit: 'mm', min: 1, max: 300, nullable: true, desc: 'Tahliyede seçilebilecek en büyük değer. Boş = 150 mm.' },
          { key: 'unloadMaxRotationSeconds', label: 'ROTASYON EN FAZLA SÜRE', unit: 'sn', min: 1, max: 300, nullable: true, desc: 'Tahliyede seçilebilecek en uzun rotasyon. Boş = 60 sn.' },
          { key: 'unloadUpperSpeedPercent', label: 'ÜST TOP GERİ ÇEKME HIZI', unit: '%', min: 1, max: 100, integer: true, nullable: true, desc: 'Boş = %50.' },
          { key: 'unloadRotationSpeedPercent', label: 'ROTASYON HIZI', unit: '%', min: 1, max: 100, integer: true, nullable: true, desc: 'Boş = %60.' },
        ],
      },
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
      {
        // EXCEL 27 — backend SafetyMonitorService / SafetyCheckService. Varsayılan SADECE UYARI.
        title: 'GÜVENLİK',
        note: 'Encoder durması ile açılışta ve büküm başında yağ sıcaklığı / sensör kontrolü. Sorun görülünce alt şeritte uyarı çıkar; hareket durdurulmaz.',
        fields: [
          {
            type: 'select',
            key: 'safetyMonitorEnabled',
            label: 'GÜVENLİK KONTROLLERİ',
            options: [
              { value: true, label: 'AÇIK' },
              { value: false, label: 'KAPALI' },
            ],
          },
          { key: 'encoderStallWindowMs', label: 'ENCODER DURMA SÜRESİ', unit: 'ms', min: 500, max: 30000, integer: true, desc: 'Hareket komutu varken bu süre boyunca ilerleme yoksa uyarı.' },
          { key: 'encoderStallMinMm', label: 'ENCODER EN AZ İLERLEME', unit: 'mm', min: 0.01, max: 10, desc: 'Süre içinde bundan az ilerleme durma sayılır.' },
          { key: 'oilTempWarnC', label: 'YAĞ SICAKLIĞI UYARI EŞİĞİ', unit: '°C', min: 20, max: 100, integer: true },
          { key: 'oilTempBlockC', label: 'YAĞ SICAKLIĞI ENGEL EŞİĞİ', unit: '°C', min: 20, max: 110, integer: true, desc: 'Uyarı eşiğinden küçük olamaz. Büküm engeli sadece aşağıda ENGELLE seçiliyse uygulanır.' },
          {
            type: 'select',
            key: 'safetyBlockingEnabled',
            label: 'BÜKÜM ENGELİ',
            desc: 'ENGELLE: yağ sıcaklığı engel eşiğinin üstündeyse büküm başlatılmaz.',
            options: [
              { value: false, label: 'SADECE UYARI' },
              { value: true, label: 'ENGELLE' },
            ],
          },
        ],
      },
      {
        // EXCEL 34 — backend MaintenanceLockRules / MaintenanceLockGuard. Varsayılan KAPALI.
        title: 'BAKIM KİLİDİ',
        note: 'Bir bakımın vadesinin üzerinden 21 gün geçince (4. haftanın 1. günü) otomatik / yarı otomatik büküm başlatılamaz. Manuel mod, tahliye ve bakım modu açık kalır; geciken bakım tamamlanınca kilit kalkar.',
        fields: [
          {
            type: 'select',
            key: 'maintenanceLockEnabled',
            label: 'BAKIM KİLİDİ',
            desc: 'KAPALI: geciken bakım sadece uyarı verir.',
            options: [
              { value: false, label: 'KAPALI' },
              { value: true, label: 'AÇIK' },
            ],
          },
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
        title: 'SIKIŞTIRMA ALGORİTMASI',
        note: 'HEDEFTE TEMAS: üst top hedef konuma kadar iner, hedefte yavaşlayıp 1 bar temas artışında durur. Hedefe varmadan basınç belirlenen kadar artarsa ACİL STOP yapılır.',
        fields: [
          {
            type: 'select',
            key: 'clampContactAtTargetEnabled',
            label: 'SIKIŞTIRMA YÖNTEMİ',
            desc: 'ESKİ: hedefin %95 noktasında yavaşlar, acil stop koruması yok.',
            options: [
              { value: true, label: 'HEDEFTE TEMAS' },
              { value: false, label: 'ESKİ (%95)' },
            ],
          },
          { key: 'clampTravelOverpressureBar', label: 'YOLDA ACİL STOP BASINÇ ARTIŞI', unit: 'bar', min: 1, max: 50, integer: true, desc: 'Hedefe giderken serbest yürüme basıncına göre bu kadar artış görülürse acil stop.' },
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
        // EXCEL 25 — envanter: backend docs/SURELER.md. Boş = koddaki eski sabit (davranış aynı).
        title: 'SÜRELER',
        note: 'Ölçüm ve duraklama süreleri. Boş bırakılırsa makinenin bugüne kadarki sabit değeri kullanılır. Değiştirdikten sonra ölçüm sonuçlarını eski değerle karşılaştırın.',
        fields: [
          { key: 'measurePneumaticExtendWaitMs', label: 'ÖLÇÜM PNÖMATİĞİ UZATMA BEKLEMESİ', unit: 'ms', min: 500, max: 15000, integer: true, nullable: true, desc: 'Ölçüm çubuğunun parçaya oturması için. Boş = 5000 ms.' },
          { key: 'measurePneumaticRetractWaitMs', label: 'ÖLÇÜM PNÖMATİĞİ GERİ ÇEKME BEKLEMESİ', unit: 'ms', min: 500, max: 15000, integer: true, nullable: true, desc: 'Ölçüm çubuğunun tam geri çekilmesi için. Boş = 5000 ms.' },
          { key: 'measureSampleDurationMs', label: 'ÖLÇÜM ÖRNEKLEME SÜRESİ', unit: 'ms', min: 1000, max: 15000, integer: true, nullable: true, desc: 'Sensörün okunduğu süre. Boş = 5000 ms.' },
          { key: 'circularSlackPressureSettleMs', label: 'ÇEMBER — BOŞLUK ALMA BASINÇ BEKLEMESİ', unit: 'ms', min: 0, max: 5000, integer: true, nullable: true, desc: 'Geri esneme düzeltmesinde basınçla boşluk aldıktan sonra. Boş = 1000 ms.' },
          { key: 'circularIterationPauseMs', label: 'ÇEMBER — İTERASYON ARASI DURAKLAMA', unit: 'ms', min: 0, max: 5000, integer: true, nullable: true, desc: 'Geri esneme düzeltmesinde her iterasyon sonunda. Boş = 500 ms.' },
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

// ── Bakım kuralları (DataApi /api/maintenance/rules — kayıt ADMIN+) ──
// Anahtarlar: periyot min süreleri `rule.<periodKey>` (MAINTENANCE_PERIODS anahtarları), zamanlama alanları
// backend JSON adıyla aynı. Aralıklar MaintenanceController ile birebir (MAINTENANCE_RULE_LIMITS).
export const MAINTENANCE_RULE_KEY_PREFIX = 'rule.'

export const MAINTENANCE_RULES_SECTIONS: SectionDef[] = [
  {
    title: 'MİNİMUM BAKIM SÜRELERİ',
    note: 'Bakım modu en az bu kadar açık kalmadan ilgili bakım TAMAMLANDI olarak işaretlenemez (modu açıp hemen kapatmayı önler).',
    fields: [
      { key: 'rule.daily', label: 'GÜNLÜK BAKIM', unit: 'dk', min: 1, max: 1440, integer: true },
      { key: 'rule.weekly', label: 'HAFTALIK BAKIM', unit: 'dk', min: 1, max: 1440, integer: true },
      { key: 'rule.monthly', label: 'AYLIK BAKIM', unit: 'dk', min: 1, max: 1440, integer: true },
      { key: 'rule.six-monthly', label: '6 AYLIK BAKIM', unit: 'dk', min: 1, max: 1440, integer: true },
      { key: 'rule.twelve-monthly', label: '12 AYLIK BAKIM', unit: 'dk', min: 1, max: 1440, integer: true },
    ],
  },
  {
    title: 'BAKIM MODU HATIRLATMASI',
    note: 'Bakım modu bu süre kadar açık kalınca "DEVAM EDİYOR MUSUNUZ?" penceresi açılır. Cevap verilmezse otomatik kapanma süresi sonunda bakım modu kendiliğinden kapanır.',
    fields: [
      { key: 'reminderAfterMinutes', label: 'HATIRLATMA SÜRESİ', unit: 'dk', min: 15, max: 1440, integer: true, desc: 'Bakım modu açıldıktan veya DEVAM ET ile uzatıldıktan sonra.' },
      { key: 'autoCloseAfterMinutes', label: 'OTOMATİK KAPANMA SÜRESİ', unit: 'dk', min: 1, max: 120, integer: true, desc: 'Hatırlatma açıldıktan sonra cevap beklenen süre.' },
    ],
  },
]

export const MAINTENANCE_RULES_FIELDS: FieldDef[] = MAINTENANCE_RULES_SECTIONS.flatMap((s) => s.fields)
