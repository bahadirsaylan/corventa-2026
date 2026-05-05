using CncBendingMachine.Application.Commands.Springback;
using CncBendingMachine.Application.Services;
using CncBendingMachine.Core.Models;
using MediatR;
using Microsoft.Extensions.Logging;

namespace CncBendingMachine.Application.Handlers.Springback;

/// <summary>
/// Handler for CalculateSpringbackCorrectionCommand
/// </summary>
public class CalculateSpringbackCorrectionHandler : IRequestHandler<CalculateSpringbackCorrectionCommand, SpringbackCorrectionResult>
{
    private readonly ISpringbackCalculator _calculator;
    private readonly ILogger<CalculateSpringbackCorrectionHandler> _logger;

    public CalculateSpringbackCorrectionHandler(
        ISpringbackCalculator calculator,
        ILogger<CalculateSpringbackCorrectionHandler> logger)
    {
        _calculator = calculator;
        _logger = logger;
    }

    public Task<SpringbackCorrectionResult> Handle(
        CalculateSpringbackCorrectionCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "Calculating springback correction: Iteration={Iter}, Target={Target}mm, Previous={Prev}mm, Position={Pos}mm",
            request.IterationNumber,
            request.TargetDiameterMm,
            request.PreviousDiameterMm,
            request.SpringbackPositionMm);

        try
        {
            // Convert to BendingCalculationInput
            var machineParams = new BendingCalculationInput
            {
                BallDiameter = request.MachineParams.BallDiameterMm,
                Thickness = request.MachineParams.ThicknessMm,
                CenterDistance = request.MachineParams.CenterDistanceMm,
                TargetBendingDiameter = request.TargetDiameterMm,
                XA1 = request.MachineParams.XA1,
                YA1 = request.MachineParams.YA1,
                Theta = request.MachineParams.ThetaDeg
            };

            // Create iteration input
            var iterInput = new SpringbackIterationInput
            {
                IterationNumber = request.IterationNumber,
                TargetDiameter = request.TargetDiameterMm,
                PreviousDiameter = request.PreviousDiameterMm,
                SpringbackPositionMm = request.SpringbackPositionMm,
                MachineParams = machineParams
            };

            // Calculate
            var iterResult = _calculator.CalculateIteration(iterInput);

            // Convert to response
            var result = new SpringbackCorrectionResult
            {
                Success = iterResult.Success,
                Message = iterResult.Message,
                Error = iterResult.ErrorMessage,
                IterationNumber = iterResult.IterationNumber,
                SpringbackPositionMm = iterResult.SpringbackPositionMm,
                MeasuredDiameterMm = iterResult.MeasuredDiameter,
                ErrorMm = iterResult.ErrorMm,
                IsWithinTolerance = iterResult.IsWithinTolerance,
                CorrectedDiameterMm = iterResult.CorrectedDiameter,
                NewPistonPositionMm = iterResult.NewPistonPositionMm,
                NeedMoreIterations = iterResult.NeedMoreIterations,
                MaxIterationsReached = request.IterationNumber >= SpringbackCalculator.MaxIterations
            };

            if (result.IsWithinTolerance)
            {
                _logger.LogInformation(
                    "Springback correction complete! Target={Target}mm, Measured={Measured}mm, Error={Error}mm",
                    request.TargetDiameterMm,
                    result.MeasuredDiameterMm,
                    result.ErrorMm);
            }
            else if (result.NeedMoreIterations)
            {
                _logger.LogInformation(
                    "Springback iteration {Iter}: Measured={Measured}mm, Corrected={Corrected}mm, NewPos={Pos}mm",
                    request.IterationNumber,
                    result.MeasuredDiameterMm,
                    result.CorrectedDiameterMm,
                    result.NewPistonPositionMm);
            }

            return Task.FromResult(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Springback correction calculation failed");
            return Task.FromResult(SpringbackCorrectionResult.Fail($"Hesaplama hatası: {ex.Message}"));
        }
    }
}
