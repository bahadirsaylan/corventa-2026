using MediatR;

namespace CncBendingMachine.Application.Commands.Springback;

/// <summary>
/// Yarı-otomatik springback düzeltme komutu
/// Doğru akış: Ölç → Düzelt Hesapla → Her iki tarafta düzeltme yap → Tekrar ölç
/// </summary>
public class SpringbackAutoCorrectCommand : IRequest<SpringbackAutoCorrectResult>
{
    /// <summary>
    /// İlişkili büküm iş kaydı ID'si (loglama için)
    /// </summary>
    public int JobId { get; set; }

    /// <summary>
    /// Hedef büküm çapı (mm)
    /// </summary>
    public double TargetDiameterMm { get; set; }

    /// <summary>
    /// Parçanın şu an hangi tarafta olduğu: "right" veya "left"
    /// (Otomatik bükümde en son hangi pistonun bükümü yaptığına göre belirlenir)
    /// </summary>
    public string PartSide { get; set; } = "right";

    /// <summary>
    /// Parça uzunluğu (mm) - rotasyon mesafesi hesabı için
    /// </summary>
    public double PartLengthMm { get; set; }

    /// <summary>
    /// Güvenlik payı (mm) - rotasyon mesafesi = parça boyu - (güvenlik * 2)
    /// </summary>
    public double SafetyMarginMm { get; set; } = 50.0;

    /// <summary>
    /// Üst piston boşluk alma basıncı (bar) - varsayılan 155 bar
    /// NOT: SlackDistanceMm tanımlıysa bu değer kullanılmaz
    /// </summary>
    public int SlackPressureBar { get; set; } = 155;

    /// <summary>
    /// Üst piston boşluk alma mesafesi (mm) - mesafe bazlı boşluk alma
    /// Bu değer tanımlıysa SlackPressureBar kullanılmaz
    /// Örneğin: 0.5mm girildiyse üst piston mevcut konumundan 0.5mm ilerler
    /// </summary>
    public double? SlackDistanceMm { get; set; }

    /// <summary>
    /// Üst piston sıkıştırma basıncı (bar) - varsayılan 155 bar
    /// </summary>
    public int ClampPressureBar { get; set; } = 155;

    /// <summary>
    /// Maksimum iterasyon sayısı (varsayılan: 5)
    /// </summary>
    public int MaxIterations { get; set; } = 5;

    /// <summary>
    /// Tolerans (mm) - bu değerin altındaki hata kabul edilir (varsayılan: 10mm)
    /// </summary>
    public double ToleranceMm { get; set; } = 10.0;

    /// <summary>
    /// Hareket hızı (varsayılan: 50%)
    /// </summary>
    public int MovementSpeedPercent { get; set; } = 50;

    /// <summary>
    /// Rotasyon hızı (varsayılan: 50%)
    /// </summary>
    public int RotationSpeedPercent { get; set; } = 50;

    /// <summary>
    /// Parça genişliği (mm) - SLPIS formülünde L = PartWidthMm / 2 olarak kullanılır
    /// </summary>
    public double PartWidthMm { get; set; }

    // ============================================================
    // SLPIS SENSÖR PARAMETRELERİ (DB'den okunur)
    // ============================================================

    /// <summary>
    /// SLPIS sensör sıfır ofseti (mm) — DB: MachineSettings.SlpisZeroOffsetMm
    /// </summary>
    public double SlpisZeroOffsetMm { get; set; } = 0;

    /// <summary>
    /// SLPIS L değeri (mm) — radyüs formülünde yarı genişlik — DB: MachineSettings.SlpisLMm
    /// </summary>
    public double SlpisLMm { get; set; } = 70.0;

    /// <summary>
    /// SLPIS rulman çapı (mm) — R_net = R_ham - (rulmanCap/2) — DB: MachineSettings.SlpisRulmanCapMm
    /// </summary>
    public double SlpisRulmanCapMm { get; set; } = 35.0;

    /// <summary>
    /// PLC sıyrılma tespit parametreleri
    /// </summary>
    public SpringbackMeasurementParams MeasurementParams { get; set; } = new();

    /// <summary>
    /// Makine parametreleri (hesaplama için)
    /// </summary>
    public AutoCorrectMachineParams MachineParams { get; set; } = new();
}

/// <summary>
/// PLC sıyrılma tespit parametreleri (FB_SpringbackMeasure threshold'ları)
/// </summary>
public class SpringbackMeasurementParams
{
    /// <summary>
    /// Artış eşiği (mm) — başlangıç değerinden bu kadar artış = sıyrılma (varsayılan 0.2)
    /// PLC register: nCmdSbIncreaseThresholdX100
    /// </summary>
    public double IncreaseThresholdMm { get; set; } = 0.2;

    /// <summary>
    /// Minimum üstü eşik (mm) — minimum değerden bu kadar artış = sıyrılma (varsayılan 0.1)
    /// PLC register: nCmdSbMinThresholdX100
    /// </summary>
    public double MinThresholdMm { get; set; } = 0.1;

