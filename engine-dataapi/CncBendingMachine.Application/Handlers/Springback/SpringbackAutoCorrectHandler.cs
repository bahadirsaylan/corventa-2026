using CncBendingMachine.Application.Commands.Springback;
using CncBendingMachine.Application.Services;
using CncBendingMachine.Core.Enums;
using CncBendingMachine.Core.Interfaces;
using CncBendingMachine.Core.Models;
using MediatR;
using Microsoft.Extensions.Logging;

namespace CncBendingMachine.Application.Handlers.Springback;

/// <summary>
/// Yarı-otomatik springback düzeltme handler
///
/// AKIŞ (her iterasyonda):
/// 1. ÜST PİSTON BOŞLUK ALMA: Vals topları eşitlenmeden ÖNCE boşluk al (slackPressureBar veya slackDistanceMm)
/// 2. ÖLÇÜM HAZIRLIĞI: Pistonları aynı konuma getir (vals topları eşitleme)
/// 3. PNÖMATİK: Uzat (5sn bekle)
/// 4. ÖLÇÜM: Springback ölçümü başlat
/// 5. BEKLE: Ölçüm tamamlanmasını bekle → Pnömatik geri çek
/// 6. HESAPLA: Goal-Seek ile çap bul
/// 7. DÜZELTME HESAPLA: Tolerans kontrolü → Düzeltme çapı hesapla
/// 8. DÜZELTME ADIM 1: Boşluk al → Aktif piston düzeltme → Pasif piston geri → Rotasyon (tam mesafe)
/// 9. DÜZELTME ADIM 2: Boşluk al → Diğer piston düzeltme → İlk piston geri → Rotasyon (tam mesafe, ters yön)
///
/// NOT: Ölçümler HEP AYNI TARAFTA yapılır (parça gidip geri döner)
/// NOT: Boşluk alma vals topları eşitlenmeden ÖNCE yapılır (eşitlik bozulmasın)
/// </summary>
public class SpringbackAutoCorrectHandler : IRequestHandler<SpringbackAutoCorrectCommand, SpringbackAutoCorrectResult>
{
    private readonly IMachineOrchestrator _orchestrator;
    private readonly IBendingCalculator _bendingCalculator;
    private readonly ISpringbackCalculator _springbackCalculator;
    private readonly ISender _mediator;
    private readonly ILogger<SpringbackAutoCorrectHandler> _logger;

    // Static CancellationTokenSource for external cancellation (API stop)
    private static CancellationTokenSource? _springbackCts;
    public static CancellationTokenSource? SpringbackCancellationSource => _springbackCts;

    // Üst piston boşluk alma hızı (sabit)
    private const int SlackSpeedPercent = 30;  // 3V sabit hız (30% = 3V / 10V)

    // GT-5112 Encoder: 1 pulse = 4 mikron (0.004mm)
    private const double SlpisMmPerPulse = 0.004;

    private readonly BendingLogService _log;

    public SpringbackAutoCorrectHandler(
        IMachineOrchestrator orchestrator,
        IBendingCalculator bendingCalculator,
        ISpringbackCalculator springbackCalculator,
        ISender mediator,
        BendingLogService log,
        ILogger<SpringbackAutoCorrectHandler> logger)
    {
        _orchestrator = orchestrator;
        _bendingCalculator = bendingCalculator;
        _springbackCalculator = springbackCalculator;
        _mediator = mediator;
        _log = log;
        _logger = logger;
    }

