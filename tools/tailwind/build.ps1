# Baut css/tailwind.css aus allen Seiten (offizielles Tailwind 3.4.16, Standalone-CLI).
# Das Programm liegt nicht im Repo: tools\tailwind\bin\tailwindcss.exe
# Quelle: https://github.com/tailwindlabs/tailwindcss/releases/tag/v3.4.16
$root = Resolve-Path "$PSScriptRoot\..\.."
$exe  = Join-Path $PSScriptRoot "bin\tailwindcss.exe"
Push-Location $root
try {
  & $exe -c "tools\tailwind\tailwind.config.js" -i "tools\tailwind\input.css" -o "css\tailwind.css" --minify
} finally { Pop-Location }
