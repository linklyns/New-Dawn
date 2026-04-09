using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace New_Dawn.Migrations
{
    /// <inheritdoc />
    public partial class AddSocialDraftWebsiteUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "website_url",
                schema: "public",
                table: "social_media_drafts",
                type: "text",
                nullable: false,
                defaultValue: "new-dawn-virid.vercel.app");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "website_url",
                schema: "public",
                table: "social_media_drafts");
        }
    }
}
