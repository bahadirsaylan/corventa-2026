using MediatR;
using Microsoft.Extensions.Logging;
using CncBendingMachine.Application.Commands.Springback;
using CncBendingMachine.Core.Enums;
using CncBendingMachine.Core.Interfaces;

namespace CncBendingMachine.Application.Handlers.Springback;

/// <summary>
/// SLPIS sensörlü geri esneme ölçümü handler
///
/// OPKON SLPIS-25 Lineer Potansiyometre:
/// - Strok: 25mm
/// - Çıkış: 4-20mA (dönüştürücü ile) → 12-bit ADC (0-4095)
/// - Tekrarlanabilirlik: 0.002mm
///
/// AKIŞ:
/// 1. Pnömatik uzat → SLPIS prop çubuğu bükülmüş parçaya temas eder
/// 2. Sensör değerinin sabitlenmesini bekle
/// 3. H değerini oku (sehim yüksekliği)
/// 4. R = (L² + H²) / (2H) formülü ile radyüs hesapla
/// 5. Pnömatik geri çek
///
/// Piston hareketi YOK - eski yöntemden çok daha basit!
/// </summary>
public class SpringbackExperimentalMeasureHandler
    : IRequestHandler<SpringbackExperimentalMeasureCommand, SpringbackExperimentalMeasureResult>
{
    private readonly IMachineOrchestrator _orchestrator;
    private readonly ILogger<SpringbackExperimentalMeasureHandler> _logger;

    // Polling aralığı (ms)
    private const int PollIntervalMs = 50;

    public SpringbackExperimentalMeasureHandler(
        IMachineOrchestrator orchestrator,
        ILogger<SpringbackExperimentalMeasureHandler> logger)
    {
        _orchestrator = orchestrator;
        _logger = logger;
    }

    public async Task<SpringbackExperimentalMeasureResult> Handle(
        SpringbackExperimentalMeasureCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("========================================");
        _logger.LogInformation("SLPIS GERİ ESNEME ÖLÇÜMÜ BAŞLIYOR");
        _logger.LogInformation("Taraf: {Side}, Parça Genişliği: {Width}mm", request.Side, request.PartWidthMm);
        _logger.LogInformation("========================================");

        try
        {
            // ============================================================
            // DOĞRULAMA
            // ============================================================
            bool isRight = request.Side.Equals("Right", StringComparison.OrdinalIgnoreCase);
            bool isLeft = request.Side.Equals("Left", StringComparison.OrdinalIgnoreCase);

            if (!isRight && !isLeft)
            {
                return SpringbackExperimentalMeasureResult.Fail(
                    $"Geçersiz taraf: {request.Side}. 'Right' veya 'Left' olmalı.");
            }

            if (request.PartWidthMm <= 0)
            {
                return SpringbackExperimentalMeasureResult.Fail(
                    "Parça genişliği (PartWidthMm) pozitif olmalıdır.");
            }

            var pistonId = isRight ? PistonId.Right : PistonId.Left;
            double halfL = request.PartWidthMm / 2.0;

            _logger.LogInformation("Formül parametreleri: L = {L:F2}mm (parça genişliğinin yarısı)", halfL);

            // ============================================================
            // ADIM 1: PNÖMATİK UZAT
            // ============================================================
            _logger.LogInformation("ADIM 1: Pnömatik uzatılıyor → sensör parçaya temas edecek");

            cancellationToken.ThrowIfCancellationRequested();

            var pneumaticResult = await _orchestrator.ExecutePneumaticControlAsync(pistonId, 1);
            if (!pneumaticResult.Success)
            {
                return SpringbackExperimentalMeasureResult.Fail(
                    $"Pnömatik uzatma hatası: {pneumaticResult.Error}");
            }

            // Pnömatik bekleme - sensörün parçaya oturması için
            _logger.LogInformation("Pnömatik bekleniyor ({Wait}ms)...", request.PneumaticWaitMs);
            await Task.Delay(request.PneumaticWaitMs, cancellationToken);

            // ============================================================
            // ADIM 2: ÖLÇÜM — KAYAN PENCERE ORTALAMASI ÜZERİNDE MAX
            // Sensör zero offset uygulanmış (SlpisSensorEffectiveMm) değerleri kullanılır.
            // Belirli süre boyunca örnekleme → kayan pencere ortalaması → MAX.
            // Anlık gürültü pikleri pencere ortalamasıyla filtrelenir, gerçek en yüksek
            // temas değeri yakalanır.
            // ============================================================
            int sampleDurationMs = request.TimeoutMs > 500 ? request.TimeoutMs : 2000;
            int windowSize = Math.Max(1, request.AverageSampleCount);
            _logger.LogInformation("ADIM 2: Ölçüm başlıyor — {Dur}ms süre, {Win}'lik kayan pencere MAX stratejisi",
                sampleDurationMs, windowSize);

            var measurementStart = DateTime.UtcNow;
            var sampleEnd = measurementStart.AddMilliseconds(sampleDurationMs);

            var windowMm = new Queue<double>();
            var windowRaw = new Queue<int>();
            double maxWindowAvgMm = double.MinValue;
            double maxWindowAvgRaw = 0;
            int sampleCount = 0;

            while (DateTime.UtcNow < sampleEnd)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var state = await _orchestrator.GetStateAsync();
                int rawValue = state.SlpisSensorRaw;
                // Zero offset uygulanmış değeri kullan (Web UI ile aynı)
                double currentMm = state.SlpisSensorZeroed
                    ? state.SlpisSensorEffectiveMm
                    : state.SlpisSensorMm;

                windowMm.Enqueue(currentMm);
                windowRaw.Enqueue(rawValue);
                if (windowMm.Count > windowSize) { windowMm.Dequeue(); windowRaw.Dequeue(); }

                double avgMm = windowMm.Average();
                if (avgMm > maxWindowAvgMm)
                {
                    maxWindowAvgMm = avgMm;
                    maxWindowAvgRaw = windowRaw.Average();
                }

                sampleCount++;
                _logger.LogDebug("Sensör örnek {N}: {Value:F3}mm (ADC: {Raw}), pencere avg: {Avg:F3}mm",
                    sampleCount, currentMm, rawValue, avgMm);

                await Task.Delay(PollIntervalMs, cancellationToken);
            }

            if (sampleCount == 0 || maxWindowAvgMm == double.MinValue)
            {
                await SafeRetractPneumatic(pistonId, request.PneumaticWaitMs, cancellationToken);
                return SpringbackExperimentalMeasureResult.Fail(
                    $"Ölçüm örneği alınamadı ({sampleDurationMs}ms içinde).");
            }

            double stableValueMm = maxWindowAvgMm;
            int stableRawValue = (int)Math.Round(maxWindowAvgRaw);

            _logger.LogInformation("MAX kayan ortalama: {Value:F3}mm (ADC avg: {Raw}), {Samples} örnek",
                stableValueMm, stableRawValue, sampleCount);

            // ============================================================
            // ADIM 4: PNÖMATİK GERİ ÇEK
            // ============================================================
            _logger.LogInformation("ADIM 4: Pnömatik geri çekiliyor");
            await SafeRetractPneumatic(pistonId, request.PneumaticWaitMs, cancellationToken);

            // ============================================================
            // ADIM 5: RADYÜS HESAPLA
            // ============================================================
            double H = stableValueMm;

            if (H <= 0)
            {
                return SpringbackExperimentalMeasureResult.Fail(
                    $"Sensör değeri geçersiz: H = {H:F3}mm. Sensör parçaya temas etmemiş olabilir.");
            }

            // R_ham = (L² + H²) / (2H)
            double R_ham = (halfL * halfL + H * H) / (2.0 * H);

            // R_net = R_ham - (RulmanÇapı / 2)
            double rollerRadius = request.RollerDiameterMm / 2.0;
            double R = R_ham - rollerRadius;

            var measurementDuration = (int)(DateTime.UtcNow - measurementStart).TotalMilliseconds;

            _logger.LogInformation("========================================");
            _logger.LogInformation("ÖLÇÜM TAMAMLANDI");
            _logger.LogInformation("  Sensör (H): {H:F3}mm (ADC: {Raw})", H, stableRawValue);
            _logger.LogInformation("  Yarı genişlik (L): {L:F2}mm", halfL);
            _logger.LogInformation("  Formül: R_ham = ({L}² + {H}²) / (2 × {H2})", halfL, H, H);
            _logger.LogInformation("  R_ham: {R_ham:F2}mm", R_ham);
            _logger.LogInformation("  Rulman çapı: {D:F1}mm (yarıçap: {R:F1}mm)", request.RollerDiameterMm, rollerRadius);
            _logger.LogInformation("  R_net = R_ham - rulman yarıçapı = {R:F2}mm", R);
            _logger.LogInformation("  RADYÜS (R): {R:F2}mm", R);
            _logger.LogInformation("  ÇAP (D): {D:F2}mm", R * 2.0);
            _logger.LogInformation("  Süre: {Duration}ms", measurementDuration);
            _logger.LogInformation("========================================");

            return SpringbackExperimentalMeasureResult.Ok(
                sensorValueMm: H,
                sensorRawValue: stableRawValue,
                radiusMm: R,
                halfWidthMm: halfL,
                measurementDurationMs: measurementDuration);
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Ölçüm iptal edildi");
            return SpringbackExperimentalMeasureResult.Fail("Ölçüm iptal edildi");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ölçüm hatası");
            return SpringbackExperimentalMeasureResult.Fail($"Ölçüm hatası: {ex.Message}");
        }
    }

    /// <summary>
    /// Pnömatiği güvenli geri çek
    /// </summary>
    private async Task SafeRetractPneumatic(PistonId pistonId, int waitMs, CancellationToken ct)
    {
        try
        {
            await _orchestrator.ExecutePneumaticControlAsync(pistonId, -1);
            await Task.Delay(waitMs, ct);
            await _orchestrator.ExecutePneumaticStopAsync(pistonId);
        }
        catch (OperationCanceledException) { throw; }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Pnömatik geri çekme hatası (göz ardı edildi)");
        }
    }
}
