using BackEnd.Data;
using BackEnd.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(
        connectionString,
        ServerVersion.AutoDetect(connectionString)
    ));

builder.Services.AddScoped<ICompanyRegistrationService, CompanyRegistrationService>();
builder.Services.AddScoped<ILoginService, LoginService>();
builder.Services.AddScoped<EmailService>();

builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",
                "https://localhost:5173",
                "http://127.0.0.1:5173",
                "https://127.0.0.1:5173"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

app.UseDeveloperExceptionPage();

app.UseRouting();

app.UseCors("AllowReactApp");

app.UseStaticFiles();

app.UseAuthorization();

app.MapControllers();

app.Run();