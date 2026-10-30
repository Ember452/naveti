# packages/features/chat

- **拥有什么**：对话的入口。一个 `session` 文档记住"这台机器上有哪些会话、它们叫什么、最近动过的是哪个"，两个 served 契约（`ChatHub`、`ChatConversation`）把这份状态和一次提交送到界面，外加一段提示词。
- **可以 import 什么**：`@naveti/host/extend/*`、`@naveti/contracts`。**不 import 任何内核包**；文件与命令能力来自宿主已装的 `coding-tools`，本功能不重复注册。
- **占哪些 seat**：`doc`（会话列表）、`section`（提示词）；界面席 `panel` + `renderer` 随 client 面在下一步出现。
- **依赖谁**：`@naveti/contracts`（契约值与类型）、`@naveti/host`（门面，peer）。
- **删掉会怎样**：删包 + 删 `apps/server/src/compose.ts` 的一行 + 删界面那一行。会话本身仍在 durable 里（它不是本功能的私有格式），但没有入口能打开它。

## 状态放在哪，为什么

| 事实 | 落点 | 理由 |
| --- | --- | --- |
| 对话内容（user / assistant / tool 结果） | 内核的 entry 日志 | 事实的唯一来源；本功能不存第二份 transcript |
| 会话列表、标题、最近活动 | `naveti.chat.conversations`，**session** | 换会话还要看得见；放进 conversation 就会在新会话里消失 |
| 一次会话的界面投影 | `ChatConversation.view`，由 `observeConversation` 派生 | 内核已经窗口化了 entry 与内建 doc，复制一份就是第二个真相 |

这份 scope 表是"新功能最容易选错的格"的实例：`tests` 里第二条会话的用例就是为它写的——把列表放错 scope 时，那条用例会在持第二个会话的客户端上失败。

## 边界

- 契约值住在 `@naveti/contracts`（宿主与客户端共享，平台不许 import 功能）。本包不导出 `./contract`，那会造出第二份声明。
- 平台不出现本功能的名字；本功能不出现平台的内部（transport、seat 表、store）。
