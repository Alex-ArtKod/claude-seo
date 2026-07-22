<#
.SYNOPSIS
  Assembles a writer project: turns flat TZ .md files into the per-TZ subfolder
  layout that /seo-writer and /rating-writer require.

.DESCRIPTION
  For each TZ file it creates <OutDir>\<tz-basename>\ and copies into it:
    - the TZ .md itself (kept under its own name),
    - project-context.md (from -ContextFile),
    - rules.md            (from -RulesFile),
    - participants.md / criteria.md if -Participants / -Criteria are given
      (used for rating folders).

  Idempotent & resume-safe: a subfolder that already holds article-final.md or a
  fresh .in_progress marker is left untouched (it is claimed or done). Otherwise
  the distilled inputs are (re)copied so a re-run refreshes context/rules without
  clobbering work in progress.

.PARAMETER TzFiles
  Comma-separated absolute paths to TZ .md files. Mutually exclusive with -TzDir.

.PARAMETER TzDir
  Folder to take every *.md from (non-recursive). Ignored if -TzFiles is set.

.PARAMETER ContextFile
  Path to project-context.md produced by /seo-context. Required.

.PARAMETER RulesFile
  Path to rules.md produced by /seo-context. Required.

.PARAMETER OutDir
  Writer project folder where per-TZ subfolders are created. Required.

.PARAMETER Participants
  Optional path to participants.md (rating folders only).

.PARAMETER Criteria
  Optional path to criteria.md (rating folders only).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File assemble-project.ps1 `
    -TzDir "C:\Users\Алекс\Desktop\тексты\Новые ТЗ" `
    -ContextFile "C:\proj\project-context.md" `
    -RulesFile "C:\proj\rules.md" `
    -OutDir "C:\proj\writer"
#>
[CmdletBinding()]
param(
  [string]$TzFiles,
  [string]$TzDir,
  [Parameter(Mandatory=$true)][string]$ContextFile,
  [Parameter(Mandatory=$true)][string]$RulesFile,
  [Parameter(Mandatory=$true)][string]$OutDir,
  [string]$Participants,
  [string]$Criteria
)

$ErrorActionPreference = 'Stop'
$OutputEncoding = [Text.UTF8Encoding]::new($false)

function Fail($msg) { Write-Host "ОШИБКА: $msg" -ForegroundColor Red; exit 1 }

# --- validate distilled inputs -------------------------------------------------
if (-not (Test-Path -LiteralPath $ContextFile)) { Fail "нет project-context.md: $ContextFile" }
if (-not (Test-Path -LiteralPath $RulesFile))   { Fail "нет rules.md: $RulesFile" }
if ($Participants -and -not (Test-Path -LiteralPath $Participants)) { Fail "нет participants.md: $Participants" }
if ($Criteria     -and -not (Test-Path -LiteralPath $Criteria))     { Fail "нет criteria.md: $Criteria" }

# --- resolve the TZ list -------------------------------------------------------
$tzList = @()
if ($TzFiles) {
  $tzList = $TzFiles -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ }
} elseif ($TzDir) {
  if (-not (Test-Path -LiteralPath $TzDir)) { Fail "нет папки ТЗ: $TzDir" }
  $tzList = Get-ChildItem -LiteralPath $TzDir -Filter '*.md' -File | Select-Object -ExpandProperty FullName
} else {
  Fail "укажите -TzFiles или -TzDir"
}
if (-not $tzList -or $tzList.Count -eq 0) { Fail "не найдено ни одного ТЗ" }

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$created = 0; $refreshed = 0; $skipped = 0
$report = @()

foreach ($tz in $tzList) {
  if (-not (Test-Path -LiteralPath $tz)) { $report += "  ⚠ пропущен (нет файла): $tz"; $skipped++; continue }

  $base   = [IO.Path]::GetFileNameWithoutExtension($tz)
  $sub    = Join-Path $OutDir $base
  $exists = Test-Path -LiteralPath $sub

  # resume-safety: never touch a claimed or finished folder
  if ($exists) {
    $final    = Test-Path -LiteralPath (Join-Path $sub 'article-final.md')
    $marker   = Join-Path $sub '.in_progress'
    $claimed  = $false
    if (Test-Path -LiteralPath $marker) {
      $age = (Get-Date).ToUniversalTime() - (Get-Item -LiteralPath $marker).LastWriteTimeUtc
      if ($age.TotalHours -lt 6) { $claimed = $true }
    }
    if ($final -or $claimed) {
      $report += "  = пропущен ($([string]::Join('', @(if($final){'готов'}else{'в работе'})))): $base"
      $skipped++; continue
    }
  }

  New-Item -ItemType Directory -Force -Path $sub | Out-Null
  Copy-Item -LiteralPath $tz          -Destination (Join-Path $sub ([IO.Path]::GetFileName($tz))) -Force
  Copy-Item -LiteralPath $ContextFile -Destination (Join-Path $sub 'project-context.md') -Force
  Copy-Item -LiteralPath $RulesFile   -Destination (Join-Path $sub 'rules.md') -Force
  if ($Participants) { Copy-Item -LiteralPath $Participants -Destination (Join-Path $sub 'participants.md') -Force }
  if ($Criteria)     { Copy-Item -LiteralPath $Criteria     -Destination (Join-Path $sub 'criteria.md') -Force }

  if ($exists) { $report += "  ~ обновлён: $base"; $refreshed++ }
  else         { $report += "  + создан:  $base"; $created++ }
}

Write-Host ""
Write-Host "Сборка проекта: $OutDir" -ForegroundColor Cyan
$report | ForEach-Object { Write-Host $_ }
Write-Host ""
Write-Host "Итог: создано $created, обновлено $refreshed, пропущено $skipped (из $($tzList.Count))" -ForegroundColor Green
if ($Participants -or $Criteria) {
  Write-Host "Рейтинговый режим: в каждую папку добавлены participants.md / criteria.md" -ForegroundColor Yellow
}
