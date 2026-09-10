using CncBendingMachine.Core.Enums;
using CncBendingMachine.Core.Interfaces;
using CncBendingMachine.Core.Models;
using Microsoft.Extensions.Logging;

namespace CncBendingMachine.Infrastructure.Driver;

/// <summary>
/// Full simulation driver with fake state changes
/// </summary>
public class SimulatorPlcDriver : IPlcDriver
{
    private readonly ILogger _logger;
    private bool _connected = false;

    // Simulated state
    private MachineMode _mode = MachineMode.Manual;
    private bool _hydraulicMotorOn = false;
    private int _hydraulicMotorState = 0;
    private DateTime? _motorStartTime = null;
    private bool _fanOn = false;
    private bool _alarmOn = false;

    // Piston states
    private readonly SimPiston[] _pistons = new SimPiston[4];
    private SimRotation _rotation = new();
    private SimPneumatic _rightPneumatic = new();
    private SimPneumatic _leftPneumatic = new();

    // Safety defaults - all OK
    private int _safetyBits = 0x000F; // E-Stop OK, Motor OK, Fan OK, Phase OK

    // Springback simulation
    private SimSpringback _springback = new();

    public bool IsConnected => _connected;
    public bool IsSimulationMode => true;

    public SimulatorPlcDriver(ILogger logger)
    {
        _logger = logger;

        // Initialize pistons with different parameters
        _pistons[(int)PistonId.Right] = new SimPiston { MaxReg = 21127, StrokeMm = 422.0 };
        _pistons[(int)PistonId.Left] = new SimPiston { MaxReg = 21093, StrokeMm = 422.0 };
        _pistons[(int)PistonId.Upper] = new SimPiston { MaxReg = 7981, StrokeMm = 161.0 };
        _pistons[(int)PistonId.Lower] = new SimPiston { MaxReg = 9732, StrokeMm = 195.0 };

        _logger.LogInformation("SimulatorPlcDriver initialized");
    }

    public Task<bool> ConnectAsync()
    {
        _connected = true;
        _logger.LogInformation("Simulator connected (fake)");
        return Task.FromResult(true);
    }

    public void Disconnect()
    {
        _connected = false;
        _logger.LogInformation("Simulator disconnected");
    }

    public Task<MachineState> ReadMachineStateAsync()
    {
        // Update hydraulic motor state
        if (_hydraulicMotorOn)
        {
            if (_hydraulicMotorState == 0)
            {
                _hydraulicMotorState = 1; // Starting
                _motorStartTime = DateTime.UtcNow;
            }
            else if (_hydraulicMotorState == 1 && _motorStartTime.HasValue)
            {
                if ((DateTime.UtcNow - _motorStartTime.Value).TotalSeconds >= 3)
                {
                    _hydraulicMotorState = 2; // Ready
                }
            }
        }
        else
        {
            _hydraulicMotorState = 0;
            _motorStartTime = null;
        }

        bool systemReady = _hydraulicMotorState == 2;

        // Update piston simulations
        foreach (var piston in _pistons)
        {
            piston.Update(systemReady);
        }

        // Update rotation simulation
        _rotation.Update(systemReady);

        // Update pneumatic simulations
        _rightPneumatic.Update();
        _leftPneumatic.Update();

        // Update springback simulation
        _springback.Update();

        var state = new MachineState
        {
            Mode = _mode,
            HydraulicMotorState = _hydraulicMotorState,
            FanActive = _fanOn,
            AlarmActive = _alarmOn,
            SystemReady = systemReady,
            SafetyBits = _safetyBits,
            ErrorCode = ErrorCode.NoError,

            RightPiston = CreatePistonState(_pistons[(int)PistonId.Right]),
            LeftPiston = CreatePistonState(_pistons[(int)PistonId.Left]),
            UpperPiston = CreatePistonState(_pistons[(int)PistonId.Upper]),
            LowerPiston = CreatePistonState(_pistons[(int)PistonId.Lower]),

            Rotation = new RotationState
            {
                EncoderRaw = _rotation.EncoderRaw,
                ActiveDirection = _rotation.Direction,
                PositionMm = _rotation.CurrentPositionMm,  // Direct mm value
                InPosition = _rotation.InPosition
            },

            Sensors = new SensorState
            {
                S1PressureBar = 120,  // Simulated pressure
                S2PressureBar = 115,
                S1FlowCms = 50,
                S2FlowCms = 48,
                OilTempC = 45,
                OilHumidityPercent = 30,
                OilLevelPercent = 85
            },

            RightPneumatic = new PneumaticState
            {
                EncoderPosition = _rightPneumatic.Position,
                ActiveDirection = _rightPneumatic.Direction
            },

            LeftPneumatic = new PneumaticState
            {
                EncoderPosition = _leftPneumatic.Position,
                ActiveDirection = _leftPneumatic.Direction
            },

            Safety = new SafetyState
            {
                EmergencyStopOK = (_safetyBits & 0x0001) != 0,
                MotorThermalOK = (_safetyBits & 0x0002) != 0,
                FanThermalOK = (_safetyBits & 0x0004) != 0,
                PhaseSequenceOK = (_safetyBits & 0x0008) != 0,
                LeftPartSensor = false,
                RightPartSensor = false,
                ContaminationK1 = false,
                ContaminationK2 = false,
                ContaminationK3 = false
            },

            Springback = new SpringbackState
            {
                State = _springback.State,
                DetectedPositionMm = _springback.DetectedPositionMm,
                PneumaticStartMm = _springback.PneumaticStartMm,
                PneumaticEndMm = _springback.PneumaticEndMm,
                DetectionType = _springback.DetectionType,
                MinValueMm = _springback.MinValueMm,
                ErrorCode = _springback.ErrorCode
            },

            // SLPIS simülasyon: sabit test değeri (Encoder ~750 ≈ 2.49mm)
            SlpisSensorRaw = 750,

            Timestamp = DateTime.UtcNow
        };

        return Task.FromResult(state);
    }

