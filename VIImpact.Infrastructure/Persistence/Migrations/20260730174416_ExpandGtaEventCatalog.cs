using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VIImpact.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ExpandGtaEventCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(
            MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DELETE FROM [GtaEvents]
                WHERE [Title] IN
                (
                    N'GTA VI event test',
                    N'GTA VI impact calculation test'
                )
                OR [SourceUrl] IN
                (
                    N'https://example.com/gta-vi-test',
                    N'https://example.com/gta-vi-impact-test'
                );
                """);

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "GtaEvents",
                type: "nvarchar(240)",
                maxLength: 240,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "SourceUrl",
                table: "GtaEvents",
                type: "nvarchar(2048)",
                maxLength: 2048,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "GtaEvents",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "GtaEvents",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false);

            migrationBuilder.AddColumn<string>(
                name: "DatePrecision",
                table: "GtaEvents",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsImpactAnalysisEligible",
                table: "GtaEvents",
                type: "bit",
                nullable: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsOfficial",
                table: "GtaEvents",
                type: "bit",
                nullable: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "OccurredUntilUtc",
                table: "GtaEvents",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Priority",
                table: "GtaEvents",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "PublishedAtUtc",
                table: "GtaEvents",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Slug",
                table: "GtaEvents",
                type: "nvarchar(180)",
                maxLength: 180,
                nullable: false);

            migrationBuilder.AddColumn<string>(
                name: "SourceName",
                table: "GtaEvents",
                type: "nvarchar(160)",
                maxLength: 160,
                nullable: false);

            migrationBuilder.AddColumn<string>(
                name: "SourceType",
                table: "GtaEvents",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "GtaEvents",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false);

            migrationBuilder.AddColumn<string>(
                name: "Subcategory",
                table: "GtaEvents",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: false);

            migrationBuilder.CreateIndex(
                name: "IX_GtaEvents_Status_OccurredAtUtc",
                table: "GtaEvents",
                columns: new[]
                {
                    "Status",
                    "OccurredAtUtc"
                });

            migrationBuilder.CreateIndex(
                name: "UX_GtaEvents_Slug",
                table: "GtaEvents",
                column: "Slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(
            MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_GtaEvents_Status_OccurredAtUtc",
                table: "GtaEvents");

            migrationBuilder.DropIndex(
                name: "UX_GtaEvents_Slug",
                table: "GtaEvents");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "GtaEvents");

            migrationBuilder.DropColumn(
                name: "DatePrecision",
                table: "GtaEvents");

            migrationBuilder.DropColumn(
                name: "IsImpactAnalysisEligible",
                table: "GtaEvents");

            migrationBuilder.DropColumn(
                name: "IsOfficial",
                table: "GtaEvents");

            migrationBuilder.DropColumn(
                name: "OccurredUntilUtc",
                table: "GtaEvents");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "GtaEvents");

            migrationBuilder.DropColumn(
                name: "PublishedAtUtc",
                table: "GtaEvents");

            migrationBuilder.DropColumn(
                name: "Slug",
                table: "GtaEvents");

            migrationBuilder.DropColumn(
                name: "SourceName",
                table: "GtaEvents");

            migrationBuilder.DropColumn(
                name: "SourceType",
                table: "GtaEvents");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "GtaEvents");

            migrationBuilder.DropColumn(
                name: "Subcategory",
                table: "GtaEvents");

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "GtaEvents",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(240)",
                oldMaxLength: 240);

            migrationBuilder.AlterColumn<string>(
                name: "SourceUrl",
                table: "GtaEvents",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(2048)",
                oldMaxLength: 2048);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "GtaEvents",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(2000)",
                oldMaxLength: 2000);
        }
    }
}