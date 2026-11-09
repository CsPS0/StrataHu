using Microsoft.EntityFrameworkCore;
using StrataHu.Api.Models;

namespace StrataHu.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Project> Projects => Set<Project>();

    public DbSet<TakedownLog> TakedownLogs => Set<TakedownLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Project>(entity =>
        {
            entity.ToTable("projects");
            entity.HasKey(p => p.Id);

            entity.Property(p => p.Id).HasColumnName("id");
            entity.Property(p => p.Name).HasColumnName("name").HasMaxLength(120).IsRequired();
            entity.Property(p => p.Description).HasColumnName("description").HasMaxLength(600).IsRequired();
            entity.Property(p => p.LongDescription).HasColumnName("long_description").HasMaxLength(2400);
            entity.Property(p => p.Category).HasColumnName("category").HasMaxLength(80).HasDefaultValue("Fejlesztői eszközök").IsRequired();
            entity.Property(p => p.ImageUrl).HasColumnName("image_url").HasMaxLength(500);
            entity.Property(p => p.Tier).HasColumnName("tier").HasMaxLength(4).HasDefaultValue("A").IsRequired();
            entity.Property(p => p.Rank).HasColumnName("rank");
            entity.Property(p => p.Verdict).HasColumnName("verdict").HasMaxLength(240);
            entity.Property(p => p.AuthorHandle).HasColumnName("author_handle").HasMaxLength(80).IsRequired();
            entity.Property(p => p.ContactInfo).HasColumnName("contact_info").HasMaxLength(160).IsRequired();
            entity.Property(p => p.TechStack).HasColumnName("tech_stack").HasColumnType("text[]").IsRequired();
            entity.Property(p => p.RepositoryUrl).HasColumnName("repository_url").HasMaxLength(500).IsRequired();
            entity.Property(p => p.LiveDemoUrl).HasColumnName("live_demo_url").HasMaxLength(500);
            entity.Property(p => p.IsActive).HasColumnName("is_active").HasDefaultValue(true).IsRequired();
            entity.Property(p => p.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
            entity.Property(p => p.DeletedAtUtc).HasColumnName("deleted_at_utc");

            entity.HasIndex(p => p.IsActive);
            entity.HasIndex(p => p.CreatedAtUtc);
        });

        modelBuilder.Entity<TakedownLog>(entity =>
        {
            entity.ToTable("takedown_logs");
            entity.HasKey(t => t.Id);

            entity.Property(t => t.Id).HasColumnName("id");
            entity.Property(t => t.ProjectId).HasColumnName("project_id").IsRequired();
            entity.Property(t => t.RequesterContact).HasColumnName("requester_contact").HasMaxLength(160).IsRequired();
            entity.Property(t => t.Reason).HasColumnName("reason").HasMaxLength(1500).IsRequired();
            entity.Property(t => t.Status).HasColumnName("status").HasMaxLength(64).HasDefaultValue("PendingAudit").IsRequired();
            entity.Property(t => t.RequestedAtUtc).HasColumnName("requested_at_utc").IsRequired();

            entity.HasOne(t => t.Project)
                .WithMany(p => p.TakedownLogs)
                .HasForeignKey(t => t.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(t => t.ProjectId);
            entity.HasIndex(t => t.RequestedAtUtc);
        });
    }
}
