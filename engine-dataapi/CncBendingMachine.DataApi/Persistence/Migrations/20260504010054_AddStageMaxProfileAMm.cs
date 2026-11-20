using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CncBendingMachine.DataApi.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddStageMaxProfileAMm : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "MaxProfileAMm",
                table: "Stages",
                type: "REAL",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Stages",
                keyColumn: "Id",
                keyValue: 1,
                column: "MaxProfileAMm",
                value: 50.0);

            migrationBuilder.UpdateData(
                table: "Stages",
                keyColumn: "Id",
                keyValue: 2,
                column: "MaxProfileAMm",
                value: 120.0);

            migrationBuilder.UpdateData(
                table: "Stages",
                keyColumn: "Id",
                keyValue: 3,
                column: "MaxProfileAMm",
                value: 250.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MaxProfileAMm",
                table: "Stages");
        }
    }
}
