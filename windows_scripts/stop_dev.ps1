$ErrorActionPreference = 'SilentlyContinue'

$scripts = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = (Resolve-Path (Split-Path -Parent $scripts)).Path
$project = (Resolve-Path (Join-Path $root 'nextjs_space')).Path
$stopped = $false

$processes = Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -and $_.CommandLine.Contains($project)
}

foreach ($process in $processes) {
  $command = $process.CommandLine
  if ($command -match 'next|multiplayer-server|npm(\.cmd)?\s+run\s+dev|npm(\.cmd)?\s+run\s+multiplayer:server') {
    Write-Host "Stopping Lucky Tycoon process $($process.ProcessId)..."
    Stop-Process -Id $process.ProcessId -Force
    $stopped = $true
  }
}

if (-not $stopped) {
  Write-Host 'No Lucky Tycoon development servers were running.'
}
