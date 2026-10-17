using CncBendingMachine.Core.Models;

namespace CncBendingMachine.Application.Services;

/// <summary>
/// Springback (Geri Esneme) hesaplama servisi
///
/// Algoritma (CLAUDESON.txt):
/// 1. Büküm yap (hedef çap ile)
/// 2. Springback ölçümü yap (piston pozisyonunu al)
/// 3. Goal-Seek ile ölçülen pozisyondan gerçek çapı hesapla
/// 4. Düzeltme formülü uygula
/// 5. Tolerans içindeyse bitir, değilse tekrarla (max 20 iterasyon)
/// </summary>
public class SpringbackCalculator : ISpringbackCalculator
{
    private readonly IBendingCalculator _bendingCalculator;

    // Sabit parametreler (kullanıcı tarafından onaylandı)
    public const double CorrectionCoefficient = 0.25;  // Düzeltme katsayısı
    public const double ToleranceMm = 10.0;            // Tolerans (mm)
    public const int MaxIterations = 20;              // Maksimum iterasyon

    public SpringbackCalculator(IBendingCalculator bendingCalculator)
    {
        _bendingCalculator = bendingCalculator;
    }

    /// <summary>
    /// Goal-Seek: Piston pozisyonundan çap hesapla
    /// </summary>
    /// <param name="pistonPositionMm">Ölçülen piston pozisyonu (mm)</param>
    /// <param name="machineParams">Makine parametreleri</param>
    /// <returns>Hesaplanan çap (mm) veya null</returns>
    public double? CalculateDiameterFromPosition(double pistonPositionMm, BendingCalculationInput machineParams)
    {
        return _bendingCalculator.CalculateDiameterFromPosition(pistonPositionMm, machineParams);
    }

    /// <summary>
    /// Düzeltme formülü uygula
    ///
    /// FORMÜL:
    /// Error = (ÖlçülenÇap - HedefÇap) × 0.25
    ///
    /// İlk iterasyon: DüzeltilmişÇap = HedefÇap - Error
    /// Sonraki iterasyonlar: DüzeltilmişÇap = ÖncekiDüzeltmeÇapı - Error
    /// </summary>
    /// <param name="targetDiameter">Hedef çap (sabit, değişmez)</param>
    /// <param name="previousCorrectionDiameter">Önceki düzeltme çapı (ilk iterasyonda = hedef)</param>
    /// <param name="measuredDiameter">Ölçülen gerçek çap (Goal-Seek sonucu)</param>
    /// <param name="iterationNumber">İterasyon numarası (1'den başlar)</param>
    /// <returns>Düzeltilmiş yeni hedef çap</returns>
    public double CalculateCorrectionDiameter(double targetDiameter, double previousCorrectionDiameter, double measuredDiameter, int iterationNumber)
    {
        // Error her zaman HEDEF'e göre hesaplanır
        double error = (measuredDiameter - targetDiameter) * CorrectionCoefficient;

        // İlk iterasyonda hedeften, sonrakilerde önceki düzeltmeden çıkar
        double correctedDiameter;
        if (iterationNumber == 1)
        {
            correctedDiameter = targetDiameter - error;
        }
        else
        {
            correctedDiameter = previousCorrectionDiameter - error;
        }

        return Math.Round(correctedDiameter, 2);
    }

    /// <summary>
    /// Tolerans kontrolü yap
    /// </summary>
    /// <param name="targetDiameter">Hedef çap</param>
    /// <param name="measuredDiameter">Ölçülen çap</param>
    /// <returns>Tolerans içinde mi?</returns>
    public bool IsWithinTolerance(double targetDiameter, double measuredDiameter)
    {
        return Math.Abs(targetDiameter - measuredDiameter) <= ToleranceMm;
    }

