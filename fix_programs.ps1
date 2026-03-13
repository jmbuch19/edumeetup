
$files = Get-Content -LiteralPath "ts_errors.txt" | Select-String -Pattern "^([a-zA-Z0-9_\-\./\\(\)]+\.tsx?)\(\d+,\d+\): error TS" | ForEach-Object { $_.Matches.Groups[1].Value } | Sort-Object -Unique

foreach ($file in $files) {
    if (Test-Path -LiteralPath $file) {
        $text = Get-Content -LiteralPath $file -Raw
        $original = $text
        
        $text = $text -replace "include:\s*\{\s*programs:", "include: { programList:"
        $text = $text -replace "select:\s*\{\s*programs:", "select: { programList:"
        $text = $text -replace "\.programs([\?\.\[\(])", ".programList`$1"
        $text = $text -replace "programs:\s*\{\s*create:", "programList: { create:"
        $text = $text -replace "programs:\s*\{\s*connect:", "programList: { connect:"
        $text = $text -replace "\]\.programs", "].programList"
        
        if ($text -cne $original) {
            Set-Content -LiteralPath $file -Value $text
            Write-Host "Fixed: $file"
        }
    }
}

