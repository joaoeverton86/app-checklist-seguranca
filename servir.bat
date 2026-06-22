@echo off
title Servidor Local - Checklist Seguranca
echo.
echo ========================================
echo   SERVIDOR LOCAL - CHECKLIST SEGURANCA
echo ========================================
echo.
echo Preparando servidor...
echo.

:: Verificar IP do computador
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set IP=%%a
    goto :found
)
:found
set IP=%IP: =%

echo Seu IP na rede: %IP%
echo.
echo Para acessar no celular:
echo 1. Conecte o celular na mesma rede WiFi
echo 2. Abra o navegador e digite: http://%IP%:8000
echo 3. Clique nos 3 pontos e "Adicionar a tela inicial"
echo.
echo Para parar o servidor, pressione Ctrl+C
echo.

:: Tentar Python 3
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Iniciando com Python...
    cd /d "%~dp0"
    python -m http.server 8000
    goto :end
)

:: Tentar Python 2
python2 --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Iniciando com Python 2...
    cd /d "%~dp0"
    python -m SimpleHTTPServer 8000
    goto :end
)

:: Tentar Node.js
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Iniciando com Node.js...
    cd /d "%~dp0"
    npx serve -l 8000
    goto :end
)

:: Fallback: PowerShell
echo Python/Node nao encontrado. Usando PowerShell...
echo.
cd /d "%~dp0"
powershell -Command "$listener = [System.Net.HttpListener]::new(); $listener.Prefixes.Add('http://+:8000/'); $listener.Start(); Write-Host 'Servidor rodando em http://localhost:8000'; Write-Host 'Pressione Ctrl+C para parar'; while ($listener.IsListening) { $context = $listener.GetContext(); $file = Join-Path (Get-Location) ($context.Request.Url.LocalPath.TrimStart('/')); if ($context.Request.Url.LocalPath -eq '/') { $file = Join-Path (Get-Location) 'index.html' }; if (Test-Path $file) { $bytes = [System.IO.File]::ReadAllBytes($file); $context.Response.ContentType = 'text/html'; $context.Response.OutputStream.Write($bytes, 0, $bytes.Length) } else { $context.Response.StatusCode = 404 }; $context.Response.Close() }"

:end