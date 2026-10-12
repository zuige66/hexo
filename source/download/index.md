---
title: 下载 Hyper MeloLock
layout: page
comment: false
toc: false
---

# 下载 Hyper MeloLock

**当前版本 v0.3.4（versionCode 14） · 更新于 2026-10-12**

澎湃 OS 3 锁屏沉浸音乐覆盖层，播放音乐时自动接管锁屏：全屏专辑封面、悬浮播放器卡片、时钟样式可调、封面壁纸化。开源免费（AGPL-3.0），界面基于 HyperIsland（MIT）。

{% note info %}
应用内也能更新：`关于` 页 → `关于模块` → 检查更新，支持应用内下载并自动切换国内源重试。
{% endnote %}

## 下载

- [GitHub Releases（推荐，含历史版本与校验信息）](https://github.com/zuige66/Hyper-MeloLock/releases)
- [国内直链 v0.3.4](/downloads/melolock/Hyper-MeloLock-v0.3.4.apk)

只从 GitHub Releases 或本博客直链下载正式签名包。模块作用于系统锁屏界面，来源不明的二次打包版本有风险。

## 安装要求

1. 澎湃 OS 3（HyperOS 3）机型；其他系统不会生效。
2. 已获取 Root 并安装 Xposed 管理器（Vector / LSPosed 均可）。
3. 在管理器中勾选模块作用域：`com.android.systemui` 必选；使用封面壁纸化还需勾选 `com.miui.miwallpaper`。
4. 勾选后重启对应进程（或重启手机），首次打开 App 勾选你的音乐播放器即可。

## 反馈

- GitHub Issues：[zuige66/Hyper-MeloLock/issues](https://github.com/zuige66/Hyper-MeloLock/issues)
- QQ 交流群：1129363923（[一键加群](https://qm.qq.com/q/mEJT74MJa0)）

许可：AGPL-3.0；界面基于 HyperIsland（MIT）。
