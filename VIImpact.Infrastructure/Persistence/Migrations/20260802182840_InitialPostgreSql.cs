using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VIImpact.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialPostgreSql : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GtaEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Slug = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    Title = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Category = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Subcategory = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Priority = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SourceType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SourceName = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    SourceUrl = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    OccurredAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    OccurredUntilUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PublishedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DatePrecision = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsOfficial = table.Column<bool>(type: "boolean", nullable: false),
                    IsImpactAnalysisEligible = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GtaEvents", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "StockQuotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Symbol = table.Column<string>(type: "text", nullable: false),
                    Price = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    ChangePercent = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    Volume = table.Column<long>(type: "bigint", nullable: false),
                    RecordedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    MarketTimestampUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockQuotes", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GtaEvents_OccurredAtUtc",
                table: "GtaEvents",
                column: "OccurredAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_GtaEvents_Status_OccurredAtUtc",
                table: "GtaEvents",
                columns: new[] { "Status", "OccurredAtUtc" });

            migrationBuilder.CreateIndex(
                name: "UX_GtaEvents_Slug",
                table: "GtaEvents",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StockQuotes_Symbol_MarketTimestampUtc",
                table: "StockQuotes",
                columns: new[] { "Symbol", "MarketTimestampUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_StockQuotes_Symbol_RecordedAtUtc",
                table: "StockQuotes",
                columns: new[] { "Symbol", "RecordedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GtaEvents");

            migrationBuilder.DropTable(
                name: "StockQuotes");
        }
    }
}
