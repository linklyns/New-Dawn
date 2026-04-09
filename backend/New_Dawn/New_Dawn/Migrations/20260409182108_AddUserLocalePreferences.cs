using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace New_Dawn.Migrations
{
    /// <inheritdoc />
    public partial class AddUserLocalePreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "preferred_currency",
                table: "AspNetUsers",
                type: "text",
                nullable: false,
                defaultValue: "PHP");

            migrationBuilder.AddColumn<string>(
                name: "preferred_language",
                table: "AspNetUsers",
                type: "text",
                nullable: false,
                defaultValue: "en");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "preferred_currency",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "preferred_language",
                table: "AspNetUsers");
        }
    }
}
