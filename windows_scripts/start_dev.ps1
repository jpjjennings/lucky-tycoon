$ErrorActionPreference = 'Stop'

$scripts = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $scripts
$project = Join-Path $root 'nextjs_space'
$port = if ($env:DEV_PORT) { [int]$env:DEV_PORT } else { 3000 }
$url = if ($env:DEV_URL) { $env:DEV_URL } else { "http://localhost:$port" }

function Stop-ListeningPort([int]$Port) {
  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  foreach ($connection in $connections) {
    $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
      Write-Host "Stopping existing process $($process.Id) on port $Port..."
      Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
  }
}

Stop-ListeningPort $port
if ($port -ne 3001) { Stop-ListeningPort 3001 }

if (-not (Test-Path (Join-Path $project 'node_modules\.bin\next.cmd'))) {
  Write-Host 'Installing project dependencies...'
  Push-Location $project
  try { npm.cmd install --legacy-peer-deps }
  finally { Pop-Location }
}

$nextCommand = "cd /d `"$project`" && npm.cmd run dev -- --hostname 127.0.0.1 --port $port"
$multiplayerCommand = "cd /d `"$project`" && npm.cmd run multiplayer:server"
Start-Process cmd.exe -ArgumentList '/k', $nextCommand -WorkingDirectory $project
Start-Process cmd.exe -ArgumentList '/k', $multiplayerCommand -WorkingDirectory $project

Write-Host "Starting the development server at $url"
Write-Host 'Starting the multiplayer server at ws://localhost:3001'
Start-Process $url
