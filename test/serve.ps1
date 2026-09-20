# Winziger Dateiserver für die Prüfstände. Nur an localhost gebunden.
#
#   powershell -File test\serve.ps1
#   http://localhost:8791/test/limit.html
#
# Liefert alles aus dem Repository-Wurzelverzeichnis, ohne Zwischenspeicher.

$wurzel = Split-Path -Parent $PSScriptRoot
$port   = 8791
$typen  = @{ ".html" = "text/html; charset=utf-8"; ".js" = "text/javascript; charset=utf-8";
             ".css" = "text/css; charset=utf-8"; ".json" = "application/json; charset=utf-8";
             ".svg" = "image/svg+xml"; ".jpg" = "image/jpeg"; ".png" = "image/png" }

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Prüfstände unter http://localhost:$port/test/  (Strg+C beendet)"
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.LocalPath.TrimStart('/'))
  if ($rel -eq '') { $rel = 'test/lokaler-test.html' }
  $pfad = Join-Path $wurzel $rel
  if ((Test-Path $pfad -PathType Leaf) -and ($pfad.StartsWith($wurzel))) {
    $bytes = [System.IO.File]::ReadAllBytes($pfad)
    $ext = [System.IO.Path]::GetExtension($pfad).ToLower()
    $ctx.Response.ContentType = if ($typen.ContainsKey($ext)) { $typen[$ext] } else { "application/octet-stream" }
    $ctx.Response.Headers.Add("Cache-Control", "no-store")
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $ctx.Response.StatusCode = 404
  }
  $ctx.Response.Close()
}
