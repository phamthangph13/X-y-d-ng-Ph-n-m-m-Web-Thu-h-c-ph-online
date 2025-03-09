using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WebProject.Models;
using WebProject.Models.Entities;

namespace WebProject
{
    public static class DbInitializer
    {
        public static async Task Initialize(IHost host)
        {
            using (var scope = host.Services.CreateScope())
            {
                var services = scope.ServiceProvider;
                try
                {
                    var context = services.GetRequiredService<ApplicationDbContext>();
                    var logger = services.GetRequiredService<ILogger<Program>>();

                    // Ensure database is created
                    context.Database.Migrate();

                    // Seed Departments if none exist
                    if (!context.Departments.Any())
                    {
                        logger.LogInformation("Seeding departments");
                        var departments = new List<Department>
                        {
                            new Department { DepartmentName = "Computer Science", DepartmentCode = "CS" },
                            new Department { DepartmentName = "Information Technology", DepartmentCode = "IT" },
                            new Department { DepartmentName = "Business Administration", DepartmentCode = "BA" },
                            new Department { DepartmentName = "Electrical Engineering", DepartmentCode = "EE" }
                        };
                        
                        context.Departments.AddRange(departments);
                        await context.SaveChangesAsync();
                    }

                    // Seed Classes if none exist
                    if (!context.Classes.Any())
                    {
                        logger.LogInformation("Seeding classes");
                        var departments = await context.Departments.ToListAsync();
                        
                        var classes = new List<Class>();
                        foreach (var dept in departments)
                        {
                            classes.AddRange(new List<Class>
                            {
                                new Class { ClassName = $"{dept.DepartmentName} - Class A", ClassCode = $"{dept.DepartmentCode}A", DepartmentID = dept.DepartmentID },
                                new Class { ClassName = $"{dept.DepartmentName} - Class B", ClassCode = $"{dept.DepartmentCode}B", DepartmentID = dept.DepartmentID }
                            });
                        }
                        
                        context.Classes.AddRange(classes);
                        await context.SaveChangesAsync();
                        logger.LogInformation($"Added {classes.Count} classes");
                    }
                }
                catch (Exception ex)
                {
                    var logger = services.GetRequiredService<ILogger<Program>>();
                    logger.LogError(ex, "An error occurred while seeding the database.");
                }
            }
        }
    }
} 