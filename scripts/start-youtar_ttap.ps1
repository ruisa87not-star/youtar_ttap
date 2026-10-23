param(
    [string]$AppDirectory = (Join-Path $PSScriptRoot '..'),
    [switch]$CheckOnly
)

$ErrorActionPreference = 'Stop'
try {
    $AppDirectory = (Resolve-Path -LiteralPath $AppDirectory).Path
    $executable = Join-Path $AppDirectory 'release\win-unpacked\youtar_ttap.exe'
    $archive = Join-Path $AppDirectory 'release\win-unpacked\resources\app.asar'
    $state = 'Current'
    if (!(Test-Path -LiteralPath $executable) -or !(Test-Path -LiteralPath $archive)) {
        $state = 'Missing'
    } else {
        $packagedAt = (Get-Item -LiteralPath $archive).LastWriteTimeUtc
        $inputs = @(
            if (Test-Path -LiteralPath (Join-Path $AppDirectory 'src')) {
                Get-Item -LiteralPath (Join-Path $AppDirectory 'src')
                # A deleted file updates its parent directory, not the remaining files.
                Get-ChildItem -LiteralPath (Join-Path $AppDirectory 'src') -Recurse
            } else { $state = 'Stale' }
            foreach ($name in @('package.json','package-lock.json','index.html','electron.vite.config.ts','electron-builder.yml')) {
                $path = Join-Path $AppDirectory $name
                if (Test-Path -LiteralPath $path) { Get-Item -LiteralPath $path }
                else { $state = 'Stale' }
            }
        )
        if ($inputs | Where-Object { $_.LastWriteTimeUtc -gt $packagedAt } | Select-Object -First 1) {
            $state = 'Stale'
        }
    }
    Write-Host "youtar_ttap package: $state"
    if ($CheckOnly) {
        if ($state -eq 'Current') { exit 0 }
        exit 2
    }
    if ($state -ne 'Current') {
        $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
        if (!$npm -or !(Test-Path -LiteralPath (Join-Path $AppDirectory 'node_modules\electron-builder'))) {
            throw "A new desktop build is needed. Install Node.js 24.15+ and run: npm --prefix `"$AppDirectory`" ci; npm --prefix `"$AppDirectory`" run package:win"
        }
        Write-Host 'Building the latest youtar_ttap. Close other youtar_ttap windows if rebuilding fails.'
        & $npm.Source --prefix $AppDirectory run package:win
        if ($LASTEXITCODE -ne 0) { throw 'Build failed. The previous package was not launched.' }
    }
    Write-Host "Opening: $executable"
    Start-Process -FilePath $executable -WorkingDirectory (Split-Path -Parent $executable)
    exit 0
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
