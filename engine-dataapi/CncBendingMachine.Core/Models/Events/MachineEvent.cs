namespace CncBendingMachine.Core.Models.Events;

/// <summary>
/// DataApi /corventa üzerinden UI'a push edilen event zarfı (envelope).
/// Tagged union pattern: eventType field'ı UI'da switch'le ayrılır, payload type-specific.
/// </summary>
/// <remarks>
/// Örnekler:
///   { messageType: "info",    eventType: "PartSensor",       payload: { leftPartSensor: true, rightPartSensor: false } }
///   { messageType: "warning", eventType: "OilTemperature",   payload: { tempC: 78, thresholdC: 75 } }
///   { messageType: "error",   eventType: "EmergencyStop",    payload: { source: "operator" } }
///   { messageType: "info",    eventType: "JobStatusChanged", payload: { jobId: 5, from: "Running", to: "Completed" } }
/// </remarks>
public class MachineEvent
{
    /// <summary>Severity / kategorizasyon: <see cref="EventMessageType"/> sabitlerinden biri.</summary>
    public string MessageType { get; set; } = EventMessageType.Info;

    /// <summary>Event tip ayırıcısı (discriminator). UI bu değere göre payload'u parse eder.</summary>
    public string EventType { get; set; } = string.Empty;

    /// <summary>UTC timestamp.</summary>
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    /// <summary>EventType'a özgü serbest payload (anonim object veya DTO; JSON'a serialize edilir).</summary>
    public object? Payload { get; set; }
}

/// <summary>
/// MachineEvent.MessageType için sabit string'ler — JSON'da aynen iletilir.
/// </summary>
public static class EventMessageType
{
    public const string Info = "info";
    public const string Warning = "warning";
    public const string Error = "error";
}

/// <summary>
/// Bilinen eventType sabitleri. Yeni event tipi eklerken burayı da güncelle.
/// </summary>
public static class EventTypes
{
    /// <summary>Parça varlık sensörü durumu — payload: { leftPartSensor: bool, rightPartSensor: bool }</summary>
    public const string PartSensor = "PartSensor";

    // Gelecekte: OilTemperature, EmergencyStop, JobStatusChanged, ...
}