    public async Task<SpringbackAutoCorrectResult> Handle(
        SpringbackAutoCorrectCommand request,
        CancellationToken cancellationToken)
    {
        // Create linked CancellationTokenSource for external stop capability
        _springbackCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        var linkedToken = _springbackCts.Token;

        _logger.LogInformation(
            "=== GERİ ESNEME DÜZELTME BAŞLIYOR ===\n" +
            "Hedef çap: {Target}mm, Parça tarafı: {Side}, Parça boyu: {Length}mm",
            request.TargetDiameterMm,
            request.PartSide,
            request.PartLengthMm);
        _log.LogSpringback(request.JobId, $"Geri esneme düzeltme başlıyor: hedef={request.TargetDiameterMm}mm, taraf={request.PartSide}", request.TargetDiameterMm);

        // Validate inputs
        var validationError = ValidateRequest(request);
        if (validationError != null)
        {
            return SpringbackAutoCorrectResult.Fail(validationError);
        }

        // Parse side
        bool partOnRight = request.PartSide.ToLower() == "right";

        // Prepare machine params for calculations
        var machineParams = new BendingCalculationInput
        {
            BallDiameter = request.MachineParams.BallDiameterMm,
            Thickness = request.MachineParams.ThicknessMm,
            CenterDistance = request.MachineParams.CenterDistanceMm,
            Theta = request.MachineParams.ThetaDeg,
            XA1 = request.MachineParams.XA1,
            YA1 = request.MachineParams.YA1
        };

        // Absolute rotation targets (fixed positions)
        int homePosition = 0;  // Sol taraf
        int farPosition = (int)(request.PartLengthMm - (request.SafetyMarginMm * 2));  // Sağ taraf

        _logger.LogInformation("Absolute rotasyon hedefleri: Home={Home}mm (sol), Far={Far}mm (sağ)", homePosition, farPosition);

        var result = new SpringbackAutoCorrectResult
        {
            TargetDiameterMm = request.TargetDiameterMm,
            Iterations = new List<SpringbackIteration>()
        };

        double previousDiameter = request.TargetDiameterMm;
        int iterationNumber = 0;

        try
        {
            while (iterationNumber < request.MaxIterations)
            {
                linkedToken.ThrowIfCancellationRequested();

                iterationNumber++;
                _logger.LogInformation("\n=== İTERASYON {Iter} ===", iterationNumber);

                var iteration = new SpringbackIteration
                {
                    Number = iterationNumber,
                    MeasurementSide = partOnRight ? "Right" : "Left"
                };

                // ============================================================
                // ADIM 1: ÜST PİSTON BOŞLUK ALMA (Vals topları eşitlenmeden ÖNCE)
                // ============================================================
                linkedToken.ThrowIfCancellationRequested();
                _logger.LogInformation("ADIM 1: Üst piston boşluk alma (vals topları eşitlenmeden önce)");

                // Stop first to reset latch
                await _orchestrator.ExecutePistonStopAsync(PistonId.Upper);
                await Task.Delay(200, linkedToken);

                // Üst piston için mevcut state'i al
                var stateBeforeMeasurement = await _orchestrator.GetStateAsync();

                // Mesafe bazlı mı yoksa basınç bazlı mı?
                if (request.SlackDistanceMm.HasValue && request.SlackDistanceMm.Value > 0)
                {
                    // MESAFE BAZLI BOŞLUK ALMA
                    double upperCurrentPos = stateBeforeMeasurement.UpperPiston.PositionMm;
                    double slackTargetPos = upperCurrentPos + request.SlackDistanceMm.Value;

                    linkedToken.ThrowIfCancellationRequested();
                    _logger.LogInformation("Üst piston {Distance}mm mesafe ile boşluk alıyor ({Current}mm → {Target}mm)",
                        request.SlackDistanceMm.Value, upperCurrentPos, slackTargetPos);

                    var slackResult = await _orchestrator.ExecutePistonMoveToPositionAsync(
                        PistonId.Upper, slackTargetPos, SlackSpeedPercent);
                    if (!slackResult.Success)
                    {
                        iteration.Status = $"Üst piston boşluk alma hatası (ölçüm öncesi): {slackResult.Error}";
                        result.Iterations.Add(iteration);
                        return FailWithIterations(result, iteration.Status);
                    }
                    await _orchestrator.WaitForPistonInPositionAsync(PistonId.Upper, linkedToken);
                }
                else
                {
                    // BASINÇ BAZLI BOŞLUK ALMA (ölçüm öncesi +1 bar fazla)
                    int preMeasurementPressure = request.SlackPressureBar + 1;
                    linkedToken.ThrowIfCancellationRequested();
                    _logger.LogInformation("Üst piston {Bar} bar basınç ile boşluk alıyor (ölçüm öncesi: {Base}+1)",
                        preMeasurementPressure, request.SlackPressureBar);

                    var slackResult = await _orchestrator.ExecutePistonMoveToPressureAsync(
                        PistonId.Upper, 1, preMeasurementPressure, SlackSpeedPercent);
                    if (!slackResult.Success)
                    {
                        iteration.Status = $"Üst piston boşluk alma hatası (ölçüm öncesi): {slackResult.Error}";
                        result.Iterations.Add(iteration);
                        return FailWithIterations(result, iteration.Status);
                    }
                    await Task.Delay(1000, linkedToken); // Basınç stabilizasyonu
                }

                // ============================================================
                // ADIM 2: PNÖMATİK UZAT + SLPIS OKU (basit ölçüm)
                // Sıyrılma tespiti YOK — SpringbackExperimentalMeasureCommand delege ediyoruz:
                // pnömatik uzat → SLPIS stabilite → pnömatik geri → R/D hesapla.
                // ============================================================
                linkedToken.ThrowIfCancellationRequested();
                _logger.LogInformation("ADIM 2: Pnömatik uzat + SLPIS oku ({Side})", iteration.MeasurementSide);

                // PartWidth = SlpisLMm * 2 (experimental handler PartWidthMm / 2'yi L olarak kullanıyor)
                double measurePartWidth = request.SlpisLMm * 2.0;

                var measureResult = await _mediator.Send(new SpringbackExperimentalMeasureCommand
                {
                    Side = iteration.MeasurementSide,
                    PartWidthMm = measurePartWidth,
                    RollerDiameterMm = request.SlpisRulmanCapMm,
                    StableTimeMs = request.MeasurementParams.StableTimeMs,
                    StableThresholdMm = request.MeasurementParams.MinThresholdMm
                }, linkedToken);

                if (!measureResult.Success || measureResult.SensorValueMm is null || measureResult.RadiusMm is null)
                {
                    iteration.Status = $"SLPIS ölçüm hatası: {measureResult.Error ?? "sensör değeri alınamadı"}";
                    result.Iterations.Add(iteration);
                    return FailWithIterations(result, iteration.Status);
                }

                double H = measureResult.SensorValueMm.Value;
                double R_net = measureResult.RadiusMm.Value;
                double D = measureResult.DiameterMm ?? (R_net * 2.0);
                int detectionSlpisRaw = measureResult.SensorRawValue ?? 0;

                // Sonuçları iterasyona kaydet
                iteration.SensorValueMm = H;
                iteration.RadiusMm = R_net;
                iteration.MeasuredDiameterMm = D;
                iteration.ErrorMm = Math.Abs(request.TargetDiameterMm - D);
                iteration.IsWithinTolerance = iteration.ErrorMm <= request.ToleranceMm;

                _log.LogSpringback(request.JobId, $"SLPIS ölçüm: H={H:F3}mm (ADC={detectionSlpisRaw}), R={R_net:F2}mm, D={D:F2}mm",
                    D, request.TargetDiameterMm);
                _logger.LogInformation(
                    "SLPIS ölçüm: H={H:F3}mm (ADC={Raw}), L={L:F1}mm, R={R:F2}mm, D={D:F2}mm, Hedef={Target}mm, Hata={Error:F2}mm",
                    H, detectionSlpisRaw, request.SlpisLMm, R_net, D, request.TargetDiameterMm, iteration.ErrorMm);

                // ============================================================
                // TOLERANS KONTROLÜ
                // ============================================================
                if (iteration.IsWithinTolerance)
                {
                    iteration.Status = "TOLERANS İÇİNDE - TAMAMLANDI!";
                    result.Iterations.Add(iteration);

                    result.Success = true;
                    result.TotalIterations = iterationNumber;
                    result.FinalMeasuredDiameterMm = iteration.MeasuredDiameterMm;
                    result.FinalErrorMm = iteration.ErrorMm;
                    result.IsWithinTolerance = true;
                    result.RecommendedStartDiameterMm = previousDiameter;
                    result.Message = $"Başarılı! {iterationNumber} iterasyonda tolerans içine girildi.";
                    result.Recommendation = $"Know-how: Bu malzeme için başlangıç çapı olarak {previousDiameter:F1}mm kullanın.";

                    _logger.LogInformation("=== GERİ ESNEME DÜZELTME BAŞARILI! ===");
                    return result;
                }

                // ============================================================
                // FAZLA BÜKÜM KONTROLÜ
                // ============================================================
                // Ölçülen çap <= hedef çap ise parça yeterli/fazla bükülmüş demektir.
                // Pistonları daha az konuma göndererek parçayı "açamayız" - fiziksel olarak imkansız!
                // Bu durumda düzeltme yapılamaz, işlem başarılı sayılır.
                if (iteration.MeasuredDiameterMm <= request.TargetDiameterMm)
                {
                    iteration.Status = "PARÇA YETERLİ/FAZLA BÜKÜLMÜŞ - DÜZELTME GEREKMİYOR!";
                    result.Iterations.Add(iteration);

                    result.Success = true;
                    result.TotalIterations = iterationNumber;
                    result.FinalMeasuredDiameterMm = iteration.MeasuredDiameterMm;
                    result.FinalErrorMm = iteration.ErrorMm;
                    result.IsWithinTolerance = false; // Tolerans dışı ama düzeltilemez
                    result.RecommendedStartDiameterMm = previousDiameter;
                    result.Message = $"Parça yeterli/fazla bükülmüş. Ölçülen: {iteration.MeasuredDiameterMm}mm ≤ Hedef: {request.TargetDiameterMm}mm";
                    result.Recommendation = $"Parça hedef çapa ulaşmış veya daha fazla bükülmüş. Düzeltme gerekmiyor.";

                    _logger.LogInformation("=== PARÇA YETERLİ BÜKÜLMÜŞ - GERİ ESNEME YOK ===");
                    return result;
                }

                // ============================================================
                // ADIM 7: DÜZELTME HESAPLA (Sadece ölçülen > hedef ise)
                // ============================================================
                _logger.LogInformation("ADIM 7: Düzeltme hesaplanıyor");

                double correctedDiameter = _springbackCalculator.CalculateCorrectionDiameter(
                    request.TargetDiameterMm,    // Hedef çap (sabit)
                    previousDiameter,             // Önceki düzeltme çapı
                    iteration.MeasuredDiameterMm,       // Ölçülen çap
                    iterationNumber);             // İterasyon numarası

                iteration.CorrectedDiameterMm = correctedDiameter;

                // Düzeltme için piston pozisyonu hesapla
                machineParams.TargetBendingDiameter = correctedDiameter;
                var correctionCalc = _bendingCalculator.Calculate(machineParams);

                if (!correctionCalc.Success)
                {
                    iteration.Status = $"Düzeltme pozisyonu hesaplanamadı: {correctionCalc.ErrorMessage}";
                    result.Iterations.Add(iteration);
                    return FailWithIterations(result, iteration.Status);
                }

                double correctionPosition = correctionCalc.PistonPosition;
                iteration.CorrectionPositionMm = correctionPosition;

                _logger.LogInformation(
                    "Düzeltilmiş çap: {Corrected}mm, Düzeltme pozisyonu: {Pos}mm",
                    correctedDiameter, correctionPosition);

                // ============================================================
                // ADIM 8: DÜZELTME ADIM 1 (Parçanın olduğu taraf)
                // ============================================================
                linkedToken.ThrowIfCancellationRequested();
                _logger.LogInformation("ADIM 8: DÜZELTME ADIM 1 başlıyor");

                // Üst piston için mevcut state'i al
                var stateBeforeStep1 = await _orchestrator.GetStateAsync();

                // Üst piston boşluk al
                // IMPORTANT: Stop first to reset bAtPressure/bInPosition latch in PLC
                linkedToken.ThrowIfCancellationRequested();
                await _orchestrator.ExecutePistonStopAsync(PistonId.Upper);
                await Task.Delay(200, linkedToken);  // Wait for PLC to process mode change

                // Mesafe bazlı mı yoksa basınç bazlı mı?
                if (request.SlackDistanceMm.HasValue && request.SlackDistanceMm.Value > 0)
                {
                    // MESAFE BAZLI BOŞLUK ALMA
                    double upperCurrentPos = stateBeforeStep1.UpperPiston.PositionMm;
                    double slackTargetPos = upperCurrentPos + request.SlackDistanceMm.Value;

                    linkedToken.ThrowIfCancellationRequested();
                    _logger.LogInformation("Üst piston {Distance}mm mesafe ile boşluk alıyor ({Current}mm → {Target}mm)",
                        request.SlackDistanceMm.Value, upperCurrentPos, slackTargetPos);

                    var slackResult = await _orchestrator.ExecutePistonMoveToPositionAsync(
                        PistonId.Upper, slackTargetPos, SlackSpeedPercent);
                    if (!slackResult.Success)
                    {
                        iteration.Status = $"Üst piston boşluk alma hatası: {slackResult.Error}";
                        result.Iterations.Add(iteration);
                        return FailWithIterations(result, iteration.Status);
                    }
                    await _orchestrator.WaitForPistonInPositionAsync(PistonId.Upper, linkedToken);
                }
                else
                {
                    // BASINÇ BAZLI BOŞLUK ALMA (geriye dönük uyumluluk)
                    linkedToken.ThrowIfCancellationRequested();
                    _logger.LogInformation("Üst piston {Bar} bar, {Speed}% hız ile boşluk alıyor",
                        request.SlackPressureBar, SlackSpeedPercent);

                    var slackResult = await _orchestrator.ExecutePistonMoveToPressureAsync(
                        PistonId.Upper, 1, request.SlackPressureBar, SlackSpeedPercent);
                    if (!slackResult.Success)
                    {
                        iteration.Status = $"Üst piston boşluk alma hatası: {slackResult.Error}";
                        result.Iterations.Add(iteration);
                        return FailWithIterations(result, iteration.Status);
                    }
                    await Task.Delay(1000, linkedToken); // Basınç stabilizasyonu
                }

                // Aktif piston düzeltme konumuna, pasif piston max geri mesafeye
                PistonId activePiston = partOnRight ? PistonId.Right : PistonId.Left;
                PistonId passivePiston = partOnRight ? PistonId.Left : PistonId.Right;

                // Pasif piston: mevcut pozisyondan geri çek (büküm sürecindeki gibi)
                var passiveState = await _orchestrator.GetStateAsync();
                double passiveCurrentPos = passivePiston == PistonId.Left
                    ? passiveState.LeftPiston.PositionMm
                    : passiveState.RightPiston.PositionMm;
                double passiveBackwardLimit = _orchestrator.GetSafeBackwardLimit(passivePiston);
                // Pasif piston en geri gitsin — safe backward limit (güvenlik payı dahil)
                double passiveTarget = passiveBackwardLimit;

                linkedToken.ThrowIfCancellationRequested();
                _logger.LogInformation("{Active} piston → {Pos}mm (düzeltme konumu)", activePiston, correctionPosition);
                var activeMove = await _orchestrator.ExecutePistonMoveToPositionAsync(
                    activePiston, correctionPosition, request.MovementSpeedPercent);

                linkedToken.ThrowIfCancellationRequested();
                _logger.LogInformation("{Passive} piston → {Pos:F2}mm (mevcut: {Current:F2}mm, limit: {Limit:F2}mm)",
                    passivePiston, passiveTarget, passiveCurrentPos, passiveBackwardLimit);
                var passiveMove = await _orchestrator.ExecutePistonMoveToPositionAsync(
                    passivePiston, passiveTarget, request.MovementSpeedPercent);

                if (!activeMove.Success)
                {
                    iteration.Status = $"Aktif piston ({activePiston}) hareket hatası: {activeMove.Error}";
                    _logger.LogError("Aktif piston ({Active}) hatası: {Error}", activePiston, activeMove.Error);
                    result.Iterations.Add(iteration);
                    return FailWithIterations(result, iteration.Status);
                }
                if (!passiveMove.Success)
                {
                    iteration.Status = $"Pasif piston ({passivePiston}) hareket hatası: {passiveMove.Error}";
                    _logger.LogError("Pasif piston ({Passive}) hatası: {Error}", passivePiston, passiveMove.Error);
                    result.Iterations.Add(iteration);
                    return FailWithIterations(result, iteration.Status);
                }

                // Pistonların pozisyona ulaşmasını bekle
                await _orchestrator.WaitForPistonInPositionAsync(activePiston, linkedToken);
                await _orchestrator.WaitForPistonInPositionAsync(passivePiston, linkedToken);

                // ABSOLUTE ROTASYON: Parçanın olduğu taraftan diğer tarafa
                // partOnRight=true  → parça sağda → hedef: homePosition (0mm) → sola git
                // partOnRight=false → parça solda → hedef: farPosition (1900mm) → sağa git
                int rotationTarget1 = partOnRight ? homePosition : farPosition;

                _logger.LogInformation("Absolute Rotasyon 1: Hedef={Target}mm ({Direction})",
                    rotationTarget1, partOnRight ? "sola" : "sağa");

                linkedToken.ThrowIfCancellationRequested();
                var rotResult1 = await _orchestrator.ExecuteRotationMoveToPositionAsync(
                    rotationTarget1, request.RotationSpeedPercent);
                if (!rotResult1.Success)
                {
                    iteration.Status = $"Rotasyon 1 hatası: {rotResult1.Error}";
                    result.Iterations.Add(iteration);
                    return FailWithIterations(result, iteration.Status);
                }

                // Rotasyonun tamamlanmasını bekle (InPosition kontrolü)
                linkedToken.ThrowIfCancellationRequested();
                await WaitForRotationCompleteAsync(linkedToken);

                iteration.CorrectionStep1Done = true;
                _logger.LogInformation("DÜZELTME ADIM 1 tamamlandı");

                // ============================================================
                // ADIM 9: DÜZELTME ADIM 2 (Diğer taraf)
                // ============================================================
                linkedToken.ThrowIfCancellationRequested();
                _logger.LogInformation("ADIM 9: DÜZELTME ADIM 2 başlıyor");

                // Üst piston için mevcut state'i al
                var stateBeforeStep2 = await _orchestrator.GetStateAsync();

                // Üst piston tekrar boşluk al
                // IMPORTANT: Stop first to reset bAtPressure/bInPosition latch in PLC
                linkedToken.ThrowIfCancellationRequested();
                await _orchestrator.ExecutePistonStopAsync(PistonId.Upper);
                await Task.Delay(200, linkedToken);  // Wait for PLC to process mode change

                // Mesafe bazlı mı yoksa basınç bazlı mı?
                if (request.SlackDistanceMm.HasValue && request.SlackDistanceMm.Value > 0)
                {
                    // MESAFE BAZLI BOŞLUK ALMA
                    double upperCurrentPos2 = stateBeforeStep2.UpperPiston.PositionMm;
                    double slackTargetPos2 = upperCurrentPos2 + request.SlackDistanceMm.Value;

                    linkedToken.ThrowIfCancellationRequested();
                    _logger.LogInformation("Üst piston {Distance}mm mesafe ile boşluk alıyor ({Current}mm → {Target}mm)",
                        request.SlackDistanceMm.Value, upperCurrentPos2, slackTargetPos2);

                    var slackResult2 = await _orchestrator.ExecutePistonMoveToPositionAsync(
                        PistonId.Upper, slackTargetPos2, SlackSpeedPercent);
                    if (!slackResult2.Success)
                    {
                        iteration.Status = $"Üst piston boşluk alma hatası (adım 2): {slackResult2.Error}";
                        result.Iterations.Add(iteration);
                        return FailWithIterations(result, iteration.Status);
                    }
                    await _orchestrator.WaitForPistonInPositionAsync(PistonId.Upper, linkedToken);
                }
                else
                {
                    // BASINÇ BAZLI BOŞLUK ALMA (geriye dönük uyumluluk)
                    linkedToken.ThrowIfCancellationRequested();
                    _logger.LogInformation("Üst piston {Bar} bar, {Speed}% hız ile boşluk alıyor",
                        request.SlackPressureBar, SlackSpeedPercent);

                    var slackResult2 = await _orchestrator.ExecutePistonMoveToPressureAsync(
                        PistonId.Upper, 1, request.SlackPressureBar, SlackSpeedPercent);
                    if (!slackResult2.Success)
                    {
                        iteration.Status = $"Üst piston boşluk alma hatası (adım 2): {slackResult2.Error}";
                        result.Iterations.Add(iteration);
                        return FailWithIterations(result, iteration.Status);
                    }
                    await Task.Delay(1000, linkedToken); // Basınç stabilizasyonu
                }

                // Roller değişti: eski pasif artık aktif, eski aktif artık pasif
                // Yeni pasif piston: mevcut pozisyondan geri çek (büküm sürecindeki gibi)
                var newPassiveState = await _orchestrator.GetStateAsync();
                double newPassiveCurrentPos = activePiston == PistonId.Left
                    ? newPassiveState.LeftPiston.PositionMm
                    : newPassiveState.RightPiston.PositionMm;
                double newPassiveBackwardLimit = _orchestrator.GetSafeBackwardLimit(activePiston);
                // Pasif piston en geri gitsin — safe backward limit (güvenlik payı dahil)
                double newPassiveTarget = newPassiveBackwardLimit;

                linkedToken.ThrowIfCancellationRequested();
                _logger.LogInformation("{NewActive} piston → {Pos}mm (düzeltme konumu)", passivePiston, correctionPosition);
                var newActiveMove = await _orchestrator.ExecutePistonMoveToPositionAsync(
                    passivePiston, correctionPosition, request.MovementSpeedPercent);

                linkedToken.ThrowIfCancellationRequested();
                _logger.LogInformation("{NewPassive} piston → {Pos:F2}mm (mevcut: {Current:F2}mm, limit: {Limit:F2}mm)",
                    activePiston, newPassiveTarget, newPassiveCurrentPos, newPassiveBackwardLimit);
                var newPassiveMove = await _orchestrator.ExecutePistonMoveToPositionAsync(
                    activePiston, newPassiveTarget, request.MovementSpeedPercent);

                if (!newActiveMove.Success)
                {
                    iteration.Status = $"Adım 2 aktif piston ({passivePiston}) hatası: {newActiveMove.Error}";
                    _logger.LogError("Adım 2 aktif piston ({Active}) hatası: {Error}", passivePiston, newActiveMove.Error);
                    result.Iterations.Add(iteration);
                    return FailWithIterations(result, iteration.Status);
                }
                if (!newPassiveMove.Success)
                {
                    iteration.Status = $"Adım 2 pasif piston ({activePiston}) hatası: {newPassiveMove.Error}";
                    _logger.LogError("Adım 2 pasif piston ({Passive}) hatası: {Error}", activePiston, newPassiveMove.Error);
                    result.Iterations.Add(iteration);
                    return FailWithIterations(result, iteration.Status);
                }

                await _orchestrator.WaitForPistonInPositionAsync(passivePiston, linkedToken);
                await _orchestrator.WaitForPistonInPositionAsync(activePiston, linkedToken);

                // ABSOLUTE ROTASYON 2 + ÜÇGEN DESTEK
                // Parça ölçüm tarafına (başlangıca) geri dönüyor. Rotasyon tamamen bitince
                // eşitleme pistonu düzeltme konumuna gider (sıralı üçgen destek).
                int rotationTarget2 = partOnRight ? farPosition : homePosition;

                // Üçgen destek: activePiston (adım 2'de pasif olarak geri çekildi) → correctionPosition'a gidecek
                // activePiston = ölçüm tarafı (right ise right), adım 2'de 0mm'ye çekilmişti
                _logger.LogInformation("Rotasyon 2 + Üçgen Destek: Hedef={Target}mm ({Direction}), {Piston} → {Pos}mm (465mm'de tetiklenecek)",
                    rotationTarget2, partOnRight ? "sağa" : "sola", activePiston, correctionPosition);

                linkedToken.ThrowIfCancellationRequested();

                var rotResult2 = await _orchestrator.ExecuteRotationMoveToPositionAsync(
                    rotationTarget2, request.RotationSpeedPercent);
                if (!rotResult2.Success)
                {
                    iteration.Status = $"Rotasyon 2 hatası: {rotResult2.Error}";
                    result.Iterations.Add(iteration);
                    return FailWithIterations(result, iteration.Status);
                }

                // Rotasyonun TAMAMEN bitmesini bekle
                var rot2StartTime = DateTime.UtcNow;
                while (!linkedToken.IsCancellationRequested)
                {
                    var state = await _orchestrator.GetStateAsync();
                    if (state.Rotation.InPosition && state.Rotation.ActiveDirection == 0)
                    {
                        _logger.LogInformation("Rotasyon 2 tamamlandı: {Rot:F2}mm", state.Rotation.PositionMm);
                        await Task.Delay(100, linkedToken);
                        break;
                    }
                    if ((DateTime.UtcNow - rot2StartTime).TotalMilliseconds > 180000)
                    {
                        iteration.Status = "Rotasyon 2 zaman aşımı";
                        result.Iterations.Add(iteration);
                        return FailWithIterations(result, iteration.Status);
                    }
                    await Task.Delay(50, linkedToken);
                }

                // Rotasyon bitti — şimdi ölçüm pistonu düzeltme konumuna gitsin (eşitleme)
                _logger.LogInformation("ÜÇGEN DESTEK (Eşitleme): {Piston} → {Target:F2}mm", activePiston, correctionPosition);

                var triangleMove = await _orchestrator.ExecutePistonMoveToPositionAsync(
                    activePiston, correctionPosition, request.MovementSpeedPercent);
                if (!triangleMove.Success)
                {
                    iteration.Status = $"Üçgen destek piston hatası: {triangleMove.Error}";
                    result.Iterations.Add(iteration);
                    return FailWithIterations(result, iteration.Status);
                }

                var triangleWait = await _orchestrator.WaitForPistonInPositionAsync(activePiston, linkedToken);
                if (!triangleWait.Success)
                {
                    iteration.Status = $"Üçgen destek piston ({activePiston}) hedefe ulaşamadı";
                    result.Iterations.Add(iteration);
                    return FailWithIterations(result, iteration.Status);
                }

                _logger.LogInformation("✅ ÜÇGEN DESTEK TAMAMLANDI: İki vals topu da {Target:F2}mm", correctionPosition);

                iteration.CorrectionStep2Done = true;
                iteration.Status = $"İterasyon tamamlandı. Ölçülen: {iteration.MeasuredDiameterMm}mm, Düzeltilmiş: {correctedDiameter}mm";
                result.Iterations.Add(iteration);

                _logger.LogInformation("DÜZELTME ADIM 2 + ÜÇGEN DESTEK tamamlandı");
                _logger.LogInformation("=== İTERASYON {Iter} TAMAMLANDI ===\n", iterationNumber);

                // Bir sonraki iterasyon için previousDiameter güncelle
                previousDiameter = correctedDiameter;

                _logger.LogInformation("Parça aynı tarafta kalıyor: {Side}", partOnRight ? "SAĞ" : "SOL");

                // Kısa bekleme
                await Task.Delay(500, linkedToken);
            }

            // Max iterasyona ulaşıldı
            result.TotalIterations = iterationNumber;
            result.MaxIterationsReached = true;
            result.Success = false;
            result.Error = $"Maksimum iterasyon sayısına ({request.MaxIterations}) ulaşıldı.";

            if (result.Iterations.Count > 0)
            {
                var lastIter = result.Iterations.Last();
                result.FinalMeasuredDiameterMm = lastIter.MeasuredDiameterMm;
                result.FinalErrorMm = lastIter.ErrorMm;
                result.RecommendedStartDiameterMm = lastIter.CorrectedDiameterMm;
            }

            _logger.LogWarning("=== GERİ ESNEME DÜZELTME MAX İTERASYONA ULAŞTI ===");
            return result;
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Geri esneme düzeltme iptal edildi");
            result.Success = false;
            result.Error = "İşlem iptal edildi";
            result.TotalIterations = iterationNumber;
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Geri esneme düzeltme hatası");
            result.Success = false;
            result.Error = $"Beklenmeyen hata: {ex.Message}";
            result.TotalIterations = iterationNumber;
            return result;
        }
    }

