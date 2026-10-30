# 本机 token 走 WebSocket subprotocol，不进 URL

- 背景：P2 的 loopback 第一版把 token 放在 `ws://127.0.0.1:PORT/?token=…` 的 query 里。绑在回环地址上时影响有限，但 query 会进浏览器历史、access log、devtools 与任何抓包工具；等到 P5 接手机远程，改它就要动已发布的客户端，那时代价是跨端迁移而不是一行代码。
- 决定：客户端在握手时提供两个 subprotocol——`naveti.1` 与 `naveti.token.<token>`；宿主在 `handleProtocols` 里校验第二个、只回显第一个，token 不对时握手直接被拒，一帧都不存在。`apps/server` 把地址与 token 分两行打印，`AppFrame` 在缺 token 时弹一个粘贴框。`structure.md` §12 新增第 11 条把它变成通则：**凭据不进 URL（query、path、`VITE_*` 都不行）**。
- 被拒绝的替代方案：
  - **保留 query，只在 P5 前再改**：那是把一次成本很低的决定推给未来一次成本很高的迁移；而且“以后改”的门面说法在本仓库已经被 parked 机制明确拒绝。
  - **首帧认证**（连上后发一帧 token）：多一个握手状态与一个超时窗口，且连接在认证前已经建立，服务器要为此维护“已连未认证”的集合。subprotocol 让拒绝发生在建立之前。
  - **自定义请求头**：浏览器 `WebSocket` 构造函数不允许自定义头；只有非浏览器端能做到，两端就会分叉。
- 后果：token 不再出现在任何 URL 或环境变量里。代价是手动打开页面时要粘贴一次；这是有意的可见性，不是退步。测试里的“错 token”用例改成断言“连接从未打开”（`ws` 把被拒的 subprotocol 以 error 事件报出来），而不是断言某个关闭码。
