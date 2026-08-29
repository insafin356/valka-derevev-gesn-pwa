$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Port = 8080

$Python = $null
if (Get-Command py -ErrorAction SilentlyContinue) {
    $Python = "py"
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $Python = "python"
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $Python = "python3"
} else {
    throw "Не найден Python 3. Разместите содержимое папки на HTTPS-хостинге либо установите Python 3."
}

$Arguments = if ($Python -eq "py") { "-m http.server $Port" } else { "-m http.server $Port" }
Start-Process -FilePath $Python -ArgumentList $Arguments -WorkingDirectory $Root
Start-Sleep -Seconds 2
Start-Process "http://localhost:$Port/"
Write-Host "Приложение открыто: http://localhost:$Port/"
