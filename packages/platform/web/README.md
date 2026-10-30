# packages/platform/web

- **拥有什么**：浏览器壳。seat 表（`panel`、`renderer`）、到宿主的连接（一条 WebSocket）、React 绑定（`useRemote`/`useAsync`）、壳文件 `AppFrame` 与主题。
- **可以 import 什么**：`@naveti/contracts`、`@naveti/chord`（链接与契约类型）、`react`（peer）。**不 import `node:*`、不 import `@naveti/host`、不 import 任何功能。**
- **占哪些 seat**：不占；它是客户端 seat 的声明方。
- **依赖谁**：`@naveti/chord`、`@naveti/contracts`、`react`。
- **删掉会怎样**：浏览器端没有壳与 seat，功能的 client 面无处挂；`check-entry-graphs` 会先红（产品层入口必须有预算）。

## 为什么壳里没有功能名

`AppFrame` 只知道"注册了哪些 panel 和 renderer"。左侧列表、对话流、输入框这些属于功能自己的 panel；壳把它们按注册顺序渲染。壳里出现 `chat`/`memory` 这类名字，就说明功能的判断漏进了平台——`check-feature-registry`（P4）会把这条变成机检。

## 连接

`connect(url)` 用一个浏览器 `WebSocket` 连上宿主打印的地址；此后一切渲染都走这份连接上的状态推送，面板不轮询、不自开通道。地址来自 `?url=` 或 `VITE_NAVETI_URL`，由 `apps/web` 决定。
