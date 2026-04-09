using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace New_Dawn.Migrations
{
    /// <inheritdoc />
    public partial class AddSocialMediaDrafts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "social_media_drafts",
                schema: "public",
                columns: table => new
                {
                    draft_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    created_by_id = table.Column<string>(type: "text", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    stage = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    platform = table.Column<string>(type: "text", nullable: false),
                    post_type = table.Column<string>(type: "text", nullable: false),
                    media_type = table.Column<string>(type: "text", nullable: false),
                    call_to_action_type = table.Column<string>(type: "text", nullable: false),
                    content_topic = table.Column<string>(type: "text", nullable: false),
                    sentiment_tone = table.Column<string>(type: "text", nullable: false),
                    hashtags = table.Column<string>(type: "text", nullable: false),
                    audience = table.Column<string>(type: "text", nullable: false),
                    campaign_name = table.Column<string>(type: "text", nullable: false),
                    additional_instructions = table.Column<string>(type: "text", nullable: false),
                    headline = table.Column<string>(type: "text", nullable: false),
                    body = table.Column<string>(type: "text", nullable: false),
                    cta_text = table.Column<string>(type: "text", nullable: false),
                    scheduled_day = table.Column<string>(type: "text", nullable: true),
                    scheduled_hour = table.Column<int>(type: "integer", nullable: true),
                    chat_history_json = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_social_media_drafts", x => x.draft_id);
                    table.ForeignKey(
                        name: "FK_social_media_drafts_AspNetUsers_created_by_id",
                        column: x => x.created_by_id,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "social_media_draft_media",
                schema: "public",
                columns: table => new
                {
                    media_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    draft_id = table.Column<int>(type: "integer", nullable: false),
                    file_name = table.Column<string>(type: "text", nullable: false),
                    content_type = table.Column<string>(type: "text", nullable: false),
                    media_kind = table.Column<string>(type: "text", nullable: false),
                    storage_path = table.Column<string>(type: "text", nullable: false),
                    file_size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    uploaded_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_social_media_draft_media", x => x.media_id);
                    table.ForeignKey(
                        name: "FK_social_media_draft_media_social_media_drafts_draft_id",
                        column: x => x.draft_id,
                        principalSchema: "public",
                        principalTable: "social_media_drafts",
                        principalColumn: "draft_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_social_media_draft_media_draft_id",
                schema: "public",
                table: "social_media_draft_media",
                column: "draft_id");

            migrationBuilder.CreateIndex(
                name: "IX_social_media_drafts_created_by_id",
                schema: "public",
                table: "social_media_drafts",
                column: "created_by_id");

            migrationBuilder.CreateIndex(
                name: "IX_social_media_drafts_updated_at",
                schema: "public",
                table: "social_media_drafts",
                column: "updated_at");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "social_media_draft_media",
                schema: "public");

            migrationBuilder.DropTable(
                name: "social_media_drafts",
                schema: "public");
        }
    }
}
