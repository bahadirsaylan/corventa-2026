using System.Net;
using CncBendingMachine.Core.Enums;
using CncBendingMachine.Core.Interfaces;
using CncBendingMachine.Core.Models;
using FluentModbus;
using Microsoft.Extensions.Logging;

namespace CncBendingMachine.Infrastructure.Driver;

/// <summary>
/// Real Modbus TCP driver for connecting to CODESYS SoftPLC
/// </summary>
public class ModbusPlcDriver : IPlcDriver
{
    private readonly ILogger _logger;
    private readonly string _ipAddress;
    private readonly int _port;
    private readonly byte _unitId;
    private readonly ModbusTcpClient _client;
    private readonly object _modbusLock = new object(); // Thread-safety lock

    // Modbus address constants (matching GVL_Modbus)
    // CODESYS'te: HR Channel -> IEC Address: %QW60, Offset: 0
    //             IR Channel -> IEC Address: %QW160, Offset: 0
    private const int HoldingRegisterStart = 0;  // QW60 maps to Modbus offset 0
    private const int InputRegisterStart = 0;    // QW160 maps to Modbus offset 0

    public bool IsConnected => _client.IsConnected;
    public bool IsSimulationMode => false;

    public ModbusPlcDriver(ILogger logger, string ipAddress, int port = 502, byte unitId = 0)
    {
        _logger = logger;
        _ipAddress = ipAddress;
        _port = port;
        _unitId = unitId;
        _client = new ModbusTcpClient();
    }

    public async Task<bool> ConnectAsync()
    {
        try
        {
            _logger.LogInformation("Connecting to PLC at {IpAddress}:{Port}", _ipAddress, _port);
            _client.Connect(new IPEndPoint(IPAddress.Parse(_ipAddress), _port));
            _logger.LogInformation("Connected to PLC");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to connect to PLC");
            return false;
        }
    }

    public void Disconnect()
    {
        _client.Disconnect();
        _logger.LogInformation("Disconnected from PLC");
    }

    public async Task<MachineState> ReadMachineStateAsync()
    {
        short[] regs;
        lock (_modbusLock)
        {
            // Read all input registers (52 registers: state + springback + SLPIS sensor)
            regs = _client.ReadInputRegisters<short>(_unitId, InputRegisterStart, 52).ToArray();
        }
        ByteSwapHelper.SwapBytesInPlace(regs);

        var state = new MachineState
        {
            Mode = (MachineMode)regs[0],
            HydraulicMotorState = regs[1],
            FanActive = regs[2] != 0,
            AlarmActive = regs[3] != 0,
            SystemReady = regs[4] != 0,
            SafetyBits = regs[5],
            ErrorCode = (ErrorCode)regs[6],

            RightPiston = new PistonState
            {
                EncoderRaw = regs[7],
                PositionMm = CombinePosition(regs[8], regs[9]) / 100.0,
                InPosition = regs[10] != 0,
                Moving = regs[11] != 0
            },

            LeftPiston = new PistonState
            {
                EncoderRaw = regs[12],
                PositionMm = CombinePosition(regs[13], regs[14]) / 100.0,
                InPosition = regs[15] != 0,
                Moving = regs[16] != 0
            },

            UpperPiston = new PistonState
            {
                EncoderRaw = regs[17],
                PositionMm = CombinePosition(regs[18], regs[19]) / 100.0,
                InPosition = regs[20] != 0,
                Moving = regs[21] != 0
            },

            LowerPiston = new PistonState
            {
                EncoderRaw = regs[22],
                PositionMm = CombinePosition(regs[23], regs[24]) / 100.0,
                InPosition = regs[25] != 0,
                Moving = regs[26] != 0
            },

            Rotation = new RotationState
            {
                EncoderRaw = regs[27],
                ActiveDirection = regs[28],
                PositionMm = CombinePosition(regs[29], regs[30]) / 100.0,  // x100 format -> mm
                InPosition = regs[31] != 0
            },

            Sensors = new SensorState
            {
                S1PressureBar = regs[32],
                S2PressureBar = regs[33],
                S1FlowCms = regs[34],
                S2FlowCms = regs[35],
                OilTempC = regs[36] - 50,  // Remove offset
                OilHumidityPercent = regs[37],
                OilLevelPercent = regs[38]
            },

            RightPneumatic = new PneumaticState
            {
                EncoderPosition = regs[39],
                ActiveDirection = regs[41]
            },

            LeftPneumatic = new PneumaticState
            {
                EncoderPosition = regs[40],
                ActiveDirection = regs[42]
            },

            Springback = new SpringbackState
            {
                State = regs[43],
                DetectedPositionMm = CombinePosition(regs[44], regs[45]) / 100.0,
                PneumaticStartMm = regs[46],    // Already in mm (INT)
                PneumaticEndMm = regs[47],      // Already in mm (INT)
                DetectionType = regs[48],
                MinValueMm = regs[49],          // Already in mm (INT)
                ErrorCode = regs[50]
            },

            // SLPIS Sensor (offset 51)
            SlpisSensorRaw = regs[51],

            Safety = DecodeSafetyBits(regs[5]),
            Timestamp = DateTime.UtcNow
        };

        return state;
    }

