# start-lan.ps1 — One-command LAN dev start for Expense Tracker (Windows).
# Opens the Windows Firewall for the dev port (one-time UAC prompt), prints the
# phone URL, then runs Next.js dev bound to all interfaces. Open the printed URL
# on your phone (same Wi-Fi).
#
# NOTE: over plain http on the LAN the browser isn't a "secure context", so the
# installable PWA / service worker won't activate — but the input loop, Firestore
# sync, Anonymous Auth and offline IndexedDB persistence all work. For a real PWA
# install test use HTTPS (a tunnel or the deployed build).
#
# Run with:  npm run dev:lan   (or)   powershell -ExecutionPolicy Bypass -File start-lan.ps1

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$port = 3000

# --- Ensure an inbound firewall rule exists for this port ---
$ruleName = "Expense Tracker ($port)"
$exists = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if (-not $exists) {
  Write-Host "Adding Windows Firewall rule '$ruleName' (you may see a UAC prompt)..." -ForegroundColor Cyan
  $cmd = "New-NetFirewallRule -DisplayName '$ruleName' -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port -Profile Private,Domain | Out-Null"
  try {
    Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile', '-Command', $cmd
    Write-Host "Firewall rule in place." -ForegroundColor Green
  } catch {
    Write-Warning "Skipped firewall rule (UAC declined). Add it manually if your phone can't connect:"
    Write-Host "  New-NetFirewallRule -DisplayName '$ruleName' -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port -Profile Private"
  }
} else {
  Write-Host "Firewall rule '$ruleName' already present." -ForegroundColor Green
}

# --- Find the LAN IPv4 (prefer Wi-Fi; skip loopback / link-local / virtual switches) ---
$ip = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object {
    $_.IPAddress -notlike '127.*' -and
    $_.IPAddress -notlike '169.254.*' -and
    $_.InterfaceAlias -notlike '*vEthernet*' -and
    $_.InterfaceAlias -notlike '*Loopback*'
  } |
  Sort-Object { $_.InterfaceAlias -like '*Wi-Fi*' } -Descending |
  Select-Object -First 1 -ExpandProperty IPAddress

Write-Host ""
if ($ip) {
  Write-Host "On your phone (same Wi-Fi), open:  http://$($ip):$port" -ForegroundColor Cyan
} else {
  Write-Host "Could not auto-detect a LAN IP - use the 'Network:' URL Next prints below." -ForegroundColor Yellow
}
Write-Host ""

# --- Run Next.js dev bound to all interfaces ---
npx next dev -H 0.0.0.0 -p $port
