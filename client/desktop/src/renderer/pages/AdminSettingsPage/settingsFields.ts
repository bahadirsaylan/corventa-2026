// Ayar ekranlarının alan tanımları. Anahtarlar Bending API MachineSettings / GonyeSettings / Stage
// JSON alanlarıyla (camelCase) birebir aynı. Aralıklar backend doğrulamasıyla uyumlu tutuldu
// (SettingsController.Validate*) — ekran daha dar sınır koyabilir, daha geniş koyamaz.
// Sadece makinede GERÇEKTEN kullanılan ayarlar listelenir (kayıt amaçlı / eski alanlar gösterilmez).

import type { FieldDef, SectionDef } from '@/components/SettingsForm/SettingsForm'
import { SIDE_RULERS, sideRulerSettingKeys, type SideRulerKey } from '@shared/sideRulers'

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
          // 2026-11-23 — "SOL" parça sensörü bu makinede önden bakınca SAĞDA (kablo/isim değişmedi); sadece elle konumlandırma çizimi
          {
            type: 'select',
            key: 'leftPartSensorOnMachineRight',
            label: 'SOL PARÇA SENSÖRÜNÜN YERİ',
            desc: 'Makineye önden bakınca "SOL" parça varlık sensörünün durduğu taraf. Sadece elle konumlandırma çizimini etkiler.',
            options: [
              { value: true, label: 'SAĞDA' },
              { value: false, label: 'SOLDA' },
            ],
          },
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
        note: 'Encoder durması ile yağ sıcaklığı / sensör kontrolü (sürekli, her 5 sn; kaydedince hemen). Sorun görülünce alt şeritte uyarı çıkar; hareket durdurulmaz.',
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
          // 2026-11-19 — rotasyon encoder durması büküm sırasında bükümü durdurabilir (kesinti, kod 112)
          {
            type: 'select',
            key: 'encoderStallStopEnabled',
            label: 'ENCODER DURMASINDA',
            desc: "BÜKÜMÜ DURDUR: büküm sürerken rotasyon encoder'ı ilerlemezse acil stop, büküm İPTAL (kaldığı yerden devam yok — manuel tahliye). Tahliye / manuel harekette sadece uyarı.",
            options: [
              { value: false, label: 'SADECE UYARI' },
              { value: true, label: 'BÜKÜMÜ DURDUR' },
            ],
          },
          // 2026-11-20 — alarm davranışı
          { key: 'bendingEndAlarmSeconds', label: 'BÜKÜM SONU ALARM SÜRESİ', unit: 'sn', min: 0, max: 10, integer: true, desc: 'Büküm bitince (başarılı / başarısız) alarm bu kadar çalar. 0 = kapalı. Operatör iptalinde çalmaz.' },
          {
            type: 'select',
            key: 'alarmAutoOffOnUnload',
            label: 'TAHLİYEDE ALARMI KAPAT',
            desc: 'Sıkıştırma / encoder durması / basınç düşüşü alarmı tahliye veya yeni büküm başlayınca kapanır. Fiziksel acil stop alarmı etkilenmez.',
            options: [
              { value: true, label: 'AÇIK' },
              { value: false, label: 'KAPALI' },
            ],
          },
          // 2026-11-19: eşiğe ULAŞINCA (≥) uyarı; alt sınır 0 — soğuk yağda da denenebilsin
          { key: 'oilTempWarnC', label: 'YAĞ SICAKLIĞI UYARI EŞİĞİ', unit: '°C', min: 0, max: 100, integer: true, desc: 'Yağ sıcaklığı bu değere ulaşınca alt şeritte uyarı çıkar.' },
          { key: 'oilTempBlockC', label: 'YAĞ SICAKLIĞI ENGEL EŞİĞİ', unit: '°C', min: 20, max: 110, integer: true, desc: 'Uyarı eşiğinden küçük olamaz. Büküm engeli sadece aşağıda ENGELLE seçiliyse uygulanır.' },
          {
            type: 'select',
            key: 'safetyBlockingEnabled',
            label: 'BÜKÜM ENGELİ',
            desc: 'ENGELLE: yağ sıcaklığı engel eşiğine ulaşınca büküm başlatılmaz.',
            options: [
              { value: false, label: 'SADECE UYARI' },
              { value: true, label: 'ENGELLE' },
            ],
          },
        ],
      },
      {
        // 2026-11-19 — backend FanAutoController (Bending API). Varsayılan KAPALI. Aralıklar SettingsController ile aynı.
        title: 'OTOMATİK FAN',
        note: 'Yağ sıcaklığı açma sıcaklığına ulaşınca fan kendiliğinden açılır, kapatma sıcaklığına düşünce kapanır. Elle açılan fan otomatik kapatılmaz; elle kapatılınca otomatik 10 dk bekler.',
        fields: [
          {
            type: 'select',
            key: 'fanAutoEnabled',
            label: 'OTOMATİK FAN',
            options: [
              { value: false, label: 'KAPALI' },
              { value: true, label: 'AÇIK' },
            ],
          },
          { key: 'fanOnTempC', label: 'FAN AÇMA SICAKLIĞI', unit: '°C', min: 20, max: 90, integer: true },
          { key: 'fanOffTempC', label: 'FAN KAPATMA SICAKLIĞI', unit: '°C', min: 15, max: 88, integer: true, desc: 'Açma sıcaklığından en az 2 °C düşük olmalı.' },
          { key: 'fanMinOnSeconds', label: 'EN AZ AÇIK KALMA SÜRESİ', unit: 'sn', min: 0, max: 3600, integer: true, desc: 'Otomatik açılan fan sık aç-kapa yapmasın diye.' },
        ],
      },
      {
        // 2026-11-01 — Şekil 15-17. Backend BendingInterruptMonitor + /bending-job/{id}/resume.
        title: 'ACİL STOP / DEVAM',
        note: 'Büküm sırasında acil stop, faz veya motor termik hatasında büküm hemen kesilir ve alarm sayfası açılır: MANUEL TAHLİYE veya DEVAM ET (dairesel bükümde kaldığı adımdan, sıkıştırma yapılmadan). Basınç düşüşü: parça bozulursa (basınç aniden düşerse) yazılım acil stop yapar.',
        fields: [
          {
            type: 'select',
            key: 'emergencyResumeEnabled',
            label: 'KESİNTİ ALGILAMA / DEVAM',
            desc: 'KAPALI: eski davranış — büküm zaman aşımıyla hata verir, devam yok.',
            options: [
              { value: true, label: 'AÇIK' },
              { value: false, label: 'KAPALI' },
            ],
          },
          {
            type: 'select',
            key: 'pressureDropStopEnabled',
            label: 'BASINÇ DÜŞÜŞÜNDE DURDUR',
            desc: 'Eşikleri makinede loglara bakarak ayarlayın, sonra açın.',
            options: [
              { value: false, label: 'KAPALI' },
              { value: true, label: 'AÇIK' },
            ],
          },
          { key: 'pressureDropBar', label: 'BASINÇ DÜŞÜŞÜ EŞİĞİ', unit: 'bar', min: 1, max: 250, integer: true, desc: 'Pencere içindeki en yüksek basınçtan bu kadar düşüş.' },
          { key: 'pressureDropWindowMs', label: 'BASINÇ DÜŞÜŞÜ PENCERESİ', unit: 'ms', min: 50, max: 5000, integer: true },
          { key: 'pressureDropMinBaseBar', label: 'BASINÇ DÜŞÜŞÜ EN DÜŞÜK TABAN', unit: 'bar', min: 0, max: 250, integer: true, desc: 'Pencere tepe basıncı bunun altındaysa izlenmez (parçaya baskı yok).' },
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
          // 2026-11-20 — aynı hata tekrarlarsa GÜVENLİ MOD (bakım kilidi)
          {
            type: 'select',
            key: 'errorRepeatLockEnabled',
            label: 'HATA TEKRARINDA GÜVENLİ MOD',
            desc: 'AÇIK: aynı hata / uyarı belirtilen sürede belirtilen sayıda tekrarlarsa bakım kilidi açılır; servis yetkilisi kapatana kadar büküm başlatılamaz.',
            options: [
              { value: true, label: 'AÇIK' },
              { value: false, label: 'KAPALI' },
            ],
          },
          { key: 'errorRepeatLockCount', label: 'TEKRAR SAYISI', min: 2, max: 20, integer: true },
          { key: 'errorRepeatLockWindowHours', label: 'TEKRAR SÜRESİ', unit: 'saat', min: 1, max: 168, integer: true },
          {
            type: 'select',
            key: 'errorRepeatLockCountEmergencyStop',
            label: 'ACİL STOP DA SAYILSIN',
            desc: 'KAPALI: operatörün bastığı acil stop sayılmaz (arıza değil).',
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
          // 2026-11-16 — her vals topu ayrı (eski tek TOP ÇAPI dördüne kopyalandı)
          { key: 'upperBallDiameterMm', label: 'ÜST TOP ÇAPI', unit: 'mm', min: 1, max: 1000, desc: 'Sıkıştırma hedefinde kullanılır.' },
          { key: 'lowerBallDiameterMm', label: 'ALT TOP ÇAPI', unit: 'mm', min: 1, max: 1000, desc: 'Büküm hesabı, sıvama ve sıkıştırma hedefinde kullanılır.' },
          { key: 'leftBallDiameterMm', label: 'SOL TOP ÇAPI', unit: 'mm', min: 1, max: 1000, desc: 'Şimdilik sadece kayıt.' },
          { key: 'rightBallDiameterMm', label: 'SAĞ TOP ÇAPI', unit: 'mm', min: 1, max: 1000, desc: 'Şimdilik sadece kayıt.' },
          // 2026-11-20 — yukarıdakiler İÇ çap (parça oluk dibine oturur). DIŞ çap = kenar → üst-alt top bindirme kontrolü
          { key: 'upperBallOuterDiameterMm', label: 'ÜST TOP DIŞ ÇAPI', unit: 'mm', min: 1, max: 1000, desc: 'Kenar çapı — sadece bindirme kontrolü. Büküm hesabı iç çapla yapılır.' },
          { key: 'lowerBallOuterDiameterMm', label: 'ALT TOP DIŞ ÇAPI', unit: 'mm', min: 1, max: 1000, desc: 'Kenar çapı — sadece bindirme kontrolü. Büküm hesabı iç çapla yapılır.' },
          { key: 'leftBallOuterDiameterMm', label: 'SOL TOP DIŞ ÇAPI', unit: 'mm', min: 1, max: 1000, desc: 'Şimdilik sadece kayıt.' },
          { key: 'rightBallOuterDiameterMm', label: 'SAĞ TOP DIŞ ÇAPI', unit: 'mm', min: 1, max: 1000, desc: 'Şimdilik sadece kayıt.' },
          { key: 'defaultCenterDistanceMm', label: 'EKSEN MESAFESİ (NORMAL)', unit: 'mm', min: 1, max: 2000, desc: 'Sol-sağ top arası. Arc Normal / Ters Normal segmentler.' },
          { key: 'centerDistanceMiddleRadiusMm', label: 'EKSEN MESAFESİ (RADIUS ORTADA)', unit: 'mm', min: 1, max: 2000, nullable: true, desc: 'Arc Middle segmentler. Boş = normal eksen mesafesi kullanılır.' },
          { key: 'defaultThetaDeg', label: 'THETA AÇISI', unit: '°', min: 0, max: 180 },
        ],
      },
      {
        // 2026-11-20 — yan dayama konum kontrolü (PLC FB_SideSupportPosition) + gönyede en geri
        title: 'YAN DAYAMA KONUM KONTROLÜ',
        note: 'Tuş takımında yan dayama cetvel değerine dokunarak konuma gönderilir; PLC hedefte durur ve konumu tutar. PLC programı eskiyse sadece elle (jog) çalışır.',
        fields: [
          { key: 'sideSupportPosTolMm', label: 'HEDEF PENCERESİ', unit: 'mm', min: 0.1, max: 10, desc: 'Kalan bu kadarsa hedefte sayılır.' },
          { key: 'sideSupportPosLeadMm', label: 'ERKEN DURMA PAYI', unit: 'mm', min: 0, max: 30, desc: 'Valf kapanırken yan dayamanın kayma mesafesi — makinede hedefi aşma miktarına göre ayarlayın.' },
          { key: 'sideSupportPosTimeoutS', label: 'HAREKET SÜRE SINIRI', unit: 'sn', min: 2, max: 120, integer: true },
          {
            type: 'select',
            key: 'sideSupportGonyeRetractEnabled',
            label: 'GÖNYEDE YAN DAYAMALARI EN GERİYE ÇEK',
            options: [
              { value: false, label: 'KAPALI' },
              { value: true, label: 'AÇIK' },
            ],
          },
          { key: 'sideSupportGonyeRetractTimeoutS', label: 'GÖNYE GERİ ÇEKME SÜRE SINIRI', unit: 'sn', min: 3, max: 120, integer: true },
          { key: 'sideSupportGonyeRetractNoRulerSec', label: 'CETVELSİZ GERİ ÇEKME SÜRESİ', unit: 'sn', min: 1, max: 60, integer: true, desc: 'Sadece geri sınır KAPALI ve ofset 0 iken: cetvel okunamıyorsa yan dayamalar bu kadar süre geri sürülür.' },
          // 2026-11-20 — yan dayamalar mekanik en geriye inmez
          {
            type: 'select',
            key: 'sideSupportBackLimitEnabled',
            label: 'YAN DAYAMA GERİ SINIRI',
            desc: 'AÇIK: yan dayamalar sınırın gerisine gitmez (jog durur, konum reddedilir, gönyede sınıra çekilir). Sınır = bu değer veya o yan dayamanın ofseti (büyük olan).',
            options: [
              { value: true, label: 'AÇIK' },
              { value: false, label: 'KAPALI' },
            ],
          },
          { key: 'sideSupportBackLimitMm', label: 'GERİ SINIR (EN GERİDEN)', unit: 'mm', min: 0, max: 50, desc: 'Kalibre cetvelde mekanik en geriden mesafe. Varsayılan 5 mm.' },
          { key: 'sideSupportBackLimitMarginMm', label: 'GERİ SINIR DURMA PAYI', unit: 'mm', min: 0, max: 30, desc: 'Elle geri sürerken sınırın bu kadar önünde durdurulur (okuma gecikmesi + kayma). Sınırın gerisine geçiyorsa büyütün.' },
        ],
      },
      {
        // 2026-11-20 — bükümde yan dayama konumları (büküm başlarken, sıkıştırmadan önce; iş boyunca orada kalır)
        title: 'BÜKÜMDE YAN DAYAMA KONUMLARI',
        note: 'Açıkken büküm başlarken (parça sıkılmadan önce) yan dayamalar bu konumlara gider, varınca durur ve iş boyunca orada kalır. Değerler tuş takımında görünen mm (ofsetli sıfırdan). Geri sınırın gerisindeki değer sınıra çekilir. Gidemezse büküm başlamaz.',
        fields: [
          {
            type: 'select',
            key: 'sideSupportBendEnabled',
            label: 'BÜKÜMDE YAN DAYAMALARI KONUMA GÖNDER',
            options: [
              { value: false, label: 'KAPALI' },
              { value: true, label: 'AÇIK' },
            ],
          },
          { key: 'topJawThicknessMm', label: 'TOP ÇENE KALINLIĞI (SAĞ + SOL GÖVDE)', unit: 'mm', min: -50, max: 400, desc: 'Gövde bükümde sıfırdan bu kadar ileri çıkar.' },
          { key: 'rightJointBendMm', label: 'SAĞ MAFSAL', unit: 'mm', min: -50, max: 400 },
          { key: 'leftJointBendMm', label: 'SOL MAFSAL', unit: 'mm', min: -50, max: 400 },
          { key: 'rightReelBendMm', label: 'SAĞ MAKARA', unit: 'mm', min: -50, max: 400 },
          { key: 'leftReelBendMm', label: 'SOL MAKARA', unit: 'mm', min: -50, max: 400 },
        ],
      },
      {
        // 2026-11-20 — üst-alt top kenarları (dış çap) birbirine değer (Core/Models/RollOverlap)
        title: 'ÜST-ALT TOP BİNDİRME KONTROLÜ',
        note: 'Açıkken profil A, top dış ve iç çap farkından küçükse büküm başlamaz (220 / 280 toplarda A en az 60 mm); üst / alt top kenarları çarpışacak konum hareketi yapılmaz, ileri jog ve basınç hareketi kenarlar yaklaşınca durdurulur.',
        fields: [
          {
            type: 'select',
            key: 'rollOverlapCheckEnabled',
            label: 'BİNDİRME KONTROLÜ',
            options: [
              { value: false, label: 'KAPALI' },
              { value: true, label: 'AÇIK' },
            ],
          },
          { key: 'rollOverlapMinClearanceMm', label: 'KENARLAR ARASI EN AZ BOŞLUK', unit: 'mm', min: 0, max: 50, desc: 'Üst ve alt top kenarları arasında bırakılacak pay.' },
          { key: 'rollOverlapJogMarginMm', label: 'JOG DURDURMA PAYI', unit: 'mm', min: 0, max: 50, desc: 'İleri jog sırasında kenarlar bu kadar yaklaşınca top durur.' },
        ],
      },
      {
        // 2026-11-02 — makine yazılımına BAĞLI (StartJob okur)
        title: 'ÖN BÜKÜM (DAİRESEL)',
        note: 'Varsayılan KAPALI. Açtıktan sonra ilk bükümü makinenin başında izleyin.',
        fields: [
          {
            type: 'select',
            key: 'circularSinglePassPreBend',
            label: 'ÖN BÜKÜM TEK ROTASYON (DAİRESEL)',
            desc: 'AÇIK: 1. pasoda temas + adımdan sonra aktif top basılıyken parça tek seferde diğer uca sürülür (kısa rotasyon / vals değişimi yok); 2. paso diğer topu bükme konumu + adıma götürür, sonrası aynı. KAPALI: eski akış.',
            options: [
              { value: false, label: 'KAPALI' },
              { value: true, label: 'AÇIK' },
            ],
          },
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
        note: 'Üst top yavaşlama noktasına (hedef − YAVAŞLAMA MESAFESİ) kadar hızlı iner, sonra YAVAŞ HIZ ile TEMAS BASINÇ ARTIŞI kadar basınç yükselince durur. HEDEFTE TEMAS seçiliyse yavaşlama noktasına varmadan basınç belirlenen kadar artarsa ACİL STOP yapılır. YAVAŞLAMA MESAFESİ 0 = eski davranış (hedefte / %95 noktasında yavaşlama).',
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
          // 2026-11-02 — %95 yerine mesafe: hedefe bu kadar mm kala yavaşla
          { key: 'clampSlowdownBeforeTargetMm', label: 'YAVAŞLAMA MESAFESİ', unit: 'mm', min: 0, max: 20, desc: 'Hedefe bu kadar mm kala yavaşlar ve temas arar (ör. 1 veya 2). 0 = eski davranış.' },
          { key: 'clampContactDeltaBar', label: 'TEMAS BASINÇ ARTIŞI', unit: 'bar', min: 1, max: 20, integer: true, desc: 'Yavaşlama noktasında okunan basınç + bu değer görülünce üst top durur (temas).' },
          { key: 'clampSlowSpeedPercent', label: 'YAVAŞ HIZ', unit: '%', min: 5, max: 100, integer: true, desc: 'Yavaşlama noktasından sonraki temas arama hızı. Sadece YAVAŞLAMA MESAFESİ 0 değilken kullanılır.' },
          { key: 'clampJogSpeedPercent', label: 'HIZLI İNİŞ HIZI', unit: '%', min: 5, max: 100, integer: true, desc: 'Yavaşlama noktasına kadar üst topun iniş hızı.' },
          { key: 'clampSlowdownPercentOfTarget', label: 'ESKİ YÖNTEM YAVAŞLAMA NOKTASI', unit: '%', min: 50, max: 100, integer: true, desc: 'Sadece ESKİ yöntem + YAVAŞLAMA MESAFESİ 0 iken: hedefin bu yüzdesinde yavaşlar.' },
          { key: 'clampStabilizeMs', label: 'BASINÇ OTURMA BEKLEMESİ', unit: 'ms', min: 0, max: 2000, integer: true, nullable: true, desc: 'Yavaşladıktan sonra taban basıncı okumadan önce bekleme. Boş = 50 ms.' },
          { key: 'clampStartupIgnoreMs', label: 'KALKIŞ BASINCINI YOK SAY', unit: 'ms', min: 0, max: 3000, integer: true, nullable: true, desc: 'Hareket başında basınç sıçraması bu süre yok sayılır. Boş = 500 ms.' },
          { key: 'clampOverpressureConfirmSamples', label: 'ACİL STOP ONAY ÖRNEĞİ', min: 1, max: 20, integer: true, nullable: true, desc: 'Yolda eşik üstü basınç bu kadar ardışık okumada (100 ms arayla) görülürse acil stop. Boş = 2.' },
          { key: 'clampTimeoutSec', label: 'SIKIŞTIRMA ZAMAN AŞIMI', unit: 'sn', min: 3, max: 120, integer: true, nullable: true, desc: 'Bu sürede temas olmazsa sıkıştırma hata ile durur. Boş = 15 sn.' },
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
  {
    // 2026-11-02 — test sekmesi (sonradan kaldırılacak). Tuşlar AdminSettingsPage TestToolsCard'da.
    tab: 'TEST',
    sections: [
      {
        title: 'YAĞ ISITMA AYARLARI',
        note: 'Önce gönye alınır; sonra 4 top aynı anda ileri-geri (sağ/sol: max kurs − 20 mm, üst/alt: 50 mm) ve rotasyon her turda yön değiştirerek döner — yağ hedef sıcaklığa ulaşana kadar.',
        fields: [
          { key: 'oilHeatingTargetTempC', label: 'HEDEF YAĞ SICAKLIĞI', unit: '°C', min: 10, max: 70, integer: true },
          { key: 'oilHeatingSpeedPercent', label: 'HAREKET HIZI', unit: '%', min: 5, max: 100, integer: true },
          { key: 'oilHeatingMaxMinutes', label: 'EN UZUN SÜRE', unit: 'dk', min: 1, max: 240, integer: true, desc: 'Hedefe ulaşılmasa da bu sürede program durur.' },
        ],
      },
    ],
  },
]

// ── Yan dayama cetvelleri (2026-11-19) — ÖLÇÜM & SENSÖR sekmesinde SideRulerCards ile çizilir (canlı değer +
// EN GERİ / EN İLERİ / SIFIR düğmeleri). Alan adları backend MachineSettings <key>RulerRawMin/RawMax/StrokeMm/OffsetMm/
// Calibrated (Api PUT kopyası SettingsController). Aralıklar SideSupportRulerCalibration.Validate ile aynı.
export const SIDE_RULER_FIELD_DEFS = (key: SideRulerKey): { rawMin: FieldDef; rawMax: FieldDef; strokeMm: FieldDef; offsetMm: FieldDef; calibrated: FieldDef } => {
  const k = sideRulerSettingKeys(key)
  return {
    rawMin: { key: k.rawMin, label: 'EN GERİ HAM DEĞER', min: 0, max: 4095, integer: true },
    rawMax: { key: k.rawMax, label: 'EN İLERİ HAM DEĞER', min: 0, max: 4095, integer: true },
    strokeMm: { key: k.strokeMm, label: 'STROK', unit: 'mm', min: 1, max: 2000 },
    offsetMm: { key: k.offsetMm, label: 'SIFIR OFSETİ', unit: 'mm', min: -2000, max: 2000, negative: true },
    calibrated: {
      type: 'select',
      key: k.calibrated,
      label: 'KALİBRASYON',
      options: [
        { value: true, label: 'KALİBRE EDİLDİ' },
        { value: false, label: 'KALİBRE EDİLMEDİ' },
      ],
    },
  }
}

export const SIDE_RULER_FIELDS: FieldDef[] = SIDE_RULERS.flatMap((r) => Object.values(SIDE_RULER_FIELD_DEFS(r.key)))

// ── GÜVENLİ GÖNYE (2026-11-19) — GÖNYE & STAGE sekmesinde. Alanlar MachineSettings (Api + DataApi PUT kopyası).
// HER gönye güvenlidir (aç/kapa yok); aralıklar SettingsController ile birebir.
export const SAFE_GONYE_SECTION: SectionDef = {
  title: 'GÜVENLİ GÖNYE',
  note: 'Her gönyede toplar son bilinen konumdan beklenen mesafeyle karşılaştırılır. Beklenenden erken duran top ENGEL sayılır: top hemen ileri alınır, cetvel sıfırlanmaz, gönye durur.',
  fields: [
    { key: 'safeGonyeToleranceMm', label: 'ENGEL TOLERANSI', unit: 'mm', min: 1, max: 100, desc: 'Gidilen mesafe beklenenden bu kadar kısaysa ENGEL.' },
    { key: 'safeGonyeSpeedPercent', label: 'GÜVENLİ GÖNYE HIZI', unit: '%', min: 10, max: 100, integer: true, desc: 'Geri çekme hızı. Düşük hız basıncı erken yükseltebilir — gönye %100 ile denendi.' },
    { key: 'safeGonyeReliefMm', label: 'RAHATLATMA MESAFESİ', unit: 'mm', min: 0, max: 50, desc: 'Engelde top bu kadar İLERİ alınır (sıkışan el / alet kurtulsun). 0 = ileri alma yok.' },
    { key: 'safeGonyeReliefSpeedPercent', label: 'RAHATLATMA HIZI', unit: '%', min: 10, max: 100, integer: true },
    { key: 'safeGonyeMaxAgeDays', label: 'SON KONUM GEÇERLİLİK SÜRESİ', unit: 'gün', min: 1, max: 365, integer: true, desc: 'Daha eski kayıtla beklenen bilinmiyor sayılır — operatör onayı istenir.' },
    { key: 'rulerConnectionLossSec', label: 'BAĞLANTI KESİNTİSİ EŞİĞİ', unit: 'sn', min: 1, max: 600, integer: true, desc: 'PLC bağlantısı bu süreden uzun koparsa cetveller geçersiz sayılır.' },
    {
      type: 'select',
      key: 'safeGonyeOvertravelAction',
      label: 'FAZLA GİTME DAVRANIŞI',
      desc: 'Top beklenen + toleranstan fazla giderse. UYAR: durduğu yer mekanik son kabul edilir, uyarı yazılır.',
      options: [
        { value: 'WARN', label: 'UYAR' },
        { value: 'STOP', label: 'DURDUR' },
      ],
    },
  ],
}

export const MACHINE_FIELDS: FieldDef[] = [
  ...MACHINE_SECTIONS.flatMap((g) => g.sections.flatMap((s) => s.fields)),
  ...SIDE_RULER_FIELDS,
  ...SAFE_GONYE_SECTION.fields,
]

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