    private int CombinePosition(short low, short high)
    {
        // Treat low as unsigned (0-65535) to avoid overflow at 32767
        // This allows positions up to ~655m before needing high word
        return (low & 0xFFFF) + (high << 16);
    }

    private SafetyState DecodeSafetyBits(int bits)
    {
        return new SafetyState
        {
            EmergencyStopOK = (bits & 0x0001) != 0,
            MotorThermalOK = (bits & 0x0002) != 0,
            FanThermalOK = (bits & 0x0004) != 0,
            PhaseSequenceOK = (bits & 0x0008) != 0,
            LeftPartSensor = (bits & 0x0010) != 0,
            RightPartSensor = (bits & 0x0020) != 0,
            ContaminationK1 = (bits & 0x0040) != 0,
            ContaminationK2 = (bits & 0x0080) != 0,
            ContaminationK3 = (bits & 0x0100) != 0
        };
    }

    private void WriteHoldingRegister(int offset, short value)
    {
        lock (_modbusLock)
        {
            _client.WriteSingleRegister(_unitId, HoldingRegisterStart + offset, ByteSwapHelper.SwapBytes(value));
        }
    }

    /// <summary>
    /// Write multiple contiguous holding registers — uses proven WriteSingleRegister
    /// inside a single lock to reduce lock contention.
    /// </summary>
    private void WriteHoldingRegisters(int startOffset, short[] values)
    {
        lock (_modbusLock)
        {
            for (int i = 0; i < values.Length; i++)
            {
                _client.WriteSingleRegister(_unitId, HoldingRegisterStart + startOffset + i, ByteSwapHelper.SwapBytes(values[i]));
            }
        }
    }

    public Task SetMachineModeAsync(MachineMode mode)
    {
        WriteHoldingRegister(0, (short)mode);
        return Task.CompletedTask;
    }

    public Task SetHydraulicMotorAsync(bool on)
    {
        WriteHoldingRegister(1, (short)(on ? 1 : 0));
        return Task.CompletedTask;
    }

    public Task SetFanAsync(bool on)
    {
        WriteHoldingRegister(2, (short)(on ? 1 : 0));
        return Task.CompletedTask;
    }

    public Task SetAlarmAsync(bool on)
    {
        WriteHoldingRegister(3, (short)(on ? 1 : 0));
        return Task.CompletedTask;
    }

    public Task PistonJogAsync(PistonId piston, int direction, int speedPercent)
    {
        int baseOffset = GetPistonOffset(piston);
        // 3 register → 1 TCP packet (was 3 packets)
        WriteHoldingRegisters(baseOffset, new short[]
        {
            (short)MovementMode.Jog,
            (short)direction,
            (short)speedPercent
        });
        return Task.CompletedTask;
    }

