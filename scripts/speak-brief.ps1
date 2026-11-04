# Reads a daily brief out loud on this computer's speakers, and saves the recording next to it
# (docs/briefs/audio/<date>.wav) so it can be played again.
# Run with: powershell -ExecutionPolicy Bypass -File scripts/speak-brief.ps1            (newest brief)
#       or: powershell -ExecutionPolicy Bypass -File scripts/speak-brief.ps1 -Path docs/briefs/2026-11-03.md
param([string]$Path, [switch]$NoPlay, [switch]$ShowText)

$root = Split-Path -Parent $PSScriptRoot
if (-not $Path) {
  $Path = (Get-ChildItem (Join-Path $root 'docs\briefs') -Filter '*.md' | Sort-Object Name | Select-Object -Last 1).FullName
}
$Path = (Resolve-Path $Path).Path

# Turn the written brief into sentences that sound natural when spoken.
$dot = [string][char]0x00B7   # the middle dot used in the brief's second line
$lines = New-Object System.Collections.Generic.List[string]
foreach ($line in Get-Content $Path -Encoding UTF8) {
  $t = $line.Trim()
  if ($t -eq '' -or $t -match '^\|?[\s\-:|]+\|?$') { continue }          # blank lines, table rulers
  # A wrapped line (indented, not a new point) carries on the sentence above it.
  $carryOn = $line -match '^\s+\S' -and $t -notmatch '^([-*]|\d+\.)\s' -and $lines.Count -gt 0
  $t = [regex]::Replace($t, '`([^`]*)`', {                              # file names: say the words only
    param($m)
    $s = $m.Groups[1].Value -replace '^.*/', '' -replace '\.(sql|md|js|ts|tsx|pdf)$', ''
    $s -replace 'upgrade-', '' -replace '[-_/]', ' ' })
  $t = $t -replace '^#+\s*', '' -replace '\*\*', '' -replace '^\s*[-*]\s+', '' -replace '^\|\s*|\s*\|$', ''
  $t = $t -replace '\s*\|\s*', ': ' -replace ('\s*' + $dot + '\s*'), '. ' -replace '\bv(\d+)\b', 'version $1'
  $t = $t -replace 'XCD', 'E C dollars' -replace '\bFri\b', 'Friday' -replace '\bNov\b', 'November' -replace '\be\.g\.', 'for example'
  $t = $t -replace '(\d+)-(\d+)', '$1 to $2' -replace '\s+>\s+', ', then ' -replace 'npm run check:db,?\s*', ''
  $t = $t -replace '\s*<[^>@]+@[^>]+>', '' -replace 'servlyag\.com', 'servly A G dot com' -replace 'Servly AG', 'Servly A G'
  # Also a wrapped line: the line above has no full stop yet and this one starts in lower case.
  if (-not $carryOn -and $lines.Count -gt 0 -and $line -notmatch '^\s*([-*#|]|\d+\.)' -and
      $lines[$lines.Count - 1] -notmatch '[.:!?)]$' -and $t -cmatch '^[a-z]') { $carryOn = $true }
  if ($carryOn) { $lines[$lines.Count - 1] = $lines[$lines.Count - 1] + ' ' + $t } else { $lines.Add($t) }
}
$text = ($lines | ForEach-Object { if ($_ -notmatch '[.:!?]$') { $_ + '.' } else { $_ } }) -join "`n"
if ($ShowText) { Write-Output $text; return }

Add-Type -AssemblyName System.Speech
$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice.Rate = -1   # a little slower than normal
$audioDir = Join-Path (Split-Path -Parent $Path) 'audio'
New-Item -ItemType Directory -Force $audioDir | Out-Null
$wav = Join-Path $audioDir (([IO.Path]::GetFileNameWithoutExtension($Path)) + '.wav')
$voice.SetOutputToWaveFile($wav)
$voice.Speak($text)
$voice.Dispose()
Write-Output "Saved: $wav"

if (-not $NoPlay) {
  $player = New-Object System.Media.SoundPlayer $wav
  $player.PlaySync()
  Write-Output 'Finished playing.'
}
