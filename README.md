# dsh-ui-deepseek-balance

[![npm version](https://img.shields.io/npm/v/dsh-ui-deepseek-balance.svg?color=blue)](https://www.npmjs.com/package/dsh-ui-deepseek-balance)
[![npm downloads](https://img.shields.io/npm/dm/dsh-ui-deepseek-balance.svg)](https://www.npmjs.com/package/dsh-ui-deepseek-balance)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-dsh--ui--deepseek--balance-181717?logo=github)](https://github.com/SeekerCodes/dsh-ui-deepseek-balance)

A floating widget for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`) that shows your **DeepSeek account balance** and the **cost of the latest task** in real time (auto-refresh every 30 s).

为 DeepSeek Harness (dsh) 提供的一个悬浮小组件：实时显示 **DeepSeek 账户余额** 与 **最近一次任务的花费**（每 30 秒自动刷新）。

## Features / 功能

- Floating card in the bottom-right corner (mounted on the `shell.overlay` slot, above every column) / 右下角悬浮卡片（挂在 `shell.overlay` 全局悬浮层）
- Balance: total / top-up / granted / 余额（总额/充值/赠送）
- Latest task cost in ¥, with total tokens / 最近任务花费（¥）与 token 总数
- The API key never leaves your machine: the host half (Node, loopback-only `127.0.0.1:3199`) talks to DeepSeek; the browser half only fetches localhost / 密钥不出本机：host half（仅回环 127.0.0.1:3199）访问 DeepSeek，浏览器端只请求本机
- zh / en UI, auto-detected from browser language

## Requirements / 环境要求

- DeepSeek Harness with `shell.overlay` support (recent build; the npm release lags the repo — see Compatibility below) / 需支持 `shell.overlay` 的较新 dsh（npm 发布版落后于仓库，见下方兼容性）
- `DEEPSEEK_API_KEY` env var (or an `export DEEPSEEK_API_KEY="..."` line in `~/.zshrc`) / 需要 DEEPSEEK_API_KEY 环境变量（或 ~/.zshrc 中的 export 行）

## Install / 安装

```bash
cd ~/.dsh/profiles/web
pnpm add dsh-ui-deepseek-balance
```

Append one row to `~/.dsh/profiles/web/cordis.patch.yml` (your profile user patch layer — no fork, no rebuild):

在 `~/.dsh/profiles/web/cordis.patch.yml`（用户 patch 层，无需 fork、无需重建）追加一行：

```yaml
- id: ui-deepseek-balance
  name: 'dsh-ui-deepseek-balance'
```

Restart `dsh` (or let the user patch layer hot-reload). The floating card appears bottom-right.

重启 dsh（或等待 patch 层热更新），右下角即出现悬浮卡片。

> Using a different profile? Replace `web` with your profile name. / 用其他 profile？把 `web` 换成你的 profile 名。

## Compatibility / 兼容性

- The widget mounts via `slots.inject('shell.overlay', …)`: on a dsh build that does not declare `shell.overlay`, it silently stays dormant — the page is unaffected (graceful degradation). / 组件通过 `slots.inject('shell.overlay', …)`) 挂载：在不声明 `shell.overlay` 的旧版 dsh 上会安静地不挂载，页面不受影响（优雅降级）。
- The npm-published `@deepseek-ai/dsh` / `@deepseek-ai/dsh-web-app` releases currently lag the repo, so verify with a recent build. / 目前 npm 发布的 dsh/web-app 落后于仓库，建议用较新构建验证。

## Data source & pricing / 数据来源与计价

- Balance: `GET https://api.deepseek.com/user/balance` with the key from `DEEPSEEK_API_KEY` / 余额：调用 DeepSeek 余额接口
- Usage: reads the harness projection cache `~/.dsh/storages/session_projcache.json` (most recent session with token totals) / 用量：读取 harness 投影缓存中最近有 token 汇总的会话
- Cost is estimated from public list prices (¥ / 1M tokens): input 2.0, output 8.0, cache-read 0.5, cache-write 2.0. It is an **estimate**, not the official bill. / 费用按公开价目表估算（元/百万 tokens）：输入 2.0、输出 8.0、缓存读 0.5、缓存写 2.0——是估算值，非官方账单。

## Security / 安全

- The host data server binds `127.0.0.1` only — never exposed to the LAN / host 数据服务仅绑定 127.0.0.1，不暴露到局域网
- The browser bundle contains no key material / 浏览器 bundle 不含任何密钥
- Port `3199` is fixed; change it in both `src/index.ts` and `src/client/BalanceWidget.tsx` if it collides / 端口 3199 固定，冲突时需同时改两个文件中的常量

## Develop / 开发

```bash
pnpm install
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest (9 tests)
pnpm build       # tsdown -> lib/index.js (host) + lib/client.js (browser bundle)
```

The client bundle is a dsh closure-factory artifact (`window.__ModuleLoader__.load({ id, factory })`), with `react` resolved from the app module table at load time. / 客户端产物是 dsh 闭包工厂格式，react 在加载时从 app 模块表解析。

## Publish / 发布

```bash
npm login
npm publish    # prepublishOnly runs typecheck + tests + build
```

## License / 许可

MIT
