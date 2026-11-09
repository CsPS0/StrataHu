using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StrataHu.Api.Data.Migrations;

/// <inheritdoc />
public partial class InitialCreate : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "projects",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                description = table.Column<string>(type: "character varying(600)", maxLength: 600, nullable: false),
                long_description = table.Column<string>(type: "character varying(2400)", maxLength: 2400, nullable: true),
                category = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false, defaultValue: "Fejlesztői eszközök"),
                image_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                tier = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: false, defaultValue: "A"),
                rank = table.Column<int>(type: "integer", nullable: true),
                verdict = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: true),
                author_handle = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                contact_info = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                tech_stack = table.Column<string[]>(type: "text[]", nullable: false),
                repository_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                live_demo_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                deleted_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_projects", x => x.id);
            });

        migrationBuilder.CreateTable(
            name: "takedown_logs",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                project_id = table.Column<Guid>(type: "uuid", nullable: false),
                requester_contact = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                reason = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: false),
                status = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false, defaultValue: "PendingAudit"),
                requested_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_takedown_logs", x => x.id);
                table.ForeignKey(
                    name: "FK_takedown_logs_projects_project_id",
                    column: x => x.project_id,
                    principalTable: "projects",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_projects_created_at_utc",
            table: "projects",
            column: "created_at_utc");

        migrationBuilder.CreateIndex(
            name: "IX_projects_is_active",
            table: "projects",
            column: "is_active");

        migrationBuilder.CreateIndex(
            name: "IX_takedown_logs_project_id",
            table: "takedown_logs",
            column: "project_id");

        migrationBuilder.CreateIndex(
            name: "IX_takedown_logs_requested_at_utc",
            table: "takedown_logs",
            column: "requested_at_utc");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "takedown_logs");

        migrationBuilder.DropTable(
            name: "projects");
    }
}