    /// <summary>
    /// Rotasyonun tamamlanmasını bekle
    /// </summary>
    /// <exception cref="TimeoutException">Rotasyon zaman aşımı durumunda fırlatılır</exception>
    private async Task WaitForRotationCompleteAsync(CancellationToken cancellationToken, int timeoutMs = 180000)
    {
        var startTime = DateTime.UtcNow;
        var timeout = TimeSpan.FromMilliseconds(timeoutMs);

        // Kısa gecikme ile rotasyonun başlamasını bekle
        await Task.Delay(500, cancellationToken);

        while (DateTime.UtcNow - startTime < timeout)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var state = await _orchestrator.GetStateAsync();

            if (state.Rotation.InPosition)
            {
                _logger.LogInformation("Rotasyon tamamlandı");
                return;
            }

            await Task.Delay(200, cancellationToken);
        }

        // Timeout durumunda exception fırlat - işlem DURMALI!
        _logger.LogError("Rotasyon zaman aşımı! ({Timeout}ms)", timeoutMs);
        throw new TimeoutException($"Rotasyon {timeoutMs / 1000} saniye içinde tamamlanamadı");
    }

    private string? ValidateRequest(SpringbackAutoCorrectCommand request)
    {
        if (request.TargetDiameterMm <= 0)
            return "Hedef çap 0'dan büyük olmalı";

        if (request.MachineParams.ThicknessMm <= 0)
            return "Profil yüksekliği (thickness) 0'dan büyük olmalı";

        if (request.PartLengthMm <= 0)
            return "Parça uzunluğu 0'dan büyük olmalı";

        if (request.PartWidthMm <= 0)
            return "Parça genişliği (PartWidthMm) 0'dan büyük olmalı";

        if (request.MaxIterations <= 0 || request.MaxIterations > 20)
            return "Maksimum iterasyon 1-20 arasında olmalı";

        var side = request.PartSide?.ToLower();
        if (side != "right" && side != "left")
            return "Parça tarafı 'right' veya 'left' olmalı";

        return null;
    }

    private SpringbackAutoCorrectResult FailWithIterations(SpringbackAutoCorrectResult result, string error)
    {
        result.Success = false;
        result.Error = error;
        result.TotalIterations = result.Iterations.Count;
        return result;
    }
}

