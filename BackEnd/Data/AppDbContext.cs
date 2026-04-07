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
            public DbSet<TaskItem> Tasks { get; set; }
            public DbSet<Team> Teams { get; set; }
            public DbSet<TeamMember> TeamMembers { get; set; }
            public DbSet<BackEnd.Models.TaskStatus> TaskStatuses { get; set; }
            public DbSet<TaskStatusHistory> TaskStatusHistories { get; set; }

            protected override void OnModelCreating(ModelBuilder modelBuilder)
            {
                  base.OnModelCreating(modelBuilder);

                  modelBuilder.Entity<Company>(entity =>
                  {
                        entity.ToTable("Companies");

                        entity.HasKey(c => c.CompanyId);

                        entity.Property(c => c.CompanyName).IsRequired();
                        entity.Property(c => c.CompanyCode).IsRequired();

                        entity.HasIndex(c => c.CompanyName).IsUnique();
                        entity.HasIndex(c => c.CompanyCode).IsUnique();

                        entity.Property(c => c.EmailDomain);

                        entity.Property(c => c.CompanyPhone)
                        .IsRequired()
                        .HasMaxLength(30);

                        entity.Property(c => c.Address)
                        .IsRequired()
                        .HasMaxLength(255);

                        entity.Property(c => c.IsActive)
                        .HasDefaultValue(true);
                  });

                  modelBuilder.Entity<User>(entity =>
                  {
                        entity.ToTable("Users");
                        entity.HasKey(u => u.UserId);

                        entity.HasIndex(u => u.Email).IsUnique();

                        entity.Property(u => u.FullName).IsRequired();
                        entity.Property(u => u.Email).IsRequired();
                        entity.Property(u => u.PasswordHash).IsRequired();
                        entity.Property(u => u.JobTitle).IsRequired().HasMaxLength(100);

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

                        entity.Property(p => p.Id)
                              .HasColumnName("PriorityMultiplierId");

                        entity.Property(p => p.Multiplier)
                              .HasColumnName("MultiplierValue");

                        entity.Property(p => p.PriorityName)
                              .IsRequired();

                        entity.HasOne<Company>()
                              .WithMany()
                              .HasForeignKey(p => p.CompanyId)
                              .OnDelete(DeleteBehavior.Restrict);
                  });

                  modelBuilder.Entity<ComplexityMultiplier>(entity =>
                  {
                        entity.ToTable("ComplexityMultipliers");

                        entity.HasKey(c => c.Id);

                        entity.Property(c => c.Id)
                              .HasColumnName("ComplexityMultiplierId");

                        entity.Property(c => c.Multiplier)
                              .HasColumnName("MultiplierValue");

                        entity.Property(c => c.ComplexityName)
                              .IsRequired();

                        entity.HasOne<Company>()
                              .WithMany()
                              .HasForeignKey(c => c.CompanyId)
                              .OnDelete(DeleteBehavior.Restrict);
                  });

                  modelBuilder.Entity<TaskItem>(entity =>
                  {
                        entity.ToTable("Tasks");

                        entity.HasKey(t => t.TaskId);

                        entity.Property(t => t.Title)
                              .IsRequired()
                              .HasMaxLength(200);

                        entity.Property(t => t.Description);

                        entity.Property(t => t.Priority)
                              .IsRequired()
                              .HasMaxLength(20);

                        entity.Property(t => t.Complexity)
                              .IsRequired()
                              .HasMaxLength(20);

                        entity.Property(t => t.EstimatedEffortHours)
                              .HasPrecision(10, 2);

                        entity.Property(t => t.Weight)
                              .HasPrecision(10, 2);

                        entity.HasOne<Company>()
                              .WithMany()
                              .HasForeignKey(t => t.CompanyId)
                              .OnDelete(DeleteBehavior.Restrict);

                        entity.HasOne<Team>()
                              .WithMany()
                              .HasForeignKey(t => t.TeamId)
                              .OnDelete(DeleteBehavior.Restrict);

                        entity.HasOne<User>()
                              .WithMany()
                              .HasForeignKey(t => t.AssignedToUserId)
                              .OnDelete(DeleteBehavior.Restrict);

                        entity.HasOne<User>()
                              .WithMany()
                              .HasForeignKey(t => t.CreatedByUserId)
                              .OnDelete(DeleteBehavior.Restrict);

                        entity.HasOne<BackEnd.Models.TaskStatus>()
                              .WithMany()
                              .HasForeignKey(t => t.TaskStatusId)
                              .OnDelete(DeleteBehavior.Restrict);
                  });

                  modelBuilder.Entity<BackEnd.Models.TaskStatus>(entity =>
                  {
                        entity.ToTable("TaskStatuses");

                        entity.HasKey(ts => ts.TaskStatusId);

                        entity.Property(ts => ts.StatusName)
                              .IsRequired()
                              .HasMaxLength(100);

                        entity.Property(ts => ts.IsDefault)
                              .HasDefaultValue(false);

                        entity.Property(ts => ts.IsActive)
                              .HasDefaultValue(true);

                        entity.Property(ts => ts.CreatedAt)
                              .HasDefaultValueSql("CURRENT_TIMESTAMP");

                        entity.HasIndex(ts => new { ts.CompanyId, ts.StatusName })
                              .IsUnique();

                        entity.HasIndex(ts => new { ts.CompanyId, ts.DisplayOrder });

                        entity.HasOne<Company>()
                              .WithMany()
                              .HasForeignKey(ts => ts.CompanyId)
                              .OnDelete(DeleteBehavior.Restrict);
                  });

                  modelBuilder.Entity<TaskStatusHistory>(entity =>
                  {
                        entity.ToTable("TaskStatusHistory");

                        entity.HasKey(tsh => tsh.TaskStatusHistoryId);

                        entity.Property(tsh => tsh.ChangedAt)
                              .HasDefaultValueSql("CURRENT_TIMESTAMP");

                        entity.HasOne<Company>()
                              .WithMany()
                              .HasForeignKey(tsh => tsh.CompanyId)
                              .OnDelete(DeleteBehavior.Restrict);

                        entity.HasOne<TaskItem>()
                              .WithMany()
                              .HasForeignKey(tsh => tsh.TaskId)
                              .OnDelete(DeleteBehavior.Restrict);

                        entity.HasOne<User>()
                              .WithMany()
                              .HasForeignKey(tsh => tsh.ChangedByUserId)
                              .OnDelete(DeleteBehavior.Restrict);

                        entity.HasOne<BackEnd.Models.TaskStatus>()
                              .WithMany()
                              .HasForeignKey(tsh => tsh.OldTaskStatusId)
                              .OnDelete(DeleteBehavior.Restrict);

                        entity.HasOne<BackEnd.Models.TaskStatus>()
                              .WithMany()
                              .HasForeignKey(tsh => tsh.NewTaskStatusId)
                              .OnDelete(DeleteBehavior.Restrict);
                  });

                  modelBuilder.Entity<Team>(entity =>
                  {
                        entity.ToTable("Teams");

                        entity.HasKey(t => t.TeamId);

                        entity.Property(t => t.TeamName)
                              .IsRequired()
                              .HasMaxLength(100);

                        entity.Property(t => t.Description)
                              .HasMaxLength(255);

                        entity.Property(t => t.IsActive)
                              .HasDefaultValue(true);

                        entity.HasIndex(t => new { t.CompanyId, t.TeamName })
                              .IsUnique();

                        entity.HasOne<Company>()
                              .WithMany()
                              .HasForeignKey(t => t.CompanyId)
                              .OnDelete(DeleteBehavior.Restrict);

                        entity.HasOne<User>()
                              .WithMany()
                              .HasForeignKey(t => t.TeamLeaderUserId)
                              .OnDelete(DeleteBehavior.Restrict);
                  });

                  modelBuilder.Entity<TeamMember>(entity =>
                  {
                        entity.ToTable("TeamMembers");

                        entity.HasKey(tm => tm.TeamMemberId);

                        entity.Property(tm => tm.JoinedAt)
                              .HasDefaultValueSql("CURRENT_TIMESTAMP");

                        entity.Property(tm => tm.IsActive)
                              .HasDefaultValue(true);

                        entity.HasIndex(tm => new { tm.TeamId, tm.UserId })
                              .IsUnique();

                        entity.HasOne<Company>()
                              .WithMany()
                              .HasForeignKey(tm => tm.CompanyId)
                              .OnDelete(DeleteBehavior.Restrict);

                        entity.HasOne<Team>()
                              .WithMany()
                              .HasForeignKey(tm => tm.TeamId)
                              .OnDelete(DeleteBehavior.Restrict);

                        entity.HasOne<User>()
                              .WithMany()
                              .HasForeignKey(tm => tm.UserId)
                              .OnDelete(DeleteBehavior.Restrict);
                  });
            }
      }
}
