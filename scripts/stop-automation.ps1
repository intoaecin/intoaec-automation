# Stop orphaned Cucumber / Playwright automation left running after Ctrl+C.
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File .\scripts\stop-automation.ps1

Write-Host 'Stopping orphaned cucumber-js / npx automation processes...'

$killed = @()
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | ForEach-Object {
  $cmd = $_.CommandLine
  if (-not $cmd) { return }
  if ($cmd -match 'cucumber' -and ($cmd -match 'intoaec-automation|cucumber-js|@cucumber')) {
    try {
      Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop
      $killed += "node $($_.ProcessId)"
      Write-Host "  killed node $($_.ProcessId)"
    } catch {}
  }
}

Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'" | ForEach-Object {
  $cmd = $_.CommandLine
  if ($cmd -match 'playwright_chromiumdev_profile') {
    try {
      Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop
      $killed += "chrome $($_.ProcessId)"
    } catch {}
  }
}

if ($killed.Count -eq 0) {
  Write-Host 'No orphaned cucumber automation processes found.'
} else {
  Write-Host ("Stopped: " + ($killed -join ', '))
}

Write-Host 'Done. You can start a fresh run now.'
