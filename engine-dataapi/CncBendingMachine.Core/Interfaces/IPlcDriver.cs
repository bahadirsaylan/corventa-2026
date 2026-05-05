using CncBendingMachine.Core.Enums;
using CncBendingMachine.Core.Models;

namespace CncBendingMachine.Core.Interfaces;

/// <summary>
/// PLC Driver interface - implemented by ModbusPlcDriver and SimulatorPlcDriver
/// </summary>
public interface IPlcDriver : IDisposable
{
    /// <summary>
    /// Connect to PLC
    /// </summary>
    Task<bool> ConnectAsync();

    /// <summary>
    /// Disconnect from PLC
    /// </summary>
    void Disconnect();

    /// <summary>
    /// Is connected to PLC
    /// </summary>
    bool IsConnected { get; }

    /// <summary>
    /// Is in simulation mode
    /// </summary>
    bool IsSimulationMode { get; }

    // ============================================================
    // STATE READING (PLC -> HMI)
    // ============================================================

    /// <summary>
    /// Read complete machine state
    /// </summary>
    Task<MachineState> ReadMachineStateAsync();

    // ============================================================
    // SYSTEM COMMANDS
    // ============================================================

    /// <summary>
    /// Set machine mode
    /// </summary>
    Task SetMachineModeAsync(MachineMode mode);

    /// <summary>
    /// Set hydraulic motor state
    /// </summary>
    Task SetHydraulicMotorAsync(bool on);

    /// <summary>
    /// Set fan state
    /// </summary>
    Task SetFanAsync(bool on);

    /// <summary>
    /// Set alarm state
    /// </summary>
    Task SetAlarmAsync(bool on);

    // ============================================================
    // PISTON COMMANDS
    // ============================================================

    /// <summary>
    /// Start piston jog movement
    /// </summary>
    Task PistonJogAsync(PistonId piston, int direction, int speedPercent);

    /// <summary>
    /// Move piston to position
    /// </summary>
    Task PistonMoveToPositionAsync(PistonId piston, double positionMm, int speedPercent);

    /// <summary>
    /// Move piston to pressure
    /// </summary>
    /// <param name="direction">-1=Back, 1=Forward</param>
    Task PistonMoveToPressureAsync(PistonId piston, int direction, int pressureBar, int speedPercent);

    /// <summary>
    /// Stop piston
    /// </summary>
    Task PistonStopAsync(PistonId piston);

    // ============================================================
    // ROTATION COMMANDS
    // ============================================================

    /// <summary>
    /// Start rotation jog
    /// </summary>
    Task RotationJogAsync(int direction, int speedPercent);

    /// <summary>
    /// Move rotation to position (mm)
    /// </summary>
    /// <param name="positionMm">Target position in mm</param>
    Task RotationMoveToPositionAsync(int positionMm, int speedPercent);

    /// <summary>
    /// Move rotation by distance
    /// </summary>
    /// <param name="direction">-1=CCW, 1=CW</param>
    /// <param name="distanceMm">Distance in mm (always positive)</param>
    Task RotationMoveDistanceAsync(int direction, int distanceMm, int speedPercent);

    /// <summary>
    /// Stop rotation
    /// </summary>
    Task RotationStopAsync();

    // ============================================================
    // PNEUMATIC COMMANDS
    // ============================================================

    /// <summary>
    /// Control pneumatic cylinder
    /// </summary>
    Task PneumaticControlAsync(PistonId side, int direction);

    /// <summary>
    /// Stop pneumatic
    /// </summary>
    Task PneumaticStopAsync(PistonId side);

    // ============================================================
    // ENCODER RESET
    // ============================================================

    /// <summary>
    /// Reset encoder for specified axis
    /// </summary>
    Task ResetEncoderAsync(int encoderBitmask);

    /// <summary>
    /// Reset all encoders (pistons, rotation, pneumatics)
    /// Used during Gönye (reference) operation
    /// </summary>
    Task ResetEncodersAsync();

    // ============================================================
    // SPRINGBACK MEASUREMENT COMMANDS
    // ============================================================

    /// <summary>
    /// Start springback measurement on specified side
    /// </summary>
    /// <param name="side">1=Right, -1=Left</param>
    Task SpringbackStartAsync(int side);

    /// <summary>
    /// Stop/cancel springback measurement
    /// </summary>
    Task SpringbackStopAsync();

    /// <summary>
    /// Set springback detection thresholds
    /// </summary>
    /// <param name="increaseThresholdMm">Increase threshold in mm (default 0.2)</param>
    /// <param name="minThresholdMm">Above-minimum threshold in mm (default 0.1)</param>
    /// <param name="stableTimeMs">Stable time in ms (default 500)</param>
    Task SetSpringbackThresholdsAsync(double increaseThresholdMm, double minThresholdMm, int stableTimeMs);
}
