# ICU.Live Shield — build.ps1
# Arma los paquetes para publicar en dist/: icu-live-shield-chromium-<versión>.zip (Chrome, Edge, Opera) e
# icu-live-shield-firefox-<versión>.zip (Firefox, con manifest.firefox.json como manifest.json).
# Las rutas dentro del zip van con «/», como piden las tiendas (Compress-Archive de Windows PowerShell 5 usa «\»).
# Uso: powershell -ExecutionPolicy Bypass -File build.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$here = $PSScriptRoot
$version = (Get-Content (Join-Path $here 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version
$files = 'i18n.js', 'bg.js', 'bridge.js', 'inject.js', 'link-page.js', 'popup.html', 'popup.js', 'LICENSE', 'README.md', 'README.es.md'
$dist = Join-Path $here 'dist'
New-Item -ItemType Directory -Force $dist | Out-Null

foreach ($target in @(@{ Name = 'chromium'; Manifest = 'manifest.json' }, @{ Name = 'firefox'; Manifest = 'manifest.firefox.json' })) {
  $out = Join-Path $dist "icu-live-shield-$($target.Name)-$version.zip"
  if (Test-Path $out) { Remove-Item $out }
  $zip = [System.IO.Compression.ZipFile]::Open($out, 'Create')
  try {
    $add = { param($src, $name) [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $src, $name, 'Optimal') }
    & $add (Join-Path $here $target.Manifest) 'manifest.json'
    foreach ($f in $files) { & $add (Join-Path $here $f) $f }
    Get-ChildItem (Join-Path $here 'icons') -File | Sort-Object Name | ForEach-Object { & $add $_.FullName "icons/$($_.Name)" }
    # Idiomas: _locales/<idioma>/messages.json (el navegador elige el suyo; si no está, español)
    Get-ChildItem (Join-Path $here '_locales') -Directory | Sort-Object Name | ForEach-Object {
      & $add (Join-Path $_.FullName 'messages.json') "_locales/$($_.Name)/messages.json"
    }
  } finally { $zip.Dispose() }
  Write-Output $out
}
