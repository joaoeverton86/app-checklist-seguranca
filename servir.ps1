# Servidor Local - Checklist Seguranca
# Execute: powershell -ExecutionPolicy Bypass -File servir.ps1

$port = 8000
$root = $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SERVIDOR LOCAL - CHECKLIST SEGURANCA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Obter IP
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*"} | Select-Object -First 1).IPAddress
Write-Host "Seu IP na rede: $ip" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para acessar no celular:" -ForegroundColor Green
Write-Host "1. Conecte o celular na mesma rede WiFi"
Write-Host "2. Abra o navegador e digite: http://$ip`:$port"
Write-Host "3. Clique nos 3 pontos e 'Adicionar a tela inicial'"
Write-Host ""
Write-Host "Para parar: Ctrl+C" -ForegroundColor Red
Write-Host ""

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://+:$port/")
$listener.Start()

Write-Host "Servidor rodando! Aguardando conexoes..." -ForegroundColor Green

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $path = $context.Request.Url.LocalPath
        
        if ($path -eq "/") { $path = "/index.html" }
        
        $file = Join-Path $root ($path.TrimStart("/"))
        
        if (Test-Path $file -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($file)
            $contentType = switch ($ext) {
                ".html" { "text/html" }
                ".js" { "application/javascript" }
                ".css" { "text/css" }
                ".json" { "application/json" }
                ".png" { "image/png" }
                ".jpg" { "image/jpeg" }
                ".svg" { "image/svg+xml" }
                default { "application/octet-stream" }
            }
            
            $bytes = [System.IO.File]::ReadAllBytes($file)
            $context.Response.ContentType = $contentType
            $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $path" -ForegroundColor Gray
        } else {
            $context.Response.StatusCode = 404
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 404: $path" -ForegroundColor Red
        }
        
        $context.Response.Close()
    } catch {
        Write-Host "Erro: $_" -ForegroundColor Red
    }
}