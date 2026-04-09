using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace New_Dawn.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationUserAndRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "list_data",
                schema: "public",
                table: "notifications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "target_role",
                schema: "public",
                table: "notifications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "user_id",
                schema: "public",
                table: "notifications",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_notifications_target_role",
                schema: "public",
                table: "notifications",
                column: "target_role");

            migrationBuilder.CreateIndex(
                name: "IX_notifications_user_id",
                schema: "public",
                table: "notifications",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_notifications_target_role",
                schema: "public",
                table: "notifications");

            migrationBuilder.DropIndex(
                name: "IX_notifications_user_id",
                schema: "public",
                table: "notifications");

            migrationBuilder.DropColumn(
                name: "list_data",
                schema: "public",
                table: "notifications");

            migrationBuilder.DropColumn(
                name: "target_role",
                schema: "public",
                table: "notifications");

            migrationBuilder.DropColumn(
                name: "user_id",
                schema: "public",
                table: "notifications");
        }
    }
}
