# setup_scheduler.ps1 — Configure Windows Task Scheduler for nightly ML pipeline run
# Run this script once as Administrator to create the scheduled task.

$ErrorActionPreference = "Stop"

$taskName = "NewDawn_ML_Pipeline_Nightly"
$pythonExe = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $pythonExe) {
    $pythonExe = "python"
    Write-Warning "Could not find python on PATH. Using 'python' — ensure it's available."
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$scriptPath = Join-Path $scriptDir "run_all_pipelines.py"

Write-Host "Task Name    : $taskName"
Write-Host "Python       : $pythonExe"
Write-Host "Script       : $scriptPath"
Write-Host "Schedule     : Daily at 2:00 AM"
Write-Host ""

# Remove existing task if present
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Removing existing task..."
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create action
$action = New-ScheduledTaskAction `
    -Execute $pythonExe `
    -Argument "`"$scriptPath`"" `
    -WorkingDirectory $scriptDir

# Create trigger: daily at 02:00
$trigger = New-ScheduledTaskTrigger -Daily -At "02:00"

# Settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable:$false `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1)

# Register
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Nightly refresh of New Dawn ML prediction CSVs" `
    -RunLevel Highest

Write-Host ""
Write-Host "Scheduled task '$taskName' created successfully." -ForegroundColor Green
Write-Host "To run manually: schtasks /Run /TN '$taskName'"
Write-Host "To remove:       Unregister-ScheduledTask -TaskName '$taskName'"
