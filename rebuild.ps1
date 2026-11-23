<#
.SYNOPSIS
  Rebuild the inventory monorepo (backend and/or frontend) and restart the pm2
  processes that serve them at http://localhost:8080/inventory-app.

.DESCRIPTION
  Both pm2 processes serve COMPILED output, not live source:
    - inventory-backend  -> apps/backend/dist/main.js            (port 3100)
    - inventory-frontend -> vite preview of apps/frontend/dist   (port 5174)
  Neither watches source, so source edits only appear after a rebuild + restart.
  This script does exactly that, and clears orphaned processes that hold the
  ports (the EADDRINUSE gotcha) before restarting.

.PARAMETER Backend
  Rebuild + restart only the backend.

.PARAMETER Frontend
  Rebuild + restart only the frontend.
  (If neither -Backend nor -Frontend is given, BOTH are rebuilt.)

.PARAMETER NoRestart
  Build only; do not touch pm2.

.EXAMPLE
  .\rebuild.ps1            # rebuild + restart both
  .\rebuild.ps1 -Frontend  # frontend only
  .\rebuild.ps1 -Backend   # backend only
  .\rebuild.ps1 -NoRestart # build both, skip pm2 restart
#>

[CmdletBinding()]
param(
  [switch]$Backend,
  [switch]$Frontend,
  [switch]$NoRestart
)

$ErrorActionPreference = 'Stop'

# If neither target is specified, do both.
$doBackend  = $Backend -or (-not $Backend -and -not $Frontend)
$doFrontend = $Frontend -or (-not $Backend -and -not $Frontend)

$root         = $PSScriptRoot
$backendDir   = Join-Path $root 'apps\backend'
$frontendDir  = Join-Path $root 'apps\frontend'
$backendPort  = 3100
$frontendPort = 5174

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    [ok] $msg" -ForegroundColor Green }
function Write-Warn2($msg) { Write-Host "    [warn] $msg" -ForegroundColor Yellow }

# Run pnpm and fail hard on a non-zero exit (pnpm is a .cmd on Windows).
function Invoke-Build($dir, $label) {
  Write-Step "Building $label ($dir)"
  Push-Location $dir
  try {
    & pnpm build
    if ($LASTEXITCODE -ne 0) { throw "$label build failed (exit $LASTEXITCODE)" }
    Write-Ok "$label built"
  } finally {
    Pop-Location
  }
}

# Free a TCP port whose owner survived a crash and causes EADDRINUSE on restart.
function Clear-Port($port) {
  try {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop
  } catch {
    return  # nothing listening
  }
  foreach ($c in $conns) {
    $procId = $c.OwningProcess
    try {
      $p = Get-Process -Id $procId -ErrorAction Stop
      Write-Warn2 "Port $port held by PID $procId ($($p.ProcessName)); stopping it"
      Stop-Process -Id $procId -Force -ErrorAction Stop
      Write-Ok "Freed port $port"
    } catch {
      Write-Warn2 ("Could not stop PID {0} on port {1}: {2}" -f $procId, $port, $_.Exception.Message)
    }
  }
}

# Restart a pm2 app; if it is not registered yet, surface that clearly.
function Restart-Pm2($name) {
  Write-Step "Restarting pm2 process '$name'"
  & pm2 restart $name --update-env
  if ($LASTEXITCODE -ne 0) {
    Write-Warn2 "pm2 restart '$name' failed (exit $LASTEXITCODE). Is it registered? Try 'pm2 list'."
  } else {
    Write-Ok "'$name' restarted"
  }
}

$restartLabel = (-not $NoRestart)
Write-Host "Inventory rebuild - backend:$doBackend frontend:$doFrontend restart:$restartLabel" -ForegroundColor Magenta

# --- Build phase -------------------------------------------------------------
if ($doBackend)  { Invoke-Build $backendDir  'inventory-backend' }   # nest build
if ($doFrontend) { Invoke-Build $frontendDir 'inventory-frontend' }  # tsc -b && vite build

# --- Restart phase -----------------------------------------------------------
if ($NoRestart) {
  Write-Step "NoRestart set - skipping pm2."
  Write-Host "`nDone (build only)." -ForegroundColor Magenta
  exit 0
}

if ($doBackend) {
  Clear-Port $backendPort
  Restart-Pm2 'inventory-backend'
}
if ($doFrontend) {
  Clear-Port $frontendPort
  Restart-Pm2 'inventory-frontend'
}

Write-Step "pm2 status"
& pm2 list

Write-Host "`nDone. Open http://localhost:8080/inventory-app (hard-refresh: Ctrl+F5)." -ForegroundColor Magenta