    private PistonState CreatePistonState(SimPiston piston)
    {
        return new PistonState
        {
            EncoderRaw = piston.EncoderRaw,
            PositionMm = piston.PositionMm,
            InPosition = piston.InPosition,
            Moving = piston.Moving
        };
    }

    public Task SetMachineModeAsync(MachineMode mode)
    {
        _mode = mode;
        _logger.LogInformation("Mode set to {Mode}", mode);
        return Task.CompletedTask;
    }

    public Task SetHydraulicMotorAsync(bool on)
    {
        _hydraulicMotorOn = on;
        if (!on)
        {
            _hydraulicMotorState = 0;
            _motorStartTime = null;
        }
        _logger.LogInformation("Hydraulic motor {State}", on ? "ON" : "OFF");
        return Task.CompletedTask;
    }

    public Task SetFanAsync(bool on)
    {
        _fanOn = on;
        _logger.LogInformation("Fan {State}", on ? "ON" : "OFF");
        return Task.CompletedTask;
    }

    public Task SetAlarmAsync(bool on)
    {
        _alarmOn = on;
        _logger.LogInformation("Alarm {State}", on ? "ON" : "OFF");
        return Task.CompletedTask;
    }

    public Task PistonJogAsync(PistonId piston, int direction, int speedPercent)
    {
        var p = _pistons[(int)piston];
        p.Mode = MovementMode.Jog;
        p.Direction = direction;
        p.SpeedPercent = speedPercent;
        _logger.LogInformation("{Piston} jog: dir={Dir}, speed={Speed}%", piston, direction, speedPercent);
        return Task.CompletedTask;
    }

    public Task PistonMoveToPositionAsync(PistonId piston, double positionMm, int speedPercent)
    {
        var p = _pistons[(int)piston];
        p.Mode = MovementMode.Position;
        p.TargetPositionMm = positionMm;
        p.SpeedPercent = speedPercent;
        p.InPosition = false;
        _logger.LogInformation("{Piston} move to position: {Position}mm at {Speed}%", piston, positionMm, speedPercent);
        return Task.CompletedTask;
    }

    public Task PistonMoveToPressureAsync(PistonId piston, int direction, int pressureBar, int speedPercent)
    {
        var p = _pistons[(int)piston];
        p.Mode = MovementMode.Pressure;
        p.Direction = direction;  // -1=Back, 1=Forward
        p.TargetPressure = pressureBar;
        p.SpeedPercent = speedPercent;
        string dirStr = direction == 1 ? "forward" : "back";
        _logger.LogInformation("{Piston} move to pressure: {Dir} to {Pressure}bar at {Speed}%", piston, dirStr, pressureBar, speedPercent);
        return Task.CompletedTask;
    }

