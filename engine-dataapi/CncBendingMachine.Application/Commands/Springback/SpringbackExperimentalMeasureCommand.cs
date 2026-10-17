using MediatR;

namespace CncBendingMachine.Application.Commands.Springback;

/// <summary>
/// SLPIS sensörlü geri esneme ölçümü komutu
///
/// YÖNTEM:
/// 1. Pnömatik uzat → SLPIS prop çubuğu parçaya temas etsin
/// 2. Sensör değerini oku (H = sehim yüksekliği)
/// 3. R = (L² + H²) / (2H) formülü ile radyüs hesapla
///
/// Piston hareketi YOK - sadece pnömatik + sensör okuma + formül
/// </summary>
public record SpringbackExperimentalMeasureCommand : IRequest<SpringbackExperimentalMeasureResult>
{
    /// <summary>
    /// Ölçüm yapılacak taraf: "Right" veya "Left"
    /// </summary>
    public required string Side { get; init; }

    /// <summary>
    /// Parça genişliği (mm) - formülde L/2 olarak kullanılır
    /// Örn: 100mm girilirse L = 50mm olarak hesaplanır
    /// </summary>
    public double PartWidthMm { get; init; }

    /// <summary>
    /// Pnömatik bekleme süresi (ms) - sensörün parçaya oturması için
    /// </summary>
    public int PneumaticWaitMs { get; init; } = 5000;

    /// <summary>
    /// Sensör okuma stabilite süresi (ms) - değer sabitlenene kadar bekle
    /// </summary>
    public int StableTimeMs { get; init; } = 1000;

    /// <summary>
    /// Stabilite eşiği (mm) - ardışık okumalar arası fark bu değerin altındaysa sabit sayılır
    /// </summary>
    public double StableThresholdMm { get; init; } = 0.05;

    /// <summary>
    /// Ölçüm zaman aşımı (ms)
    /// </summary>
    public int TimeoutMs { get; init; } = 15000;

    /// <summary>
    /// Kaç okuma ortalaması alınsın (sabitlendikten sonra)
    /// </summary>
    public int AverageSampleCount { get; init; } = 5;

    /// <summary>
    /// Rulman çapı (mm) - sonuçtan R_net = R_ham - (RulmanÇapı / 2) olarak çıkarılır
    /// Varsayılan: 35mm
    /// </summary>
    public double RollerDiameterMm { get; init; } = 35.0;
}

/// <summary>
/// SLPIS sensörlü geri esneme ölçümü sonucu
/// </summary>
public class SpringbackExperimentalMeasureResult
{
    public bool Success { get; init; }
    public string? Error { get; init; }

    /// <summary>
    /// Sensörden okunan sehim yüksekliği H (mm)
    /// </summary>
    public double? SensorValueMm { get; init; }

    /// <summary>
    /// Sensör ham ADC değeri
    /// </summary>
    public int? SensorRawValue { get; init; }

    /// <summary>
    /// Hesaplanan radyüs R (mm) = (L² + H²) / (2H)
    /// </summary>
    public double? RadiusMm { get; init; }

    /// <summary>
    /// Hesaplanan çap D (mm) = 2 * R
    /// </summary>
    public double? DiameterMm { get; init; }

    /// <summary>
    /// Formülde kullanılan L değeri (mm) = PartWidthMm / 2
    /// </summary>
    public double? HalfWidthMm { get; init; }

    /// <summary>
    /// Ölçüm süresi (ms)
    /// </summary>
    public int? MeasurementDurationMs { get; init; }

    public static SpringbackExperimentalMeasureResult Ok(
        double sensorValueMm,
        int sensorRawValue,
        double radiusMm,
        double halfWidthMm,
        int measurementDurationMs)
        => new()
        {
            Success = true,
            SensorValueMm = sensorValueMm,
            SensorRawValue = sensorRawValue,
            RadiusMm = radiusMm,
            DiameterMm = radiusMm * 2.0,
            HalfWidthMm = halfWidthMm,
            MeasurementDurationMs = measurementDurationMs
        };

    public static SpringbackExperimentalMeasureResult Fail(string error)
        => new() { Success = false, Error = error };
}
