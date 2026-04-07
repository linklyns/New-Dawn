using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace New_Dawn.Migrations
{
    /// <inheritdoc />
    public partial class AddUserPartnerLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "linked_partner_id",
                table: "AspNetUsers",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_linked_partner_id",
                table: "AspNetUsers",
                column: "linked_partner_id");

            migrationBuilder.AddForeignKey(
                name: "FK_AspNetUsers_partners_linked_partner_id",
                table: "AspNetUsers",
                column: "linked_partner_id",
                principalSchema: "public",
                principalTable: "partners",
                principalColumn: "partner_id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AspNetUsers_partners_linked_partner_id",
                table: "AspNetUsers");

            migrationBuilder.DropIndex(
                name: "IX_AspNetUsers_linked_partner_id",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "linked_partner_id",
                table: "AspNetUsers");
        }
    }
}