    public Task PistonStopAsync(PistonId piston)
    {
        var p = _pistons[(int)piston];
        p.Mode = MovementMode.Stop;
        p.Direction = 0;
        _logger.LogInformation("{Piston} stopped", piston);
        return Task.CompletedTask;
    }

    public Task RotationJogAsync(int direction, int speedPercent)
    {
        _rotation.Mode = MovementMode.Jog;
        _rotation.Direction = direction;
        _rotation.SpeedPercent = speedPercent;
        _logger.LogInformation("Rotation jog: dir={Dir}, speed={Speed}%", direction, speedPercent);
        return Task.CompletedTask;
    }

    public Task RotationMoveToPositionAsync(int position, int speedPercent)
    {
        // Position mode: position is in mm, direction is automatic
        _rotation.Mode = MovementMode.Position;
        _rotation.TargetPositionMm = position;
        _rotation.SpeedPercent = speedPercent;
        _rotation.InPosition = false;
        _logger.LogInformation("Rotation move to position: {Position}mm at {Speed}%", position, speedPercent);
        return Task.CompletedTask;
    }

    public Task RotationMoveDistanceAsync(int direction, int distanceMm, int speedPercent)
    {
        // Distance mode: direction is -1 (CCW) or 1 (CW), distanceMm is always positive
        _rotation.Mode = MovementMode.Distance;
        double signedDistance = direction * Math.Abs(distanceMm);
        _rotation.TargetPositionMm = _rotation.CurrentPositionMm + signedDistance;
        _rotation.SpeedPercent = speedPercent;
        _rotation.InPosition = false;
        string dirStr = direction == 1 ? "CW" : "CCW";
        _logger.LogInformation("Rotation move distance: {Dir} {Distance}mm (target: {Target}mm) at {Speed}%",
            dirStr, distanceMm, _rotation.TargetPositionMm, speedPercent);
        return Task.CompletedTask;
    }

    public Task RotationStopAsync()
    {
        _rotation.Mode = MovementMode.Stop;
        _rotation.Direction = 0;
        _logger.LogInformation("Rotation stopped");
        return Task.CompletedTask;
    }

    public Task PneumaticControlAsync(PistonId side, int direction)
    {
        var pneumatic = side == PistonId.Right ? _rightPneumatic : _leftPneumatic;
        pneumatic.Direction = direction;
        _logger.LogInformation("{Side} pneumatic: dir={Dir}", side, direction);
        return Task.CompletedTask;
    }

    public Task PneumaticStopAsync(PistonId side)
    {
        var pneumatic = side == PistonId.Right ? _rightPneumatic : _leftPneumatic;
        pneumatic.Direction = 0;
        _logger.LogInformation("{Side} pneumatic stopped", side);
        return Task.CompletedTask;
    }

    public Task ResetEncoderAsync(int encoderBitmask)
    {
        _logger.LogInformation("Encoder reset requested: bitmask={Bitmask}", encoderBitmask);
        // In simulation, we just log it
        return Task.CompletedTask;
    }

    public Task ResetEncodersAsync()
    {
        _logger.LogInformation("Resetting all encoders (simulation)");

        // Reset all piston encoders to 0
        foreach (var piston in _pistons)
        {
            piston.EncoderRaw = 0;
            piston.InPosition = true;
        }

        // Reset rotation encoder
        _rotation.EncoderRaw = 0;
        _rotation.InPosition = true;

        // Reset pneumatic positions
        _rightPneumatic.Position = 0;
        _leftPneumatic.Position = 0;

        return Task.CompletedTask;
    }

    public Task SpringbackStartAsync(int side)
    {
        _springback.Start(side);
        _logger.LogInformation("Springback measurement started on side {Side}", side == 1 ? "Right" : "Left");
        return Task.CompletedTask;
    }

    public Task SpringbackStopAsync()
    {
        _springback.Stop();
        _logger.LogInformation("Springback measurement stopped");
        return Task.CompletedTask;
    }

