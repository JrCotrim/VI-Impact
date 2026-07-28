using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VIImpact.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDatabaseIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Symbol",
                table: "StockQuotes",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateIndex(
                name: "IX_StockQuotes_Symbol_MarketTimestampUtc",
                table: "StockQuotes",
                columns: new[] { "Symbol", "MarketTimestampUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_StockQuotes_Symbol_RecordedAtUtc",
                table: "StockQuotes",
                columns: new[] { "Symbol", "RecordedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_GtaEvents_OccurredAtUtc",
                table: "GtaEvents",
                column: "OccurredAtUtc");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_StockQuotes_Symbol_MarketTimestampUtc",
                table: "StockQuotes");

            migrationBuilder.DropIndex(
                name: "IX_StockQuotes_Symbol_RecordedAtUtc",
                table: "StockQuotes");

            migrationBuilder.DropIndex(
                name: "IX_GtaEvents_OccurredAtUtc",
                table: "GtaEvents");

            migrationBuilder.AlterColumn<string>(
                name: "Symbol",
                table: "StockQuotes",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");
        }
    }
}
