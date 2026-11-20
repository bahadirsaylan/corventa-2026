using CncBendingMachine.Application.Common;
using CncBendingMachine.Application.Services;
using CncBendingMachine.Core.Models;
using MediatR;

namespace CncBendingMachine.Application.Commands.Springback;

/// <summary>
/// Springback ölçümü tamamlandıktan sonra düzeltme hesapla
/// </summary>
public class CalculateSpringbackCorrectionCommand : IRequest<SpringbackCorrectionResult>
{
    /// <summary>
    /// İterasyon numarası (1'den başlar)
    /// </summary>
    public int IterationNumber { get; set; } = 1;

    /// <summary>
    /// Hedef (istenen) büküm çapı (mm)
    /// </summary>
    public double TargetDiameterMm { get; set; }

    /// <summary>
    /// Bu iterasyonda kullanılan çap (ilk iterasyonda = TargetDiameter)
    /// </summary>
    public double PreviousDiameterMm { get; set; }

    /// <summary>
    /// Springback ölçümünden alınan piston pozisyonu (mm)
    /// (PLC'den state.Springback.DetectedPositionMm)
    /// </summary>
    public double SpringbackPositionMm { get; set; }

    /// <summary>
    /// Makine parametreleri
    /// </summary>
    public MachineParameters MachineParams { get; set; } = new();
}

/// <summary>
/// Makine parametreleri (hesaplama için gerekli)
/// </summary>
public class MachineParameters
{
    /// <summary>
    /// Top (ball) çapı (mm)
    /// </summary>
    public double BallDiameterMm { get; set; } = 220.0;

    /// <summary>
    /// Profil et kalınlığı (mm)
    /// </summary>
    public double ThicknessMm { get; set; }

    /// <summary>
    /// Eksen mesafesi BC (mm)
    /// </summary>
    public double CenterDistanceMm { get; set; } = 490.0;

    /// <summary>
    /// Theta açısı (derece)
    /// </summary>
    public double ThetaDeg { get; set; } = 45.0;

    /// <summary>
    /// XA1 koordinatı
    /// </summary>
    public double XA1 { get; set; } = 0.0;

    /// <summary>
    /// YA1 koordinatı
    /// </summary>
    public double YA1 { get; set; } = 0.0;
}

/// <summary>
/// Springback düzeltme hesaplama sonucu
/// </summary>
public class SpringbackCorrectionResult
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string? Error { get; set; }

    /// <summary>
    /// İterasyon numarası
    /// </summary>
    public int IterationNumber { get; set; }

    /// <summary>
    /// Springback ölçümünden alınan pozisyon (mm)
    /// </summary>
    public double SpringbackPositionMm { get; set; }

    /// <summary>
    /// Goal-Seek ile hesaplanan gerçek çap (mm)
    /// </summary>
    public double MeasuredDiameterMm { get; set; }

    /// <summary>
    /// Hedef çap ile ölçülen arasındaki fark (mm)
    /// </summary>
    public double ErrorMm { get; set; }

    /// <summary>
    /// Tolerans (10mm) içinde mi?
    /// </summary>
    public bool IsWithinTolerance { get; set; }

    /// <summary>
    /// Düzeltilmiş yeni hedef çap (mm)
    /// </summary>
    public double CorrectedDiameterMm { get; set; }

    /// <summary>
    /// Düzeltilmiş çap için yeni piston pozisyonu (mm)
    /// </summary>
    public double NewPistonPositionMm { get; set; }

    /// <summary>
    /// Daha fazla iterasyon gerekiyor mu?
    /// </summary>
    public bool NeedMoreIterations { get; set; }

    /// <summary>
    /// Maksimum iterasyona ulaşıldı mı?
    /// </summary>
    public bool MaxIterationsReached { get; set; }

    public static SpringbackCorrectionResult Fail(string error)
    {
        return new SpringbackCorrectionResult { Success = false, Error = error };
    }
}
