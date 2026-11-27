namespace CncBendingMachine.Infrastructure.Driver;

/// <summary>
/// Helper for byte swapping between C# and CODESYS
/// CRITICAL: All 16-bit values must be swapped!
/// </summary>
public static class ByteSwapHelper
{
    /// <summary>
    /// Swap bytes of a 16-bit value
    /// CODESYS uses big-endian, C# uses little-endian
    /// </summary>
    public static short SwapBytes(short value)
    {
        return (short)(((value & 0xFF) << 8) | ((value >> 8) & 0xFF));
    }

    /// <summary>
    /// Swap bytes of an unsigned 16-bit value
    /// </summary>
    public static ushort SwapBytes(ushort value)
    {
        return (ushort)(((value & 0xFF) << 8) | ((value >> 8) & 0xFF));
    }

    /// <summary>
    /// Swap bytes in an array of shorts
    /// </summary>
    public static void SwapBytesInPlace(short[] values)
    {
        for (int i = 0; i < values.Length; i++)
        {
            values[i] = SwapBytes(values[i]);
        }
    }
}
