using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WebProject.Models;
using WebProject.Models.Entities;

namespace WebProject.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    public class NotificationController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public NotificationController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/notifications - Get notifications for current user
        [HttpGet]
        public async Task<ActionResult<IEnumerable<NotificationDto>>> GetNotifications(
            [FromQuery] string? type = null,
            [FromQuery] bool? isRead = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            // Normally would get user ID from token, using a placeholder for now
            int userId = GetCurrentUserId();

            try
            {
                var query = _context.Notifications
                    .Where(n => n.UserID == userId)
                    .AsQueryable();

                // Apply filters
                if (!string.IsNullOrEmpty(type))
                {
                    query = query.Where(n => n.NotificationType == type);
                }

                if (isRead.HasValue)
                {
                    query = query.Where(n => n.IsRead == isRead.Value);
                }

                // Order by most recent first
                query = query.OrderByDescending(n => n.SentDate);

                // Get total count for pagination
                var totalItems = await query.CountAsync();
                var totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);

                // Apply pagination
                var items = await query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(n => new NotificationDto
                    {
                        NotificationId = n.NotificationID,
                        Title = n.Title,
                        Message = n.Message,
                        NotificationType = n.NotificationType,
                        SentDate = n.SentDate,
                        IsRead = n.IsRead
                    })
                    .ToListAsync();

                return Ok(new PagedResult
                {
                    Items = items,
                    CurrentPage = page,
                    PageSize = pageSize,
                    TotalCount = totalItems,
                    TotalPages = totalPages
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to retrieve notifications", error = ex.Message });
            }
        }

        // POST: api/notifications - Create a new notification
        [HttpPost]
        public async Task<ActionResult<NotificationDto>> CreateNotification(CreateNotificationDto model)
        {
            try
            {
                var notification = new Notification
                {
                    UserID = model.UserId,
                    Title = model.Title,
                    Message = model.Message,
                    NotificationType = model.NotificationType,
                    SentDate = DateTime.Now,
                    IsRead = false
                };

                _context.Notifications.Add(notification);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetNotification), new { id = notification.NotificationID }, new NotificationDto
                {
                    NotificationId = notification.NotificationID,
                    Title = notification.Title,
                    Message = notification.Message,
                    NotificationType = notification.NotificationType,
                    SentDate = notification.SentDate,
                    IsRead = notification.IsRead
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to create notification", error = ex.Message });
            }
        }

        // POST: api/notifications/tuition-reminder - Send tuition reminder notifications
        [HttpPost("tuition-reminder")]
        public async Task<ActionResult<BatchNotificationResult>> SendTuitionReminders(TuitionReminderDto model)
        {
            try
            {
                // Find students with unpaid/partial fees for the specified semester
                var studentFees = await _context.StudentFees
                    .Include(sf => sf.Student)
                        .ThenInclude(s => s.User)
                    .Include(sf => sf.Semester)
                    .Where(sf => sf.SemesterID == model.SemesterId &&
                           (sf.Status == "Unpaid" || sf.Status == "Partial") &&
                           sf.DueDate <= model.ReminderDate.AddDays(model.DaysBeforeDue))
                    .ToListAsync();

                int sent = 0;
                var notifications = new List<Notification>();

                foreach (var fee in studentFees)
                {
                    if (fee.Student?.User == null) continue;

                    // Get semester name safely
                    string semesterName = "hiện tại";
                    if (fee.Semester != null)
                    {
                        // Assuming Semester has a property like SemesterName or similar
                        semesterName = fee.Semester.SemesterName ?? "hiện tại";
                    }

                    // Calculate remaining amount
                    decimal remainingAmount = fee.TotalAmount;
                    if (fee.Payments != null && fee.Payments.Any())
                    {
                        remainingAmount -= fee.Payments.Sum(p => p.Amount);
                    }

                    var notification = new Notification
                    {
                        UserID = fee.Student.UserID,
                        Title = model.Title ?? $"Nhắc nhở thanh toán học phí kỳ {semesterName}",
                        Message = model.Message ?? 
                            $"Bạn còn khoản học phí chưa thanh toán: {remainingAmount:N0} VNĐ. " +
                            $"Hạn thanh toán: {fee.DueDate:dd/MM/yyyy}. Vui lòng thanh toán đúng hạn.",
                        NotificationType = "payment",
                        SentDate = DateTime.Now,
                        IsRead = false
                    };

                    notifications.Add(notification);
                    sent++;
                }

                if (notifications.Any())
                {
                    _context.Notifications.AddRange(notifications);
                    await _context.SaveChangesAsync();
                }

                return Ok(new BatchNotificationResult
                {
                    TotalStudents = studentFees.Count,
                    NotificationsSent = sent
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to send tuition reminders", error = ex.Message });
            }
        }

        // GET: api/notifications/{id} - Get notification by ID
        [HttpGet("{id}")]
        public async Task<ActionResult<NotificationDto>> GetNotification(int id)
        {
            try
            {
                var notification = await _context.Notifications.FindAsync(id);

                if (notification == null)
                {
                    return NotFound(new { message = "Notification not found" });
                }

                // Verify the notification belongs to the current user
                int currentUserId = GetCurrentUserId();
                if (notification.UserID != currentUserId)
                {
                    return Forbid();
                }

                return Ok(new NotificationDto
                {
                    NotificationId = notification.NotificationID,
                    Title = notification.Title,
                    Message = notification.Message,
                    NotificationType = notification.NotificationType,
                    SentDate = notification.SentDate,
                    IsRead = notification.IsRead
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to retrieve notification", error = ex.Message });
            }
        }

        // PATCH: api/notifications/{id}/mark-as-read - Mark notification as read
        [HttpPatch("{id}/mark-as-read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            try
            {
                var notification = await _context.Notifications.FindAsync(id);

                if (notification == null)
                {
                    return NotFound(new { message = "Notification not found" });
                }

                // Verify the notification belongs to the current user
                int currentUserId = GetCurrentUserId();
                if (notification.UserID != currentUserId)
                {
                    return Forbid();
                }

                notification.IsRead = true;
                await _context.SaveChangesAsync();

                return Ok(new { message = "Notification marked as read" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to mark notification as read", error = ex.Message });
            }
        }

        // PATCH: api/notifications/mark-all-read - Mark all notifications as read
        [HttpPatch("mark-all-read")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            try
            {
                int userId = GetCurrentUserId();

                var unreadNotifications = await _context.Notifications
                    .Where(n => n.UserID == userId && !n.IsRead)
                    .ToListAsync();

                foreach (var notification in unreadNotifications)
                {
                    notification.IsRead = true;
                }

                await _context.SaveChangesAsync();

                return Ok(new { message = $"{unreadNotifications.Count} notifications marked as read" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to mark all notifications as read", error = ex.Message });
            }
        }

        // Helper method to get the current user ID from JWT token
        // In a real app, this would use the JWT token from the request
        private int GetCurrentUserId()
        {
            // Placeholder - in a real application, would extract from JWT token
            return 1; // Default user ID for testing
        }
    }

    // DTOs for API requests and responses
    public class NotificationDto
    {
        public int NotificationId { get; set; }
        public string Title { get; set; }
        public string Message { get; set; }
        public string NotificationType { get; set; }
        public DateTime SentDate { get; set; }
        public bool IsRead { get; set; }
    }

    public class CreateNotificationDto
    {
        public int UserId { get; set; }
        public string Title { get; set; }
        public string Message { get; set; }
        public string NotificationType { get; set; }
    }

    public class TuitionReminderDto
    {
        public int SemesterId { get; set; }
        public DateTime ReminderDate { get; set; } = DateTime.Now;
        public int DaysBeforeDue { get; set; } = 7;
        public string Title { get; set; }
        public string Message { get; set; }
    }

    public class BatchNotificationResult
    {
        public int TotalStudents { get; set; }
        public int NotificationsSent { get; set; }
    }

    // Add a PagedResult class if not already defined elsewhere
    public class PagedResult
    {
        public IEnumerable<object> Items { get; set; }
        public int CurrentPage { get; set; }
        public int PageSize { get; set; }
        public int TotalCount { get; set; }
        public int TotalPages { get; set; }
    }
} 