    public async Task PistonMoveToPositionAsync(PistonId piston, double positionMm, int speedPercent)
    {
        int baseOffset = GetPistonOffset(piston);
        int posX10 = (int)(positionMm * 10);

        // STOP gönder → PLC Mode 0'da bInPosition ve bAtPressure'ı FALSE yapar.
        WriteHoldingRegister(baseOffset, (short)MovementMode.Stop);

        // PLC'nin Stop'u işlemesi için en az 1 cycle (10ms) bekle
        await Task.Delay(30);

        // Tüm parametreleri tek pakette yaz (5 register → 1 TCP packet, was 6 packets)
        // Mode EN SON olması için: önce dir+speed+target yaz, sonra mode yaz
        WriteHoldingRegisters(baseOffset + 1, new short[]
        {
            0,                                  // Direction (PLC determines)
            (short)speedPercent,                // Speed
            (short)(posX10 & 0xFFFF),           // Target Lo
            (short)(posX10 >> 16)               // Target Hi
        });
        WriteHoldingRegister(baseOffset, (short)MovementMode.Position); // Mode EN SON
    }

    public async Task PistonMoveToPressureAsync(PistonId piston, int direction, int pressureBar, int speedPercent)
    {
        int baseOffset = GetPistonOffset(piston);

        // STOP gönder → PLC Mode 0'da bInPosition ve bAtPressure'ı FALSE yapar
        WriteHoldingRegister(baseOffset, (short)MovementMode.Stop);

        // PLC'nin Stop'u işlemesi için en az 1 cycle (10ms) bekle
        await Task.Delay(30);

        // Parametreleri tek pakette yaz (3 register → 1 TCP packet, was 4 packets)
        WriteHoldingRegisters(baseOffset + 1, new short[]
        {
            (short)direction,
            (short)speedPercent,
            (short)pressureBar
        });
        WriteHoldingRegister(baseOffset, (short)MovementMode.Pressure); // Mode EN SON
    }

    public Task PistonStopAsync(PistonId piston)
    {
        int baseOffset = GetPistonOffset(piston);
        // 2 register → 1 TCP packet
        WriteHoldingRegisters(baseOffset, new short[] { (short)MovementMode.Stop, 0 });
        return Task.CompletedTask;
    }

    private int GetPistonOffset(PistonId piston)
    {
        return piston switch
        {
            PistonId.Right => 4,
            PistonId.Left => 9,
            PistonId.Upper => 14,
            PistonId.Lower => 19,
            _ => throw new ArgumentException($"Unknown piston: {piston}")
        };
    }

    public Task RotationJogAsync(int direction, int speedPercent)
    {
        // 3 register → 1 TCP packet
        WriteHoldingRegisters(24, new short[]
        {
            (short)MovementMode.Jog,
            (short)direction,
            (short)speedPercent
        });
        return Task.CompletedTask;
    }

    public Task RotationMoveToPositionAsync(int position, int speedPercent)
    {
        // PLC expects mm x10 (0.1mm resolution)
        int posX10 = position * 10;
        // 5 register → 1 TCP packet (was 5 packets)
        WriteHoldingRegisters(24, new short[]
        {
            (short)MovementMode.Position,
            0,                              // Direction (PLC auto)
            (short)speedPercent,
            (short)(posX10 & 0xFFFF),       // Target Lo
            (short)(posX10 >> 16)           // Target Hi
        });
        return Task.CompletedTask;
    }

    public Task RotationMoveDistanceAsync(int direction, int distanceMm, int speedPercent)
    {
        // PLC expects mm x10 (0.1mm resolution) and direction
        int distX10 = Math.Abs(distanceMm) * 10;
        // 5 register → 1 TCP packet (was 5 packets)
        WriteHoldingRegisters(24, new short[]
        {
            (short)MovementMode.Distance,
            (short)direction,
            (short)speedPercent,
            (short)(distX10 & 0xFFFF),
            (short)(distX10 >> 16)
        });
        return Task.CompletedTask;
    }

