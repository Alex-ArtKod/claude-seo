# md-to-docx.ps1 — Convert a Markdown article to DOCX via Word COM automation
# Part of the seo-write skill (Phase 5)
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File md-to-docx.ps1 `
#       -InputFile  "path\to\article-final.md" `
#       -OutputFile "path\to\Article Title.docx"
#
# Requirements: Microsoft Word installed (tested on Word 16 / Microsoft 365)
# Encoding note: this file must be saved as UTF-8 with BOM before running.
# The caller should convert it with:
#   [IO.File]::WriteAllText($path,[IO.File]::ReadAllText($path,[Text.Encoding]::UTF8),[Text.UTF8Encoding]::new($true))

param(
    [Parameter(Mandatory)][string]$InputFile,
    [Parameter(Mandatory)][string]$OutputFile
)

# ── WdBuiltInStyle constants ────────────────────────────────────────────────────
$wdNormal     = -1
$wdH1         = -2
$wdH2         = -3
$wdH3         = -4
$wdListBullet = -49
$wdListNumber = -50

# ── Read source ─────────────────────────────────────────────────────────────────
$lines = [System.IO.File]::ReadAllLines($InputFile, [System.Text.Encoding]::UTF8)

# ── Helpers ─────────────────────────────────────────────────────────────────────

# Type text with **bold** segments into the active Word selection
function Write-FormattedText {
    param($sel, [string]$text)
    $parts = [regex]::Split($text, '(\*\*[^*]+?\*\*)')
    foreach ($part in $parts) {
        if ($part -match '^\*\*(.+?)\*\*$') {
            $sel.Font.Bold = $true
            $sel.TypeText($Matches[1])
            $sel.Font.Bold = $false
        } elseif ($part.Length -gt 0) {
            $sel.TypeText($part)
        }
    }
}

# Apply single-line borders to all table sides
function Set-AllBorders {
    param($tbl)
    $tbl.Borders.InsideLineStyle  = 1   # wdLineStyleSingle
    $tbl.Borders.InsideLineWidth  = 6   # wdLineWidth075pt
    $tbl.Borders.OutsideLineStyle = 1
    $tbl.Borders.OutsideLineWidth = 6
}

# ── Word bootstrap ───────────────────────────────────────────────────────────────
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc  = $word.Documents.Add()
$sel  = $word.Selection

# Page margins (2.5 cm all sides)
$sec = $doc.Sections(1)
$sec.PageSetup.LeftMargin   = $word.CentimetersToPoints(2.5)
$sec.PageSetup.RightMargin  = $word.CentimetersToPoints(2.5)
$sec.PageSetup.TopMargin    = $word.CentimetersToPoints(2.5)
$sec.PageSetup.BottomMargin = $word.CentimetersToPoints(2.5)

# Base font and spacing
$doc.Styles($wdNormal).Font.Name = "Calibri"
$doc.Styles($wdNormal).Font.Size = 11
$doc.Styles($wdNormal).ParagraphFormat.SpaceAfter  = 6
$doc.Styles($wdNormal).ParagraphFormat.SpaceBefore = 0

# Heading sizes
$doc.Styles($wdH1).Font.Size = 20
$doc.Styles($wdH1).ParagraphFormat.SpaceBefore = 0
$doc.Styles($wdH1).ParagraphFormat.SpaceAfter  = 12

$doc.Styles($wdH2).Font.Size = 15
$doc.Styles($wdH2).ParagraphFormat.SpaceBefore = 16
$doc.Styles($wdH2).ParagraphFormat.SpaceAfter  = 8

$doc.Styles($wdH3).Font.Size = 12
$doc.Styles($wdH3).ParagraphFormat.SpaceBefore = 10
$doc.Styles($wdH3).ParagraphFormat.SpaceAfter  = 4

