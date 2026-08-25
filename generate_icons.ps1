Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\Ayush_Chaubey\Downloads\FCU Dashboard\FCU_Dashboard\public\geetpay-logo.png"
$srcImg = [System.Drawing.Bitmap]::FromFile($srcPath)

function Create-Square-Icon($size, $targetW, $outputPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::White)

    $targetH = [int]($srcImg.Height * ($targetW / $srcImg.Width))
    $destX = [int](($size - $targetW) / 2)
    $destY = [int](($size - $targetH) / 2)

    $g.DrawImage($srcImg, $destX, $destY, $targetW, $targetH)
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

Create-Square-Icon 512 450 "c:\Users\Ayush_Chaubey\Downloads\FCU Dashboard\FCU_Dashboard\public\pwa-icon-512.png"
Create-Square-Icon 192 168 "c:\Users\Ayush_Chaubey\Downloads\FCU Dashboard\FCU_Dashboard\public\pwa-icon-192.png"
Create-Square-Icon 180 158 "c:\Users\Ayush_Chaubey\Downloads\FCU Dashboard\FCU_Dashboard\public\apple-touch-icon.png"

$srcImg.Dispose()
Write-Output "PWA Square Icons generated successfully"
