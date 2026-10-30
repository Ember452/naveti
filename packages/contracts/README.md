# packages/contracts

- **拥有什么**：跨进程的 wire 契约（谁在说、说什么、版本是几）与 transport 的连接声明（loopback 地址形状、principal）。它是宿主与每个客户端之间的兼容矩阵。
- **可以 import 什么**：`@naveti/chord` 的契约与 schema 构造（纯声明，无 I/O、无状态、无注册表）。不 import 任何 `platform`、`features`、`apps`。
- **占哪些 seat**：不占。契约不是扩展点，它是对所有端的承诺。
- **依赖谁**：没有运行时依赖；唯一的 workspace 依赖是 `@naveti/chord` 的声明层。
- **删掉会怎样**：宿主与客户端各自需要重新定义自己的协议，两端就会漂移；`check-entry-graphs` 会先红——产品层的每个导出都必须有预算。

## 为什么这里会有运行时值

`remote()` 与 `obj()` / `str()` 是函数，所以本包会产出值，不是只有 `interface`。但它仍然没有 I/O、没有状态、没有注册表：一次调用只构造一个被 brand 过的声明对象。把它移到 `platform` 会让 web 端为了拿契约而引入宿主代码——那正是 `check-client-face` 要防的事。

## 改契约的规矩

1. 改 `version` 或成员 = 破坏兼容；此时同时更新 `tests/golden/` 的对应黄金文件，并在同一个改动里说明旧端怎么办。
2. 不加没有消费者的字段。`view` 的形状由内核的 `ConversationView` 决定，不在本包另立一套。
3. id 保持内核的整数表示：`view` 的每一帧 delta 都是在内核那个值上算出来的，出口处改类型会破坏 ops。
