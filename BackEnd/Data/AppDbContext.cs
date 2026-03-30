using Microsoft.EntityFrameworkCore;
using BackEnd.Models;

namespace BackEnd.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Company> Companies { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<UserRole> UserRoles { get; set; }
        public DbSet<PriorityMultiplier> PriorityMultipliers { get; set; }
        public DbSet<ComplexityMultiplier> ComplexityMultipliers { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Company>(entity =>
            {
                entity.ToTable("Companies");
                entity.HasKey(c => c.CompanyId);

                entity.HasIndex(c => c.CompanyName).IsUnique();
                entity.HasIndex(c => c.CompanyCode).IsUnique();

                entity.Property(c => c.CompanyName).IsRequired().HasMaxLength(255);
                entity.Property(c => c.CompanyCode).IsRequired().HasMaxLength(255);
                entity.Property(c => c.EmailDomain).IsRequired();
                entity.Property(c => c.CompanyPhone).IsRequired();
                entity.Property(c => c.Address).IsRequired();
            });

            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("Users");
                entity.HasKey(u => u.UserId);

                entity.HasIndex(u => u.Email).IsUnique();

                entity.Property(u => u.FullName).IsRequired();
                entity.Property(u => u.Email).IsRequired();
                entity.Property(u => u.PasswordHash).IsRequired();

                entity.HasOne(u => u.Company)
                    .WithMany()
                    .HasForeignKey(u => u.CompanyId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Role>(entity =>
            {
                entity.ToTable("Roles");
                entity.HasKey(r => r.RoleId);

                entity.Property(r => r.RoleName).IsRequired();
            });

            modelBuilder.Entity<UserRole>(entity =>
            {
                entity.ToTable("UserRoles");
                entity.HasKey(ur => ur.UserRoleId);

                entity.HasOne(ur => ur.User)
                    .WithMany()
                    .HasForeignKey(ur => ur.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(ur => ur.Role)
                    .WithMany()
                    .HasForeignKey(ur => ur.RoleId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<PriorityMultiplier>(entity =>
            {
                entity.ToTable("PriorityMultipliers");
                entity.HasKey(p => p.Id);

                entity.Property(p => p.PriorityName).IsRequired();

                entity.HasOne<Company>()
                    .WithMany()
                    .HasForeignKey(p => p.CompanyId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ComplexityMultiplier>(entity =>
            {
                entity.ToTable("ComplexityMultipliers");
                entity.HasKey(c => c.Id);

                entity.Property(c => c.ComplexityName).IsRequired();

                entity.HasOne<Company>()
                    .WithMany()
                    .HasForeignKey(c => c.CompanyId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}