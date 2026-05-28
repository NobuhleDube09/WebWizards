# Push .env variables to Vercel production
# Skips PORT, DATABASE_URL, DB_PASSWORD, DB_POOLER_HOST (migration-only / not used by server)

$skip = @('PORT', 'DATABASE_URL', 'DB_PASSWORD', 'DB_POOLER_HOST')

Get-Content .env | ForEach-Object {
    $line = $_.Trim()
    if ($line -match '^([A-Z_][A-Z0-9_]*)=(.*)$') {
        $key   = $Matches[1]
        $value = $Matches[2].Trim('"').Trim("'")

        if ($skip -contains $key) {
            Write-Host "  SKIP  $key" -ForegroundColor DarkGray
            return
        }

        # Override FRONTEND_URL to the live Vercel domain
        if ($key -eq 'FRONTEND_URL') {
            $value = 'https://campus-connect-sigma-seven.vercel.app'
        }

        Write-Host "  ADD   $key" -ForegroundColor Cyan
        $value | vercel env add $key production --force 2>&1 | Out-Null
    }
}

Write-Host "`nDone. Run 'vercel env ls' to verify." -ForegroundColor Green
