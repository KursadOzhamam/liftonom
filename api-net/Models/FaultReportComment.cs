namespace Liftonom.Api.Models;

public class FaultReportComment
{
    public long Id { get; set; }
    public long FaultReportId { get; set; }
    public long? UserId { get; set; }
    public string Comment { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public User? User { get; set; }
}