    /// <summary>
    /// Tam springback iterasyon hesaplaması
    /// </summary>
    public SpringbackIterationResult CalculateIteration(SpringbackIterationInput input)
    {
        var result = new SpringbackIterationResult
        {
            IterationNumber = input.IterationNumber,
            PreviousDiameter = input.PreviousDiameter,
            SpringbackPositionMm = input.SpringbackPositionMm
        };

        // Step 1: Goal-Seek ile ölçülen pozisyondan çap hesapla
        var measuredDiameter = CalculateDiameterFromPosition(input.SpringbackPositionMm, input.MachineParams);

        if (!measuredDiameter.HasValue)
        {
            result.Success = false;
            result.ErrorMessage = "Goal-Seek başarısız: Pozisyondan çap hesaplanamadı";
            return result;
        }

        result.MeasuredDiameter = measuredDiameter.Value;

        // Step 2: Tolerans kontrolü
        result.ErrorMm = Math.Abs(input.TargetDiameter - measuredDiameter.Value);
        result.IsWithinTolerance = IsWithinTolerance(input.TargetDiameter, measuredDiameter.Value);

        if (result.IsWithinTolerance)
        {
            result.Success = true;
            result.Message = $"Tolerans içinde! Hedef: {input.TargetDiameter}mm, Ölçülen: {measuredDiameter.Value}mm, Hata: {result.ErrorMm:F2}mm";
            result.NeedMoreIterations = false;
            return result;
        }

        // Step 3: Max iterasyon kontrolü
        if (input.IterationNumber >= MaxIterations)
        {
            result.Success = false;
            result.ErrorMessage = $"Maksimum iterasyon sayısına ulaşıldı ({MaxIterations}). Son hata: {result.ErrorMm:F2}mm";
            result.NeedMoreIterations = false;
            return result;
        }

        // Step 4: Düzeltme hesapla
        result.CorrectedDiameter = CalculateCorrectionDiameter(
            input.TargetDiameter,
            input.PreviousDiameter,
            measuredDiameter.Value,
            input.IterationNumber);

        // Step 5: Düzeltilmiş çap için yeni piston pozisyonu hesapla
        var correctedInput = new BendingCalculationInput
        {
            BallDiameter = input.MachineParams.BallDiameter,
            Thickness = input.MachineParams.Thickness,
            CenterDistance = input.MachineParams.CenterDistance,
            TargetBendingDiameter = result.CorrectedDiameter,
            XA1 = input.MachineParams.XA1,
            YA1 = input.MachineParams.YA1,
            Theta = input.MachineParams.Theta
        };

        var newPositionResult = _bendingCalculator.Calculate(correctedInput);

        if (!newPositionResult.Success)
        {
            result.Success = false;
            result.ErrorMessage = $"Düzeltilmiş çap için pozisyon hesaplanamadı: {newPositionResult.ErrorMessage}";
            return result;
        }

        result.NewPistonPositionMm = newPositionResult.PistonPosition;
        result.NeedMoreIterations = true;
        result.Success = true;
        result.Message = $"İterasyon {input.IterationNumber}: Ölçülen={measuredDiameter.Value}mm, Düzeltilmiş={result.CorrectedDiameter}mm, Yeni pozisyon={result.NewPistonPositionMm}mm";

        return result;
    }
}

/// <summary>
/// Springback hesaplama interface
/// </summary>
public interface ISpringbackCalculator
{
    /// <summary>
    /// Goal-Seek: Piston pozisyonundan çap hesapla
    /// </summary>
    double? CalculateDiameterFromPosition(double pistonPositionMm, BendingCalculationInput machineParams);

    /// <summary>
    /// Düzeltme formülü uygula
    /// </summary>
    double CalculateCorrectionDiameter(double targetDiameter, double previousCorrectionDiameter, double measuredDiameter, int iterationNumber);

    /// <summary>
    /// Tolerans kontrolü
    /// </summary>
    bool IsWithinTolerance(double targetDiameter, double measuredDiameter);

    /// <summary>
    /// Tam iterasyon hesaplaması
    /// </summary>
    SpringbackIterationResult CalculateIteration(SpringbackIterationInput input);
}

/// <summary>
/// Springback iterasyon girdi parametreleri
/// </summary>
public class SpringbackIterationInput
{
    /// <summary>
    /// İterasyon numarası (1'den başlar)
    /// </summary>
    public int IterationNumber { get; set; }

    /// <summary>
    /// Hedef (istenen) çap
    /// </summary>
    public double TargetDiameter { get; set; }

    /// <summary>
    /// Bu iterasyonda kullanılan çap (ilk iterasyonda = TargetDiameter)
    /// </summary>
    public double PreviousDiameter { get; set; }

    /// <summary>
    /// Springback ölçümünden alınan piston pozisyonu (mm)
    /// </summary>
    public double SpringbackPositionMm { get; set; }

    /// <summary>
    /// Makine parametreleri (Goal-Seek için gerekli)
    /// </summary>
    public BendingCalculationInput MachineParams { get; set; } = new();
}

/// <summary>
/// Springback iterasyon sonucu
/// </summary>
public class SpringbackIterationResult
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// İterasyon numarası
    /// </summary>
    public int IterationNumber { get; set; }

    /// <summary>
    /// Önceki hedef çap (büküm için kullanılan)
    /// </summary>
    public double PreviousDiameter { get; set; }

    /// <summary>
    /// Springback pozisyonu (mm)
    /// </summary>
    public double SpringbackPositionMm { get; set; }

    /// <summary>
    /// Goal-Seek ile hesaplanan gerçek çap
    /// </summary>
    public double MeasuredDiameter { get; set; }

    /// <summary>
    /// Hedef ile ölçülen arasındaki fark (mm)
    /// </summary>
    public double ErrorMm { get; set; }

    /// <summary>
    /// Tolerans (10mm) içinde mi?
    /// </summary>
    public bool IsWithinTolerance { get; set; }

    /// <summary>
    /// Düzeltilmiş yeni hedef çap
    /// </summary>
    public double CorrectedDiameter { get; set; }

    /// <summary>
    /// Düzeltilmiş çap için yeni piston pozisyonu
    /// </summary>
    public double NewPistonPositionMm { get; set; }

    /// <summary>
    /// Daha fazla iterasyon gerekiyor mu?
    /// </summary>
    public bool NeedMoreIterations { get; set; }
}
