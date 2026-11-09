using System.ComponentModel.DataAnnotations;

namespace StrataHu.Api.Models;

public sealed class TakedownLog
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid ProjectId { get; set; }

    public Project? Project { get; set; }

    [Required]
    [MaxLength(160)]
    public string RequesterContact { get; set; } = string.Empty;

    [Required]
    [MaxLength(1500)]
    public string Reason { get; set; } = string.Empty;

    [MaxLength(64)]
    public string Status { get; set; } = "PendingAudit";

    public DateTimeOffset RequestedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
