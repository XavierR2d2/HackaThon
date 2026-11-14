# VoxAI Native Windows HTTP Server using PowerShell HttpListener
# No external dependencies (Python or Node.js) required!

$port = 3000
$url = "http://localhost:$port/"
$folder = $PSScriptRoot

if (-not $folder) {
    $folder = Get-Location
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting VoxAI Voice & Text Assistant Server" -ForegroundColor Cyan
Write-Host "  Serving from: $folder" -ForegroundColor DarkGray
Write-Host "  URL: $url" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)

try {
    $listener.Start()
} catch {
    Write-Warning "Could not bind to port $port (may need permissions). Launching index.html directly..."
    Start-Process "$folder\index.html"
    exit
}

Write-Host "Opening browser..." -ForegroundColor Yellow
Start-Process $url

Write-Host "Server running. Press Ctrl+C in this window to stop.`n" -ForegroundColor Green

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".txt"  = "text/plain; charset=utf-8"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $localPath = $request.Url.LocalPath
        if ($localPath -eq "/" -or $localPath -eq "") {
            $localPath = "/index.html"
        }

        # Prevent directory traversal
        $safePath = [System.IO.Path]::GetFullPath((Join-Path $folder ($localPath.TrimStart('/'))))

        if ($safePath.StartsWith($folder) -and (Test-Path $safePath -PathType Leaf)) {
            $ext = [System.IO.Path]::GetExtension($safePath).ToLower()
            $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            
            $bytes = [System.IO.File]::ReadAllBytes($safePath)
            $response.ContentType = $mime
            $response.ContentLength64 = $bytes.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($notFound, 0, $notFound.Length)
        }
        $response.Close()
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
