namespace New_Dawn.Services;

public class NotificationBackgroundService(
    IServiceProvider services,
    ILogger<NotificationBackgroundService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Notification background service started");

        // Delay initial run to let the app fully start
        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var notificationService = services.GetRequiredService<NotificationService>();
                await notificationService.GenerateAllAsync();
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Notification background service error");
            }

            await Task.Delay(Interval, stoppingToken);
        }
    }
}
