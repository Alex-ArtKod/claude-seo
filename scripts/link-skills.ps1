<#
.SYNOPSIS
  Exposes this repo's local-only skills to Claude Code by creating directory
  junctions from ~/.claude/skills/<name> to <repo>/skills/<name>.

.DESCRIPTION
  Claude Code discovers skills from ~/.claude/skills/, not from an arbitrary
  repo folder. This script links selected skill folders so the repository stays
  the single source of truth: edit files in the repo, changes are live, no copies.

  Run once per machine after cloning the repo (and again only if ~/.claude/skills
  is wiped). Junctions are NOT stored in git — they are local to each machine.

  Safe by design: it only ever removes an existing reparse point (junction/
  symlink). If a real directory already exists at the target name, it is left
  untouched and reported, so existing skill copies are never destroyed.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\link-skills.ps1
#>

# Skills to link. Add a folder name here when you create a new local skill.
$skills = @('seo-write', 'seo-writer', 'seo-context')

$repoSkills  = Join-Path $PSScriptRoot '..\skills' | Resolve-Path | Select-Object -ExpandProperty Path
$skillsHome  = Join-Path $env:USERPROFILE '.claude\skills'

if (-not (Test-Path $skillsHome)) {
    New-Item -ItemType Directory -Path $skillsHome -Force | Out-Null
}

foreach ($name in $skills) {
    $target = Join-Path $repoSkills $name
    $link   = Join-Path $skillsHome $name

    if (-not (Test-Path $target)) {
        Write-Host "[skip] $name - not found in repo ($target)" -ForegroundColor Yellow
        continue
    }

    if (Test-Path $link) {
        $item = Get-Item $link -Force
        $isReparse = $item.Attributes -band [IO.FileAttributes]::ReparsePoint
        if ($isReparse) {
            # Remove only the reparse point; never touches the target contents.
            [System.IO.Directory]::Delete($link, $false)
        } else {
            Write-Host "[skip] $name - a REAL directory already exists at $link (not replacing)" -ForegroundColor Yellow
            continue
        }
    }

    New-Item -ItemType Junction -Path $link -Target $target | Out-Null
    $ok = Test-Path (Join-Path $link 'SKILL.md')
    if ($ok) {
        Write-Host "[ok]   $name -> $target" -ForegroundColor Green
    } else {
        Write-Host "[warn] $name linked but SKILL.md not found" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Done. Restart Claude Code so it re-discovers the skills." -ForegroundColor Cyan
