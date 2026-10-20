---
title: Hermes连接微信
date: 2026-10-20
tags:
  - Hermes
  - 微信
  - AI助手
  - 教程
categories:
  - 技术
---

## 前言

　　Hermes Agent 通过腾讯 iLink Bot API 支持个人微信接入，扫一次二维码即可把 Hermes 挂到微信上：在微信里发消息，服务器上的 Hermes 自动回复；Hermes 还能主动推送，例如定时天气、日程提醒。无需部署微信公众号，无需 Webhook 服务器，Hermes gateway 一条长轮询连接直接打通 iLink 接口。

　　本文记录在 WSL Ubuntu 上从零接入的完整流程，基于 Hermes Agent v0.16.0。

## 一、准备工作

- 操作系统：WSL Ubuntu（Windows 10/11）。也支持 macOS、Linux。
- Python 3.10+。
- 已安装 Hermes Agent：[Nous Research/hermes-agent](https://github.com/NousResearch/hermes-agent)。

安装 Hermes 与 gateway 依赖：

```bash
pip install hermes-agent
hermes postinstall   # 安装 node、browser 等可选依赖，可跳过
```

验证安装成功：

```bash
hermes --version
# Hermes Agent v0.16.0
```

## 二、安装 gateway 服务

　　WSL 里推荐把 Hermes gateway 装成 systemd 用户级服务，开机自启、崩溃自动拉起：

```bash
hermes gateway install
hermes gateway start
hermes gateway status
```

　　status 输出 `Active: active (running)` 即安装成功。

　　两个容易忽略的点：

- **Linger**：WSL 里用户注销后服务会被 systemd 杀掉，需要 `loginctl enable-linger <用户名>` 让服务在注销后存活。
- **Windows 开机自启**：WSL 进程不会随 Windows 自动拉起，需要在 Windows 任务计划程序加一个开机任务，动作填 `wsl -d Ubuntu -- bash -lc "hermes gateway start"`。否则每次重启后都要手动敲一次命令。

## 三、微信扫码登录

　　运行 gateway 配置向导：

```bash
hermes gateway setup
```

　　在「Messaging Platforms」菜单里选 **Weixin / WeChat**。向导会打印一个终端二维码，用微信扫一扫并确认授权。

- 依赖检查：Hermes 会先检测 `aiohttp` 和 `cryptography`，缺少时提示安装后再跑 `hermes gateway setup`。
- 登录成功后，账号凭据（account_id、token）自动写入 `~/.hermes/.env`，无需手动管理。

## 四、授权私聊权限

　　扫码登录后，向导询问「How should direct messages be authorized?」，四个选项：

- **DM pairing approval（推荐）**：陌生微信号首次私聊 Hermes 时发起申请，用 `hermes pairing approve` 逐条放行，防陌生人骚扰。
- Allow all direct messages：任何微信好友都能直接对话，风险较高。
- Only allow listed user IDs：只放行白名单内的微信 ID。
- Disable direct messages：禁用私聊。

　　选 pairing 后，第一次从微信发消息给 Hermes 会收到「请求接入」回复，终端执行：

```bash
hermes pairing list
hermes pairing approve <request-id>
```

　　放行后该微信好友即成为合法对话方。

## 五、验证结果

- 微信里给 Hermes 的机器人账号发「在吗」，终端 gateway 日志出现 `gateway.platforms.weixin` 的收包记录，并收到 Hermes 回复。
- 终端执行 `hermes gateway status` 确认服务运行中。
- 给 Hermes 配一个 cron 任务推送到微信，确认主动推送也通了。

## 六、常见问题

- **扫码后一直转圈、登录失败**：检查终端能否访问 `ilinkai.weixin.qq.com`，WSL 的代理设置会影响 gateway 出网；配置好系统代理后重跑 `hermes gateway setup`。
- **重启电脑后 Hermes 消失**：见「二、安装 gateway 服务」中的 Windows 开机任务，缺了这一步 gateway 不会自动恢复。
- **iLink 限流**：iLink 接口有频率限制（errcode -2），Hermes 内部会退避重试；不要自建高频轮询任务反复补发，失败后手动重发即可。
- **换微信账号**：重跑 `hermes gateway setup`，选 Weixin 并选 Reconfigure，重新扫码即可覆盖旧凭据。

## 七、相关链接

- [Hermes Agent 官方文档](https://hermes-agent.nousresearch.com/docs)
- [Hermes Agent 代码仓库](https://github.com/NousResearch/hermes-agent)
