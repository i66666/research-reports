param(
  [string]$Date = (Get-Date -Format "yyyy-MM-dd")
)

$ErrorActionPreference = "Stop"

$env:HTTP_PROXY = "http://127.0.0.1:7890"
$env:HTTPS_PROXY = "http://127.0.0.1:7890"

$Node = "C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if (-not (Test-Path -LiteralPath $Node)) {
  $Node = "node"
}

Push-Location "D:\quartz\quartz-4.0.8"
try {
  & $Node "scripts\fetch-zsxq-research.mjs" --date $Date
  & $Node "scripts\sync-research-content.mjs"
  & $Node "quartz\bootstrap-cli.mjs" build

  git add package.json scripts content
  $status = git status --short package.json scripts content
  if ($status) {
    git commit -m "auto: sync full zsxq research notes"
    git push origin master
  } else {
    Write-Host "No publish changes."
  }
} finally {
  Pop-Location
}
