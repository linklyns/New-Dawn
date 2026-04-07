using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using New_Dawn.Models;

namespace New_Dawn.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<ConnectionProbe> ConnectionProbes => Set<ConnectionProbe>();
    public DbSet<Safehouse> Safehouses => Set<Safehouse>();
    public DbSet<Resident> Residents => Set<Resident>();
    public DbSet<Supporter> Supporters => Set<Supporter>();
    public DbSet<Donation> Donations => Set<Donation>();
    public DbSet<DonationAllocation> DonationAllocations => Set<DonationAllocation>();
    public DbSet<SocialMediaPost> SocialMediaPosts => Set<SocialMediaPost>();
    public DbSet<ProcessRecording> ProcessRecordings => Set<ProcessRecording>();
    public DbSet<HomeVisitation> HomeVisitations => Set<HomeVisitation>();
    public DbSet<EducationRecord> EducationRecords => Set<EducationRecord>();
    public DbSet<HealthWellbeingRecord> HealthWellbeingRecords => Set<HealthWellbeingRecord>();
    public DbSet<InterventionPlan> InterventionPlans => Set<InterventionPlan>();
    public DbSet<IncidentReport> IncidentReports => Set<IncidentReport>();
    public DbSet<InKindDonationItem> InKindDonationItems => Set<InKindDonationItem>();
    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<PartnerAssignment> PartnerAssignments => Set<PartnerAssignment>();
    public DbSet<SafehouseMonthlyMetric> SafehouseMonthlyMetrics => Set<SafehouseMonthlyMetric>();
    public DbSet<PublicImpactSnapshot> PublicImpactSnapshots => Set<PublicImpactSnapshot>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // ConnectionProbe (existing)
        builder.Entity<ConnectionProbe>().HasKey(x => x.Value);

        // === Foreign Key Relationships ===

        // Resident -> Safehouse
        builder.Entity<Resident>()
            .HasOne(r => r.Safehouse)
            .WithMany(s => s.Residents)
            .HasForeignKey(r => r.SafehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        // Donation -> Supporter
        builder.Entity<Donation>()
            .HasOne(d => d.Supporter)
            .WithMany(s => s.Donations)
            .HasForeignKey(d => d.SupporterId)
            .OnDelete(DeleteBehavior.Restrict);

        // Donation -> SocialMediaPost (optional FK via referral_post_id)
        builder.Entity<Donation>()
            .HasOne(d => d.ReferralPost)
            .WithMany(p => p.Donations)
            .HasForeignKey(d => d.ReferralPostId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);

        // DonationAllocation -> Donation
        builder.Entity<DonationAllocation>()
            .HasOne(da => da.Donation)
            .WithMany(d => d.DonationAllocations)
            .HasForeignKey(da => da.DonationId)
            .OnDelete(DeleteBehavior.Restrict);

        // DonationAllocation -> Safehouse
        builder.Entity<DonationAllocation>()
            .HasOne(da => da.Safehouse)
            .WithMany(s => s.DonationAllocations)
            .HasForeignKey(da => da.SafehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        // ProcessRecording -> Resident
        builder.Entity<ProcessRecording>()
            .HasOne(pr => pr.Resident)
            .WithMany(r => r.ProcessRecordings)
            .HasForeignKey(pr => pr.ResidentId)
            .OnDelete(DeleteBehavior.Restrict);

        // HomeVisitation -> Resident
        builder.Entity<HomeVisitation>()
            .HasOne(hv => hv.Resident)
            .WithMany(r => r.HomeVisitations)
            .HasForeignKey(hv => hv.ResidentId)
            .OnDelete(DeleteBehavior.Restrict);

        // EducationRecord -> Resident
        builder.Entity<EducationRecord>()
            .HasOne(er => er.Resident)
            .WithMany(r => r.EducationRecords)
            .HasForeignKey(er => er.ResidentId)
            .OnDelete(DeleteBehavior.Restrict);

        // HealthWellbeingRecord -> Resident
        builder.Entity<HealthWellbeingRecord>()
            .HasOne(hw => hw.Resident)
            .WithMany(r => r.HealthWellbeingRecords)
            .HasForeignKey(hw => hw.ResidentId)
            .OnDelete(DeleteBehavior.Restrict);

        // InterventionPlan -> Resident
        builder.Entity<InterventionPlan>()
            .HasOne(ip => ip.Resident)
            .WithMany(r => r.InterventionPlans)
            .HasForeignKey(ip => ip.ResidentId)
            .OnDelete(DeleteBehavior.Restrict);

        // IncidentReport -> Resident
        builder.Entity<IncidentReport>()
            .HasOne(ir => ir.Resident)
            .WithMany(r => r.IncidentReports)
            .HasForeignKey(ir => ir.ResidentId)
            .OnDelete(DeleteBehavior.Restrict);

        // IncidentReport -> Safehouse
        builder.Entity<IncidentReport>()
            .HasOne(ir => ir.Safehouse)
            .WithMany(s => s.IncidentReports)
            .HasForeignKey(ir => ir.SafehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        // InKindDonationItem -> Donation
        builder.Entity<InKindDonationItem>()
            .HasOne(ik => ik.Donation)
            .WithMany(d => d.InKindDonationItems)
            .HasForeignKey(ik => ik.DonationId)
            .OnDelete(DeleteBehavior.Restrict);

        // PartnerAssignment -> Partner
        builder.Entity<PartnerAssignment>()
            .HasOne(pa => pa.Partner)
            .WithMany(p => p.PartnerAssignments)
            .HasForeignKey(pa => pa.PartnerId)
            .OnDelete(DeleteBehavior.Restrict);

        // PartnerAssignment -> Safehouse (optional FK)
        builder.Entity<PartnerAssignment>()
            .HasOne(pa => pa.Safehouse)
            .WithMany(s => s.PartnerAssignments)
            .HasForeignKey(pa => pa.SafehouseId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);

        // SafehouseMonthlyMetric -> Safehouse
        builder.Entity<SafehouseMonthlyMetric>()
            .HasOne(sm => sm.Safehouse)
            .WithMany(s => s.SafehouseMonthlyMetrics)
            .HasForeignKey(sm => sm.SafehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        // ApplicationUser -> Supporter (optional FK)
        builder.Entity<ApplicationUser>()
            .HasOne(u => u.Supporter)
            .WithMany()
            .HasForeignKey(u => u.LinkedSupporterId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);

        // ApplicationUser -> Partner (optional FK)
        builder.Entity<ApplicationUser>()
            .HasOne(u => u.Partner)
            .WithMany()
            .HasForeignKey(u => u.LinkedPartnerId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);

        // === Indexes ===

        // Residents indexes
        builder.Entity<Resident>()
            .HasIndex(r => r.CaseStatus);
        builder.Entity<Resident>()
            .HasIndex(r => r.SafehouseId);
        builder.Entity<Resident>()
            .HasIndex(r => r.ReintegrationStatus);
        builder.Entity<Resident>()
            .HasIndex(r => r.CurrentRiskLevel);

        // Supporters indexes
        builder.Entity<Supporter>()
            .HasIndex(s => s.SupporterType);

        // Donations indexes
        builder.Entity<Donation>()
            .HasIndex(d => d.DonationDate);
        builder.Entity<Donation>()
            .HasIndex(d => d.DonationType);
        builder.Entity<Donation>()
            .HasIndex(d => d.CampaignName);

        // IncidentReports indexes
        builder.Entity<IncidentReport>()
            .HasIndex(ir => ir.IncidentType);
        builder.Entity<IncidentReport>()
            .HasIndex(ir => ir.Severity);

        // SocialMediaPosts indexes
        builder.Entity<SocialMediaPost>()
            .HasIndex(p => p.Platform);

        // EducationRecords indexes
        builder.Entity<EducationRecord>()
            .HasIndex(er => er.RecordDate);

        // HealthWellbeingRecords indexes
        builder.Entity<HealthWellbeingRecord>()
            .HasIndex(hw => hw.RecordDate);

        // ProcessRecordings indexes
        builder.Entity<ProcessRecording>()
            .HasIndex(pr => pr.SessionDate);
    }
}
