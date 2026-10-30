# apps/web

浏览器端组合根：把 compose 里每个功能的 client 面注册进壳的 seat 表，再用宿主打印的地址连上去。

## 跑起来

```bash
# 1. 宿主（默认 faux provider，不需要凭证）
pnpm --filter @naveti/server start

# 2. 它打印 ws://127.0.0.1:<port>/?token=…
pnpm --filter @naveti/app-web dev
# 打开 http://localhost:5173/?url=<上一步打印的地址>
```

`VITE_NAVETI_URL` 可以预先填好地址，省得每次把 URL 带进查询串。

## 这里能看到什么

界面完全由功能的 panel 渲染：左侧是会话列表（session 文档），右侧是那一轮对话的投影（entry 窗口与内建 doc），
工具结果由功能注册的 renderer 显示。壳（`@naveti/web`）不含任何功能名。

## 与 server 的两份清单

`apps/server/src/compose.ts` 决定宿主装哪些功能，`src/compose.ts` 决定浏览器渲染哪些。两个面本来就独立（一个功能
可以只有宿主面），但它们必须在功能集合上一致——P4 的 `check-feature-registry` 是让这条从"看得住"变成"机检"的地方。