    public Task RotationStopAsync()
    {
        // 2 register → 1 TCP packet
        WriteHoldingRegisters(24, new short[] { (short)MovementMode.Stop, 0 });
        return Task.CompletedTask;
    }

    public Task PneumaticControlAsync(PistonId side, int direction)
    {
        int offset = side == PistonId.Right ? 29 : 30;
        WriteHoldingRegister(offset, (short)direction);
        return Task.CompletedTask;
    }

    public Task PneumaticStopAsync(PistonId side)
    {
        int offset = side == PistonId.Right ? 29 : 30;
        WriteHoldingRegister(offset, 0);
        return Task.CompletedTask;
    }

    public Task ResetEncoderAsync(int encoderBitmask)
    {
        WriteHoldingRegister(33, (short)encoderBitmask);
        return Task.CompletedTask;
    }

    /// <summary>
    /// Reset all encoders using the proper reset sequence
    /// PLC State Machine: 0x8080 -> 100ms wait -> 0x0A0A -> clear
    /// Bitmask: bit0=Right/Left, bit1=Upper/Lower, bit2=Pneumatics, bit3=Rotation
    /// </summary>
    public async Task ResetEncodersAsync()
    {
        _logger.LogInformation("Resetting all encoders");

        const int ALL_ENCODERS_BITMASK = 0x0F; // All 4 encoder groups

        // Send reset command
        WriteHoldingRegister(33, (short)ALL_ENCODERS_BITMASK);

        // Wait for PLC state machine to complete:
        // State 1 (start) + State 2 (100ms wait) + State 3 (end) + State 4 (clear)
        // Total: ~300ms minimum, use 500ms for safety
        await Task.Delay(500);

        // Clear reset command (PLC already cleared it, but just to be safe)
        WriteHoldingRegister(33, 0);
    }

    // ============================================================
    // SPRINGBACK MEASUREMENT METHODS
    // ============================================================

    /// <summary>
    /// Start springback measurement on specified side
    /// </summary>
    /// <param name="side">1=Right, -1=Left</param>
    public async Task SpringbackStartAsync(int side)
    {
        // First reset to 0 to ensure rising edge detection in PLC
        // PLC uses: IF bStart AND NOT bStartPrev THEN (rising edge)
        WriteHoldingRegister(31, 0);                // nCmdSpringbackStart = 0 (reset)
        await Task.Delay(150);                      // Wait for PLC to see the reset (2-3 cycles)

        WriteHoldingRegister(32, (short)side);      // nCmdSpringbackSide
        WriteHoldingRegister(31, 1);                // nCmdSpringbackStart = 1 (start)
    }

    /// <summary>
    /// Stop/cancel springback measurement
    /// </summary>
    public Task SpringbackStopAsync()
    {
        WriteHoldingRegister(31, 0);                // nCmdSpringbackStart = 0 (stop)
        return Task.CompletedTask;
    }

    /// <summary>
    /// Set springback detection thresholds (called before starting measurement)
    /// </summary>
    /// <param name="increaseThresholdMm">Increase threshold in mm (default 0.2)</param>
    /// <param name="minThresholdMm">Above-minimum threshold in mm (default 0.1)</param>
    /// <param name="stableTimeMs">Stable time in ms (default 500)</param>
    public Task SetSpringbackThresholdsAsync(double increaseThresholdMm, double minThresholdMm, int stableTimeMs)
    {
        int increaseX100 = (int)(increaseThresholdMm * 100);  // 0.2 -> 20
        int minX100 = (int)(minThresholdMm * 100);            // 0.1 -> 10

        // 3 register → 1 TCP packet (was 3 packets)
        WriteHoldingRegisters(35, new short[]
        {
            (short)increaseX100,
            (short)minX100,
            (short)stableTimeMs
        });
        return Task.CompletedTask;
    }

    public void Dispose()
    {
        Disconnect();
        _client.Dispose();
    }
}