    public Task SetSpringbackThresholdsAsync(double increaseThresholdMm, double minThresholdMm, int stableTimeMs)
    {
        _springback.IncreaseThresholdMm = increaseThresholdMm;
        _springback.MinThresholdMm = minThresholdMm;
        _springback.StableTimeMs = stableTimeMs;
        _logger.LogInformation("Springback thresholds set: increase={Increase}mm, min={Min}mm, stable={Stable}ms",
            increaseThresholdMm, minThresholdMm, stableTimeMs);
        return Task.CompletedTask;
    }

    public void Dispose()
    {
        Disconnect();
    }

    // Internal simulation classes
    private class SimPiston
    {
        public int MaxReg { get; init; }
        public double StrokeMm { get; init; }
        public MovementMode Mode { get; set; } = MovementMode.Stop;
        public int Direction { get; set; }
        public int SpeedPercent { get; set; }
        public double TargetPositionMm { get; set; }
        public int TargetPressure { get; set; }
        public int EncoderRaw { get; set; } = 5000; // Start mid-stroke
        public bool InPosition { get; set; } = true;
        public bool Moving => Mode != MovementMode.Stop && Direction != 0;

        public double PositionMm => (EncoderRaw / (double)MaxReg) * StrokeMm;

        public void Update(bool systemReady)
        {
            if (!systemReady) return;

            switch (Mode)
            {
                case MovementMode.Jog:
                    if (Direction != 0)
                    {
                        // Move based on direction and speed
                        int delta = (int)(MaxReg * SpeedPercent / 100.0 / 50.0); // 50 updates/sec
                        EncoderRaw += Direction * delta;
                        EncoderRaw = Math.Clamp(EncoderRaw, 0, MaxReg);
                        InPosition = false;
                    }
                    break;

                case MovementMode.Position:
                    double error = TargetPositionMm - PositionMm;
                    if (Math.Abs(error) <= 0.05) // Tolerance
                    {
                        InPosition = true;
                        Direction = 0; // Stop movement
                    }
                    else
                    {
                        InPosition = false; // Clear InPosition when moving to new target
                        int delta = (int)(MaxReg * SpeedPercent / 100.0 / 50.0);
                        Direction = error > 0 ? 1 : -1;
                        EncoderRaw += Direction * delta;
                        EncoderRaw = Math.Clamp(EncoderRaw, 0, MaxReg);
                    }
                    break;

                case MovementMode.Pressure:
                    // Simulate reaching pressure after some time
                    InPosition = true;
                    break;
            }
        }
    }

    private class SimRotation
    {
        // Machine parameters
        private const double RollerDiameterMm = 220.0;
        private const int EncoderPpr = 1024;
        private const double DecelerationDistMm = 10.0;
        private const double ToleranceMm = 0.5;

        // Calculated constants
        private readonly double _circumference;
        private readonly double _pulsesPerMm;
        private readonly double _mmPerPulse;

        public MovementMode Mode { get; set; } = MovementMode.Stop;
        public int Direction { get; set; }
        public int SpeedPercent { get; set; }
        public double TargetPositionMm { get; set; }
        public int EncoderRaw { get; set; } = 0;
        public bool InPosition { get; set; } = true;

        // Current position in mm
        public double CurrentPositionMm => EncoderRaw * _mmPerPulse;

        public SimRotation()
        {
            _circumference = Math.PI * RollerDiameterMm;
            _pulsesPerMm = EncoderPpr / _circumference;
            _mmPerPulse = _circumference / EncoderPpr;
        }

