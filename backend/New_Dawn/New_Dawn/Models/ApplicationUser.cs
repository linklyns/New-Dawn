using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Identity;

namespace New_Dawn.Models;

public class ApplicationUser : IdentityUser
{
    [Column("display_name")]
    public string DisplayName { get; set; } = string.Empty;

    [Column("linked_supporter_id")]
    public int? LinkedSupporterId { get; set; }

    [Column("linked_partner_id")]
    public int? LinkedPartnerId { get; set; }

    // Navigation properties
    [ForeignKey("LinkedSupporterId")]
    public Supporter? Supporter { get; set; }

    [ForeignKey("LinkedPartnerId")]
    public Partner? Partner { get; set; }
}
