$astroRoot = 'D:\Workplace\astro'
$hexoRoot = $PSScriptRoot
$postDir = Join-Path $astroRoot 'src\content\blog\codex-windows-sandbox-setup'
$imageDir = Join-Path $astroRoot 'public\images'
$sourcePost = Join-Path $hexoRoot 'source\_posts\codex-windows-sandbox-setup.md'
$sourceImage = Join-Path $hexoRoot 'source\img\codex-windows-sandbox-setup-error.png'

if (!(Test-Path -LiteralPath $astroRoot)) {
  throw "未找到 Astro 项目：$astroRoot"
}

$frontMatter = @'
---
title: Codex Windows 沙盒启动失败及解决办法
pubDate: 2026-09-07
draft: false
description: Codex 在 Windows 上无法启动受限终端、提示找不到 codex-windows-sandbox-setup.exe 时，可以将 Windows 沙盒实现从 elevated 切换为 unelevated，并重启 Codex。
image: ""
slugId: codex-windows-sandbox-setup
category: 技术
pinTop: 0
---

'@

$body = Get-Content -LiteralPath $sourcePost -Raw
$body = $body -replace '(?s)\A---.*?---\s*', ''
$body = $body.Replace('](/img/codex-windows-sandbox-setup-error.png)', '](/astro/images/codex-windows-sandbox-setup-error.png)')

New-Item -ItemType Directory -Force -Path $postDir, $imageDir | Out-Null
Set-Content -LiteralPath (Join-Path $postDir 'zh-cn.md') -Value ($frontMatter + $body) -Encoding utf8
Copy-Item -LiteralPath $sourceImage -Destination (Join-Path $imageDir 'codex-windows-sandbox-setup-error.png') -Force

Write-Host 'Astro 文章和截图已同步。'
Write-Host "文章：$(Join-Path $postDir 'zh-cn.md')"
Write-Host "图片：$(Join-Path $imageDir 'codex-windows-sandbox-setup-error.png')"
