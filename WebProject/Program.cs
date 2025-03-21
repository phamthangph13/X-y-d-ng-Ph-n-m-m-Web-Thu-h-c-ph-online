using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using WebProject;  // Added for DbInitializer
using WebProject.Authentication.Services;
using Microsoft.AspNetCore.Hosting;
using WebProject.Models;
using WebProject.Models.Entities;
using BCrypt.Net;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorPages();
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

// Add DbContext
builder.Services.AddDbContext<WebProject.Models.ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Add CORS policy to allow requests from any origin during development
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin() // Change back to allowing any origin for development
              .AllowAnyMethod()
              .AllowAnyHeader();
        // Note: AllowCredentials cannot be used with AllowAnyOrigin
    });
});

// Add authentication services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IEmailService, EmailService>();

// Configure JWT authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(
            builder.Configuration["Jwt:Key"] ?? "defaultSecretKeyForDevelopment12345678901234")),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };
})
.AddGoogle(options =>
{
    options.ClientId = builder.Configuration["Authentication:Google:ClientId"] ?? "";
    options.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"] ?? "";
})
.AddFacebook(options =>
{
    options.AppId = builder.Configuration["Authentication:Facebook:AppId"] ?? "";
    options.AppSecret = builder.Configuration["Authentication:Facebook:AppSecret"] ?? "";
});

// Add Swagger
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Online Fee Payment API", Version = "v1" });
    
    // Configure Swagger to use JWT Authentication
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

var app = builder.Build();

// Seed test data if in Development environment
if (app.Environment.IsDevelopment())
{
    using (var scope = app.Services.CreateScope())
    {
        var serviceProvider = scope.ServiceProvider;
        var dbContext = serviceProvider.GetRequiredService<ApplicationDbContext>();
        SeedTestData(dbContext);
    }
}

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}
else
{
    // Enable Swagger UI in development
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Online Fee Payment API v1");
    });
}

app.UseHttpsRedirection();

// Enable CORS - Make sure this comes before UseRouting and UseAuthorization
app.UseCors("AllowAll");

// Use default files before static files
app.UseDefaultFiles(new DefaultFilesOptions
{
    DefaultFileNames = new List<string> { "index.html" }
});

app.UseStaticFiles();

app.UseRouting();

// Add authentication and authorization middleware
app.UseAuthentication();
app.UseAuthorization();

app.MapRazorPages();
app.MapControllers();

// Add route for home page
app.MapGet("/", context => {
    context.Response.Redirect("/index.html");
    return Task.CompletedTask;
});

// Initialize the database with seed data
await DbInitializer.Initialize(app);

app.Run();

// Method to seed test data
void SeedTestData(ApplicationDbContext dbContext)
{
    // Only seed if no users exist
    if (dbContext.Users.Any())
    {
        return;
    }

    Console.WriteLine("Seeding test data...");

    // Create departments
    var csDepartment = new Department
    {
        DepartmentName = "Công nghệ thông tin",
        DepartmentCode = "CNTT"
    };
    
    var businessDepartment = new Department
    {
        DepartmentName = "Quản trị kinh doanh",
        DepartmentCode = "QTKD"
    };
    
    dbContext.Departments.AddRange(csDepartment, businessDepartment);
    dbContext.SaveChanges();

    // Create classes
    var class1 = new Class
    {
        ClassName = "Công nghệ thông tin K17",
        ClassCode = "CNTT-K17",
        DepartmentID = csDepartment.DepartmentID
    };
    
    var class2 = new Class
    {
        ClassName = "Quản trị kinh doanh K17",
        ClassCode = "QTKD-K17",
        DepartmentID = businessDepartment.DepartmentID
    };
    
    dbContext.Classes.AddRange(class1, class2);
    dbContext.SaveChanges();

    // Create student users
    for (int i = 1; i <= 5; i++)
    {
        // Create user account
        var user = new User
        {
            Email = $"student{i}@example.com",
            Password = BCrypt.Net.BCrypt.HashPassword("password123"),  // Hashed password
            FullName = $"Sinh viên {i}",
            PhoneNumber = $"098765432{i}",
            UserType = "Student",
            IsActive = true,
            RegistrationDate = DateTime.Now.AddDays(-i * 10),
            LastLogin = DateTime.Now.AddDays(-i)
        };
        
        dbContext.Users.Add(user);
        dbContext.SaveChanges();
        
        // Create student profile
        var student = new Student
        {
            UserID = user.UserID,
            StudentCode = $"SV{i.ToString().PadLeft(5, '0')}",
            DepartmentID = i % 2 == 0 ? businessDepartment.DepartmentID : csDepartment.DepartmentID,
            ClassID = i % 2 == 0 ? class2.ClassID : class1.ClassID,
            EnrollmentYear = DateTime.Now.Year - (i % 3),
            CurrentSemester = (i % 6) + 1
        };
        
        dbContext.Students.Add(student);
        dbContext.SaveChanges();
    }

    // Create accountant users
    for (int i = 1; i <= 3; i++)
    {
        var accountant = new User
        {
            Email = $"accountant{i}@example.com",
            Password = BCrypt.Net.BCrypt.HashPassword("password123"),  // Hashed password
            FullName = $"Kế toán {i}",
            PhoneNumber = $"097654321{i}",
            UserType = "Accountant",
            IsActive = true,
            RegistrationDate = DateTime.Now.AddDays(-i * 5),
            LastLogin = DateTime.Now.AddDays(-i)
        };
        
        dbContext.Users.Add(accountant);
    }
    
    dbContext.SaveChanges();
    Console.WriteLine("Test data seeded successfully!");
}
