using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace New_Dawn.Migrations
{
    /// <inheritdoc />
    public partial class RestoreNotificationPdfFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS list_data text;");
            migrationBuilder.Sql("ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_role text;");
            migrationBuilder.Sql("ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_id text;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE public.notifications DROP COLUMN IF EXISTS list_data;");
            migrationBuilder.Sql("ALTER TABLE public.notifications DROP COLUMN IF EXISTS target_role;");
            migrationBuilder.Sql("ALTER TABLE public.notifications DROP COLUMN IF EXISTS user_id;");
        }
    }
}
