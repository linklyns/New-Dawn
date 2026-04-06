using Microsoft.EntityFrameworkCore;
using New_Dawn.Models;

namespace New_Dawn.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<ConnectionProbe> ConnectionProbes => Set<ConnectionProbe>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ConnectionProbe>().HasKey(x => x.Value);
        base.OnModelCreating(modelBuilder);
    }
}
