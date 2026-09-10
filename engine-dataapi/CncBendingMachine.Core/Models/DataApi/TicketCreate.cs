namespace CncBendingMachine.Core.Models.DataApi;

public class TicketCreate
{
    public string Type { get; set; } = "";
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public string? CreatedBy { get; set; }
}

public class TicketStatusUpdate
{
    public string Action { get; set; } = "";
    public string? Response { get; set; }
}
