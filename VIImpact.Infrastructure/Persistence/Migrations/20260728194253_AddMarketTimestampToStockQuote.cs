using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VIImpact.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMarketTimestampToStockQuote : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "MarketTimestampUtc",
                table: "StockQuotes",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MarketTimestampUtc",
                table: "StockQuotes");
        }
    }
}
