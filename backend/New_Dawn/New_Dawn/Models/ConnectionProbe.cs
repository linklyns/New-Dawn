using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace New_Dawn.Models;

[Table("connection_probe", Schema = "public")]
public class ConnectionProbe
{
    [Key]
    [Column("value")]
    public string Value { get; set; } = string.Empty;
}