# ── Main parse loop ──────────────────────────────────────────────────────────────
try {
    $i = 0
    while ($i -lt $lines.Length) {
        $line = $lines[$i]

        # Skip blank lines and horizontal rules
        if ($line.Trim() -eq '' -or $line -match '^---+\s*$') { $i++; continue }

        # H1
        if ($line -match '^# (.+)$') {
            $sel.Style = $doc.Styles($wdH1)
            $sel.TypeText($Matches[1])
            $sel.TypeParagraph()
            $i++; continue
        }

        # H2
        if ($line -match '^## (.+)$') {
            $sel.Style = $doc.Styles($wdH2)
            $sel.TypeText($Matches[1])
            $sel.TypeParagraph()
            $i++; continue
        }

        # H3
        if ($line -match '^### (.+)$') {
            $sel.Style = $doc.Styles($wdH3)
            $sel.TypeText($Matches[1])
            $sel.TypeParagraph()
            $i++; continue
        }

        # ── TABLE block ──────────────────────────────────────────────────────────
        if ($line -match '^\|') {
            $tblLines = [System.Collections.ArrayList]::new()
            while ($i -lt $lines.Length -and $lines[$i] -match '^\|') {
                [void]$tblLines.Add($lines[$i])
                $i++
            }

            # Separate separator rows from data rows
            $dataRows = [System.Collections.ArrayList]::new()
            $hasSep   = $false
            foreach ($tl in $tblLines) {
                if (($tl -replace '[-|:\s]', '') -eq '') { $hasSep = $true }
                else { [void]$dataRows.Add($tl) }
            }

            if ($dataRows.Count -gt 0) {
                $firstCells = ($dataRows[0] -split '\|') | Where-Object { $_ -ne '' }
                $numCols = $firstCells.Count
                $numRows = $dataRows.Count

                $tblRange = $sel.Range
                $tblRange.Collapse(1)   # wdCollapseStart
                $tbl = $doc.Tables.Add($tblRange, $numRows, $numCols)
                try { $tbl.AutoFitBehavior(1) } catch {}   # wdAutoFitWindow

                Set-AllBorders $tbl

                # Fill cells
                for ($r = 0; $r -lt $numRows; $r++) {
                    $cells = ($dataRows[$r] -split '\|') | Where-Object { $_ -ne '' }
                    for ($c = 0; $c -lt [Math]::Min($cells.Count, $numCols); $c++) {
                        $cellText  = $cells[$c].Trim()
                        $cellRange = $tbl.Cell($r + 1, $c + 1).Range
                        $cellRange.End = $cellRange.End - 1
                        $cellRange.Text = $cellText
                    }
                }

                # Header row: bold + light blue-gray background RGB(218,228,242)
                if ($hasSep) {
                    $tbl.Rows(1).Range.Bold = $true
                    $bgColor = 218 + (228 * 256) + (242 * 65536)
                    $tbl.Rows(1).Shading.BackgroundPatternColor = $bgColor
                }

                # Compact cell spacing
                for ($r = 1; $r -le $numRows; $r++) {
                    for ($c = 1; $c -le $numCols; $c++) {
                        $tbl.Cell($r,$c).Range.ParagraphFormat.SpaceAfter  = 2
                        $tbl.Cell($r,$c).Range.ParagraphFormat.SpaceBefore = 2
                    }
                }

                # Move selection past the table
                $tbl.Range.Select()
                $word.Selection.Collapse(0)   # wdCollapseEnd
                $sel = $word.Selection
                $sel.TypeParagraph()
            }
            continue
        }

        # ── BULLET LIST ──────────────────────────────────────────────────────────
        if ($line -match '^- ') {
            while ($i -lt $lines.Length -and $lines[$i] -match '^- (.*)$') {
                $itemText = $Matches[1]
                $sel.Style = $doc.Styles($wdListBullet)
                Write-FormattedText $sel $itemText
                $sel.TypeParagraph()
                $i++
            }
            $sel.Style = $doc.Styles($wdNormal)
            continue
        }

        # ── NUMBERED LIST ────────────────────────────────────────────────────────
        if ($line -match '^\d+\. ') {
            while ($i -lt $lines.Length -and $lines[$i] -match '^\d+\. (.*)$') {
                $itemText = $Matches[1]
                $sel.Style = $doc.Styles($wdListNumber)
                Write-FormattedText $sel $itemText
                $sel.TypeParagraph()
                $i++
            }
            $sel.Style = $doc.Styles($wdNormal)
            continue
        }

        # ── EXPERT QUOTE  (attribution: «quote text») ────────────────────────────
        if ($line -match ':\s*«') {
            $sel.Style = $doc.Styles($wdNormal)
            $sel.ParagraphFormat.LeftIndent  = $word.CentimetersToPoints(1.2)
            $sel.ParagraphFormat.RightIndent = $word.CentimetersToPoints(1.2)

            # Background: RGB(245,245,245) light gray
            $bgGray = 245 + (245 * 256) + (245 * 65536)
            $sel.ParagraphFormat.Shading.BackgroundPatternColor = $bgGray

            # Left accent border (wdBorderLeft = 5)
            $sel.ParagraphFormat.Borders(5).LineStyle = 1   # wdLineStyleSingle
            $sel.ParagraphFormat.Borders(5).LineWidth = 24  # wdLineWidth300pt (~3pt)
            $sel.ParagraphFormat.Borders(5).Color    = 5921370  # medium gray

            # Attribution part bold, quote text italic
            if ($line -match '^(.+?:\s*)(«.+)$') {
                $attribution = $Matches[1]
                $quoteText   = $Matches[2]
                $sel.Font.Bold   = $true
                $sel.Font.Italic = $false
                $sel.TypeText($attribution)
                $sel.Font.Bold   = $false
                $sel.Font.Italic = $true
                $sel.TypeText($quoteText)
                $sel.Font.Italic = $false
            } else {
                $sel.Font.Italic = $true
                Write-FormattedText $sel $line
                $sel.Font.Italic = $false
            }

            $sel.TypeParagraph()

            # Reset paragraph formatting for next paragraph
            $sel.ParagraphFormat.LeftIndent  = 0
            $sel.ParagraphFormat.RightIndent = 0
            $sel.ParagraphFormat.Shading.BackgroundPatternColor = -16777216   # wdColorAutomatic
            $sel.ParagraphFormat.Borders(5).LineStyle = 0   # wdLineStyleNone
            $i++
            continue
        }

        # ── NORMAL PARAGRAPH ─────────────────────────────────────────────────────
        $sel.Style = $doc.Styles($wdNormal)
        Write-FormattedText $sel $line
        $sel.TypeParagraph()
        $i++
    }

    # Remove trailing empty paragraph added by last TypeParagraph()
    $lastPara = $doc.Paragraphs($doc.Paragraphs.Count)
    if ($lastPara.Range.Text -eq [char]13) {
        $lastPara.Range.Delete() | Out-Null
    }

    # Save as DOCX (wdFormatDocx = 16)
    $doc.SaveAs2($OutputFile, 16)
    Write-Host "OK: $OutputFile"

} catch {
    Write-Host "ERROR at line $i : $($_.Exception.Message)"
    Write-Host $_.ScriptStackTrace
    exit 1
} finally {
    try { $doc.Close([ref]$false) } catch {}
    try { $word.Quit() } catch {}
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
