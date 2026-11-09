using System.ComponentModel.DataAnnotations;

namespace StrataHu.Api.Models;

public sealed class Project
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(600)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(2400)]
    public string? LongDescription { get; set; }

    [MaxLength(80)]
    public string Category { get; set; } = "Fejlesztői eszközök";

    [MaxLength(500)]
    public string? ImageUrl { get; set; }

    [MaxLength(4)]
    public string Tier { get; set; } = "A";

    public int? Rank { get; set; }

    [MaxLength(240)]
    public string? Verdict { get; set; }

    [Required]
    [MaxLength(80)]
    public string AuthorHandle { get; set; } = string.Empty;

    [Required]
    [MaxLength(160)]
    public string ContactInfo { get; set; } = string.Empty;

    [Required]
    public string[] TechStack { get; set; } = [];

    [Required]
    [MaxLength(500)]
    public string RepositoryUrl { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? LiveDemoUrl { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? DeletedAtUtc { get; set; }

    public ICollection<TakedownLog> TakedownLogs { get; set; } = new List<TakedownLog>();
}