    /// <summary>
    /// Sabitlenme süresi (ms) — PLC doğrulama süresi (varsayılan 500)
    /// PLC register: nCmdSbStableTimeMs
    /// </summary>
    public int StableTimeMs { get; set; } = 500;
}

/// <summary>
/// Makine parametreleri (büküm hesaplaması için)
/// </summary>
public class AutoCorrectMachineParams
{
    /// <summary>
    /// Top çapı (mm) - varsayılan 220
    /// </summary>
    public double BallDiameterMm { get; set; } = 220.0;

    /// <summary>
    /// Profil yüksekliği (mm) - DİKKAT: Et kalınlığı değil!
    /// </summary>
    public double ThicknessMm { get; set; }

    /// <summary>
    /// Eksen mesafesi BC (mm) - varsayılan 300.82
    /// </summary>
    public double CenterDistanceMm { get; set; } = 300.82;

    /// <summary>
    /// Theta açısı (derece) - varsayılan 63
    /// </summary>
    public double ThetaDeg { get; set; } = 63.0;

    /// <summary>
    /// XA1 koordinatı - varsayılan -465
    /// </summary>
    public double XA1 { get; set; } = -465.0;

    /// <summary>
    /// YA1 koordinatı
    /// </summary>
    public double YA1 { get; set; } = 0.0;
}

/// <summary>
/// Tek bir iterasyonun sonucu
/// </summary>
public class SpringbackIteration
{
    /// <summary>
    /// İterasyon numarası (1'den başlar)
    /// </summary>
    public int Number { get; set; }

    /// <summary>
    /// Ölçüm yapılan taraf
    /// </summary>
    public string MeasurementSide { get; set; } = "";

    /// <summary>
    /// SLPIS sensörden okunan sehim yüksekliği H (mm)
    /// </summary>
    public double SensorValueMm { get; set; }

    /// <summary>
    /// SLPIS ile hesaplanan radyüs R (mm)
    /// </summary>
    public double RadiusMm { get; set; }

    /// <summary>
    /// Ölçülen çap D = 2R (mm)
    /// </summary>
    public double MeasuredDiameterMm { get; set; }

    /// <summary>
    /// Hedef ile ölçülen arasındaki fark (mm)
    /// </summary>
    public double ErrorMm { get; set; }

    /// <summary>
    /// Tolerans içinde mi?
    /// </summary>
    public bool IsWithinTolerance { get; set; }

    /// <summary>
    /// Düzeltilmiş çap (mm)
    /// </summary>
    public double CorrectedDiameterMm { get; set; }

    /// <summary>
    /// Düzeltme için hesaplanan piston pozisyonu (mm)
    /// </summary>
    public double CorrectionPositionMm { get; set; }

    /// <summary>
    /// Düzeltme adım 1 tamamlandı mı (aktif piston tarafı)
    /// </summary>
    public bool CorrectionStep1Done { get; set; }

    /// <summary>
    /// Düzeltme adım 2 tamamlandı mı (pasif piston tarafı)
    /// </summary>
    public bool CorrectionStep2Done { get; set; }

    /// <summary>
    /// İterasyon durumu
    /// </summary>
    public string Status { get; set; } = "";
}

/// <summary>
/// Yarı-otomatik springback düzeltme sonucu
/// </summary>
public class SpringbackAutoCorrectResult
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string? Error { get; set; }

    /// <summary>
    /// Toplam iterasyon sayısı
    /// </summary>
    public int TotalIterations { get; set; }

    /// <summary>
    /// Hedef çap (mm)
    /// </summary>
    public double TargetDiameterMm { get; set; }

    /// <summary>
    /// Final ölçülen çap (mm)
    /// </summary>
    public double FinalMeasuredDiameterMm { get; set; }

    /// <summary>
    /// Final hata (mm)
    /// </summary>
    public double FinalErrorMm { get; set; }

    /// <summary>
    /// Tolerans içinde mi?
    /// </summary>
    public bool IsWithinTolerance { get; set; }

    /// <summary>
    /// Maksimum iterasyona ulaşıldı mı?
    /// </summary>
    public bool MaxIterationsReached { get; set; }

    /// <summary>
    /// Başarılı büküm için önerilen başlangıç çapı
    /// (Know-how olarak kaydedilebilir)
    /// </summary>
    public double RecommendedStartDiameterMm { get; set; }

    /// <summary>
    /// Tüm iterasyonların detayları
    /// </summary>
    public List<SpringbackIteration> Iterations { get; set; } = new();

    /// <summary>
    /// Öneri mesajı
    /// </summary>
    public string? Recommendation { get; set; }

    public static SpringbackAutoCorrectResult Fail(string error)
    {
        return new SpringbackAutoCorrectResult
        {
            Success = false,
            Error = error
        };
    }
}
