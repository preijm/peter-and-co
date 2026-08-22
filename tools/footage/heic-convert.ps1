# Decodes HEIC/HEIF to web-ready JPEG using Windows' own imaging stack (WIC via WPF).
#
# There is no npm dependency for this — the codec ships with Windows, and the site is
# deliberately dependency-light. Called by tools/footage/heic.js; not meant to be run
# by hand, though it works standalone.
#
# Existing JPEGs are left alone unless the HEIC is newer, so re-running is cheap.

param(
  [Parameter(Mandatory = $true)][string]$Dir,
  [int]$MaxWidth = 2000,
  [int]$Quality = 80
)

Add-Type -AssemblyName PresentationCore

if (-not (Test-Path $Dir)) { Write-Output "SKIP no such directory: $Dir"; exit 0 }

$files = Get-ChildItem -Path $Dir -File | Where-Object { $_.Extension -match '^\.hei[cf]$' }
if ($files.Count -eq 0) { Write-Output 'NONE'; exit 0 }

foreach ($f in $files) {
  $dst = Join-Path $Dir ($f.BaseName + '.jpg')

  # Already converted and still current? Leave it.
  if ((Test-Path $dst) -and ((Get-Item $dst).LastWriteTime -ge $f.LastWriteTime)) {
    Write-Output ("FRESH " + $f.Name)
    continue
  }

  try {
    $in = [System.IO.File]::OpenRead($f.FullName)
    $dec = [System.Windows.Media.Imaging.BitmapDecoder]::Create($in, 'None', 'OnLoad')
    $frame = $dec.Frames[0]

    # These render desaturated, dimmed to 82% and under film grain, so fine detail is
    # invisible anyway. 2000px @ q80 lands around 400-500KB on a detailed photo.
    $src = $frame
    if ($frame.PixelWidth -gt $MaxWidth) {
      $s = $MaxWidth / $frame.PixelWidth
      $tf = New-Object System.Windows.Media.ScaleTransform($s, $s)
      $src = New-Object System.Windows.Media.Imaging.TransformedBitmap($frame, $tf)
    }

    $enc = New-Object System.Windows.Media.Imaging.JpegBitmapEncoder
    $enc.QualityLevel = $Quality
    $enc.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($src))
    $out = [System.IO.File]::Create($dst)
    $enc.Save($out)
    $out.Close(); $in.Close()

    $kb = [math]::Round((Get-Item $dst).Length / 1KB)
    Write-Output ("OK    " + $f.Name + " -> " + [System.IO.Path]::GetFileName($dst) + "  " + $src.PixelWidth + "x" + $src.PixelHeight + "  ${kb}KB")
  }
  catch {
    Write-Output ("FAIL  " + $f.Name + " :: " + $_.Exception.Message)
  }
}
