# すぷらんアセットをアプリ表示サイズに合わせて縮小する。
# 元画像は 1024〜1254px あるが、UI上の最大表示は 150px（moyanomori のみ背景で大きい）。
# 出力先 assets/suplan/opt/ をアプリから参照する。元画像は原本として残す。
#
# 実行: powershell -ExecutionPolicy Bypass -File scripts/opt_suplan.ps1
#
# ※このファイルにマルチバイト文字のパスを直接書かない。
#   PowerShell 5.1 は BOM 無し .ps1 を ANSI として読むため文字化けする。
#   $PSScriptRoot からの相対解決にしておけば、その問題が起きない。

Add-Type -AssemblyName System.Drawing

$root = Join-Path (Split-Path $PSScriptRoot -Parent) 'assets/suplan'
$out  = Join-Path $root 'opt'
if (-not (Test-Path $out)) { New-Item -ItemType Directory $out | Out-Null }

# w = 出力幅。マスコットは最大150pt表示なので 420px（約3倍）で足りる。
$jobs = @(
  @{ src = 'base.png';                 name = 'base.png';       w = 420 },
  @{ src = 'expressions/happy.png';    name = 'happy.png';      w = 420 },
  @{ src = 'expressions/excited.png';  name = 'excited.png';    w = 420 },
  @{ src = 'expressions/thinking.png'; name = 'thinking.png';   w = 420 },
  @{ src = 'expressions/relieved.png'; name = 'relieved.png';   w = 420 },
  @{ src = 'expressions/thanks.png';   name = 'thanks.png';     w = 420 },
  @{ src = 'poses/heart.png';          name = 'heart.png';      w = 420 },
  @{ src = 'poses/bulb.png';           name = 'bulb.png';       w = 420 },
  @{ src = 'poses/watering.png';       name = 'watering.png';   w = 420 },
  # moyanomori はカードの背景として敷くだけで透過が要らない。
  # PNG のままだと 1.7MB あるので JPEG にする（他は透過が要るので PNG）。
  @{ src = 'scenes/moyanomori.png';    name = 'moyanomori.jpg'; w = 860; jpeg = $true }
)

$jpegCodec  = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$jpegParams = New-Object System.Drawing.Imaging.EncoderParameters 1
$jpegParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 84

$before = 0
$after  = 0

foreach ($j in $jobs) {
  $sp = Join-Path $root $j.src
  if (-not (Test-Path $sp)) { Write-Output ('MISS  ' + $j.src); continue }
  $before += (Get-Item $sp).Length

  $img = [System.Drawing.Image]::FromFile($sp)
  $w = [int]$j.w
  $h = [int]([math]::Round($img.Height * ($w / $img.Width)))

  $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  if ($j.jpeg) { $g.Clear([System.Drawing.Color]::White) } else { $g.Clear([System.Drawing.Color]::Transparent) }
  $g.DrawImage($img, 0, 0, $w, $h)
  $g.Dispose()

  $dp = Join-Path $out $j.name
  if ($j.jpeg) {
    $bmp.Save($dp, $jpegCodec, $jpegParams)
  } else {
    $bmp.Save($dp, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  $bmp.Dispose()
  $img.Dispose()

  $sz = (Get-Item $dp).Length
  $after += $sz
  Write-Output ('{0,-16} {1,4}x{2,-4} {3,6} KB' -f $j.name, $w, $h, [math]::Round($sz / 1KB, 0))
}

Write-Output ''
Write-Output ('TOTAL  {0} KB -> {1} KB  ({2}% reduction)' -f ([math]::Round($before / 1KB, 0)), ([math]::Round($after / 1KB, 0)), ([math]::Round((1 - $after / $before) * 100, 0)))