/// <summary>
/// Handler for StopSpringbackAutoCorrectCommand
/// Cancels ongoing springback auto-correct operation
/// </summary>
public class StopSpringbackAutoCorrectHandler : IRequestHandler<StopSpringbackAutoCorrectCommand, bool>
{
    private readonly IMachineOrchestrator _orchestrator;
    private readonly ILogger<StopSpringbackAutoCorrectHandler> _logger;

    public StopSpringbackAutoCorrectHandler(IMachineOrchestrator orchestrator, ILogger<StopSpringbackAutoCorrectHandler> logger)
    {
        _orchestrator = orchestrator;
        _logger = logger;
    }

    public async Task<bool> Handle(StopSpringbackAutoCorrectCommand request, CancellationToken cancellationToken)
    {
        _logger.LogWarning("Springback auto-correct stop requested");

        // Cancel ongoing springback operation
        SpringbackAutoCorrectHandler.SpringbackCancellationSource?.Cancel();

        // Stop springback measurement in PLC FIRST
        await _orchestrator.ExecuteSpringbackStopAsync();

        // Stop all piston movements
        await _orchestrator.ExecutePistonStopAsync(PistonId.Left);
        await _orchestrator.ExecutePistonStopAsync(PistonId.Right);
        await _orchestrator.ExecutePistonStopAsync(PistonId.Upper);
        await _orchestrator.ExecutePistonStopAsync(PistonId.Lower);

        // Stop rotation
        await _orchestrator.ExecuteRotationStopAsync();

        // Stop pneumatics
        await _orchestrator.ExecutePneumaticStopAsync(PistonId.Left);
        await _orchestrator.ExecutePneumaticStopAsync(PistonId.Right);

        _logger.LogInformation("Springback auto-correct stopped - all movements halted");
        return true;
    }
}