        public void Update(bool systemReady)
        {
            if (!systemReady) return;

            switch (Mode)
            {
                case MovementMode.Jog:
                    if (Direction != 0)
                    {
                        // Move at requested speed (simulate ~10mm/s at 100% speed)
                        double speedMmPerUpdate = (SpeedPercent / 100.0) * 0.2; // ~10mm/s at 50 updates/sec
                        int deltaPulses = (int)(speedMmPerUpdate * _pulsesPerMm);
                        if (deltaPulses < 1) deltaPulses = 1;
                        EncoderRaw += Direction * deltaPulses;
                    }
                    break;

                case MovementMode.Position:
                case MovementMode.Distance:
                    double remainingMm = Math.Abs(TargetPositionMm - CurrentPositionMm);

                    if (remainingMm <= ToleranceMm)
                    {
                        InPosition = true;
                        Direction = 0;
                    }
                    else
                    {
                        InPosition = false;
                        Direction = TargetPositionMm > CurrentPositionMm ? 1 : -1;

                        // Speed profile: 100% until 10mm, then slow approach
                        double effectiveSpeed;
                        if (remainingMm > DecelerationDistMm)
                        {
                            effectiveSpeed = SpeedPercent / 100.0;
                        }
                        else
                        {
                            // 3V approach = 614/2047 ≈ 30% speed
                            effectiveSpeed = 0.3;
                        }

                        double speedMmPerUpdate = effectiveSpeed * 0.2; // ~10mm/s at full speed
                        int deltaPulses = (int)(speedMmPerUpdate * _pulsesPerMm);
                        if (deltaPulses < 1) deltaPulses = 1;
                        EncoderRaw += Direction * deltaPulses;
                    }
                    break;
            }
        }
    }

    private class SimPneumatic
    {
        public int Direction { get; set; }
        public int Position { get; set; } = 0;

        public void Update()
        {
            if (Direction > 0)
            {
                Position = Math.Min(Position + 10, 1000);
            }
            else if (Direction < 0)
            {
                Position = Math.Max(Position - 10, 0);
            }
        }
    }

    private class SimSpringback
    {
        // State machine: 0=Idle, 1=PneumaticExtend, 2=Measuring, 3=Detected, 4=PneumaticRetract, 5=Complete, 99=Error
        public int State { get; private set; }
        public int Side { get; private set; }  // 1=Right, -1=Left
        public double DetectedPositionMm { get; private set; }
        public double PneumaticStartMm { get; private set; }
        public double PneumaticEndMm { get; private set; }
        public int DetectionType { get; private set; }  // 1=Increase, 2=AboveMin, 3=Stable
        public double MinValueMm { get; private set; }
        public int ErrorCode { get; private set; }

        // Thresholds (can be set externally)
        public double IncreaseThresholdMm { get; set; } = 0.2;
        public double MinThresholdMm { get; set; } = 0.1;
        public int StableTimeMs { get; set; } = 500;

        // Internal simulation state
        private DateTime _stateStartTime;
        private int _updateCounter;

        public void Start(int side)
        {
            Side = side;
            State = 1;  // PneumaticExtend
            _stateStartTime = DateTime.UtcNow;
            _updateCounter = 0;
            DetectedPositionMm = 0;
            PneumaticStartMm = 0;
            PneumaticEndMm = 0;
            DetectionType = 0;
            MinValueMm = 0;
            ErrorCode = 0;
        }

        public void Stop()
        {
            State = 0;  // Idle
            ErrorCode = 3;  // Cancelled
        }

        public void Update()
        {
            if (State == 0 || State == 5 || State == 99) return;

            var elapsed = DateTime.UtcNow - _stateStartTime;
            _updateCounter++;

            switch (State)
            {
                case 1:  // PneumaticExtend - wait 5 seconds
                    if (elapsed.TotalSeconds >= 5)
                    {
                        State = 2;  // Measuring
                        _stateStartTime = DateTime.UtcNow;
                        PneumaticStartMm = 250;  // Simulated start value
                        MinValueMm = 250;
                    }
                    break;

                case 2:  // Measuring - simulate detection after 3 seconds
                    MinValueMm = 250 - (_updateCounter * 0.01);  // Slowly decreasing
                    if (elapsed.TotalSeconds >= 3)
                    {
                        // Simulate detection
                        State = 3;  // Detected
                        DetectedPositionMm = 150.5;  // Simulated piston position
                        PneumaticEndMm = MinValueMm + 0.15;  // Above minimum
                        DetectionType = 2;  // AboveMinimum
                        _stateStartTime = DateTime.UtcNow;
                    }
                    break;

                case 3:  // Detected - immediately go to retract
                    State = 4;  // PneumaticRetract
                    _stateStartTime = DateTime.UtcNow;
                    break;

                case 4:  // PneumaticRetract - wait 5 seconds
                    if (elapsed.TotalSeconds >= 5)
                    {
                        State = 5;  // Complete
                    }
                    break;
            }
        }
    }
}
