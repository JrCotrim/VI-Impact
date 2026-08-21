using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VIImpact.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddGtaEventSummary : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Summary",
                table: "GtaEvents",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE "GtaEvents"
                SET "Summary" = "Description"
                WHERE "Summary" IS NULL;
                """);

            migrationBuilder.AlterColumn<string>(
                name: "Summary",
                table: "GtaEvents",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(1000)",
                oldMaxLength: 1000,
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Summary",
                table: "GtaEvents");
        }
    }
}
