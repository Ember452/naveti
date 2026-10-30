# 系统怎么运转

> 本文回答"运行时是什么形状"：一次提交怎么走完一轮、状态存在哪、扩展从哪接进来。
> 不回答"文件放哪"（见 [`structure.md`](./structure.md)）、"什么算绿"（见 [`migration/baseline.md`](./migration/baseline.md)）。

## 1. 现在的地基

内核六包是运行时；产品层（`contracts` / `platform` / `features` / `apps`）只经门面接它。本文描述两者接起来后的形状：内核那段能在 `packages/kernel/*` 与 `tests/smoke/persist-resume.ts` 里找到依据；产品层那段是 P2 落地的**设计**，实现落在 `packages/{contracts,platform,features}` 与 `apps/*`，但判据是“能不能用本文的词复述”，不是“能不能找到某个服务”。

内核六包之间**不是一条链**，而是“一基础 + 四个并列消费者”：

- `telemetry` 是唯一被其他包依赖的基础包，它自己不依赖任何一个。
- `ai` 与 `chord` 是**并列**的：两者都只依赖 `telemetry`，`chord` 不依赖 `ai`。
- `codemode` 与 `mcp` **完全独立**（除 typebox 等外部包外不依赖任何内部包）。
- `durable` 消费 `chord`、`ai`、`codemode`、`telemetry`；**它不依赖 `mcp`**。

完整对应关系与关键符号见 [`packages/kernel/README.md`](../packages/kernel/README.md)；那张表逐条对应各包的 `package.json`，“以 package.json 为准”这句话不必再写一遍。

所以改哪里会牵动什么：改 `telemetry` 影响所有包；改 `ai` 只影响 `durable` 与产品层；改 `chord` 只影响 `durable`；改 `durable` 影响全部产品层。

## 2. 一次提交怎么走完一轮

### 2.1 内核里的三段

以 `tests/smoke/persist-resume.ts` 为准，装配与运行是三段：

1. **打开**：`Harness.open(storage, { models, registry }, context)`。`storage` 是 `durable` 的 `Storage` 接口（内存、JSONL、SQLite 各有实现），`models` 来自 `ai`，`registry` 由调用方用 `createRegistry()` 建立并 `install()` 扩展。
2. **建会话**：`harness.root(context, { agent: { model } })` 得到根会话；会话住在一个不可变的 entry 日志上，doc 与 task 都是它的派生视图。
3. **提交**：一次用户输入变成一次 submission，驱动一次 generation。模型流式产出 assistant 文本与 tool call；每个 tool call 走工具执行管线（含 hook 与审批），结果作为 entry 提交进日志。

关键性质是**提交点唯一**：观察者看到的状态只在 commit 之后出现，所以"前端显示了什么"与"存储里有什么"不会分叉。中断与重启后，未完成的 generation 从日志恢复，而不是从内存重建——这是 `durable` 存在的理由。

### 2.2 请求进来之后、界面更新之前

上面三段是内核在进程里的形状。一段对话从"有人按了发送"到"屏幕上出现工具结果"还要穿过产品层，而且只有一条路。按顺序是：

1. **transport 收到一帧**。界面端只持有一个到本机 loopback 的连接（P2 是 `127.0.0.1` + token），它不代表任何产品语义：帧里的每个持有、每次调用都带一个 principal，transport 在握手时把它钉死（P2 只有“这台机器的主人”）。这层是平台的事，功能不经手。
2. **帧变成 submission**。功能把一次“发送”翻成一次 submission（用户输入、中断、工具授权决定），交给它占着 `doc`/`extension` 的那个会话。submission 是**意图**，不是消息：它先被 admit 成可查询的记录，再由 task 调度器推进；同一个会话在跑时到达的下一次输入是排队，不是抢跑。
3. **commit 是唯一提交点**。generation 与 tool task 的每次写入都在一个 commit 里；一个 commit 同时产生 entry（事实）、doc 变更（投影）与 task 状态变化。所以“工具跑完了”不是一个通知，而是一次 commit 的可见结果。
4. **view 是投影，不是查询**。会话对外给出的不是“查一次 entry 表”，而是一个带窗口的 view：entry 窗口 + 内建 doc（agent / live / inbox / provider / usage）。它通过 `follow` 接到宿主对象的一个 state 成员上；功能自己的 doc 走同一条 watch，不开第二条通道。
5. **帧回到界面**。state 成员一变，宿主先给新持有的端一个 snapshot，再用 delta 推送其后每一个 commit 的变更；一个 commit 一帧，界面拿到的顺序就是 commit 顺序。
6. **界面只渲染**。client 面把 view 映射到 `renderer` 与 `panel` 两个 seat，不读 entry 原文、不写状态；它的本地存留只允许纯视图偏好。
7. **断线不改事实**。连接断开只影响“谁在看”；重启后未完成的 generation 从 entry 日志恢复，view 重新绑定，界面拿到的第一个值就是恢复后的快照。这就是 host 侧那个验收（重启后读得回）为什么不由界面提供证据。

一句话的所有权划分：**transport 归平台，submission 与 commit 归内核，view 到 state 的接线归平台，帧里的类型归 `contracts`，渲染归功能与壳。** 这条划分是 P2 “第二个功能加进来时平台不用改”的判据：新功能只新增自己的 seat 占用与契约，不新增上面任何一步。

## 3. 三种持久化对象

| 对象 | 语义 | 谁写 | 典型用途 |
| --- | --- | --- | --- |
| **entry** | 只追加、不可改的日志条目（user / assistant / tool-result / system / reset / compaction） | 运行时在 commit 时写入 | 会话事实本身；恢复与 replay 的唯一来源 |
| **doc** | 可读写的结构化状态，有 `session` / `conversation` / `task` 三种 scope | 扩展与运行时 | 功能状态、偏好、计划；scope 选错会互相污染（选择规则见 `kernel/seats.md` §4） |
| **task** | 状态机 + 调度（phase、重启次数、超时、失败回落） | `defineTask` 的提供者 | 生成、压缩、定时与后台作业 |

三者的关系：**entry 是事实，doc 是事实的投影，task 是推进事实的引擎。** 前端只读 doc 的 watch 流，不读 entry 原文。

## 4. 扩展从哪接进来

功能不 import 内核（`structure.md` §4 第 2 条），它只做两件事：

1. `defineExtension(...)` 把自己的贡献点打包（tool / doc / task / hook / section / wrap），交给 `apps/server` 的 `registry.install()`。
2. `client/index.ts` 的 `register(slots)` 把界面挂到平台声明过的 slot 上。

平台侧因此承担三个不可委托的职责：**装配顺序**（先 `Harness` 后 `install` 再调度）、**路径注入**（内核不算数据目录）、**transport**（本机 loopback 与将来的 remote 共用同一套协议）。

`packages/platform/host/src/extend/` 的门面是这条链上唯一的耦合点：内核怎么改，只在这里吸收（理由见 `KERNEL.md` §3）。

## 5. 可替换的东西（seam）

一个 seam 有三个角色，缺一不算：**声明（Definition）/ 实现（Provider）/ 使用方（Consumer）**。

- 声明住在能看见所有使用方的地方：内核已有的（`Storage`、模型适配）就用内核的，不重写；自研的放 `packages/contracts`（纯类型，无 I/O、无状态）。
- 实现是 `packages/providers/<seam>-<impl>`，只改配置就能换。
- 选择器与注册表**不在** `contracts` 里，它在 `platform/host`——因为"选中哪个实现"是装配决策，不是类型。

判据是两条可证伪的测试，不是"它像不像功能"：换实现是否只改配置；它是否新增 seat 或改变策略。（完整表见 `structure.md` §9。）

## 6. 信任边界

| 边界 | 谁守 | 现状 |
| --- | --- | --- |
| 模型输出 → 工具执行 | `durable` 的工具管线 + `hook` 审批 | 已有机制，产品策略未写 |
| 脚本 → 宿主 | `codemode` 沙箱，唯一能力是调用注入的工具 | 已有 |
| 浏览器/手机 → 宿主 | `platform/host` 的 transport | loopback 已有（`127.0.0.1` + token）；`remote` 未建 |
| 凭据 | `platform/host/credentials`，不落明文 | `未建` |
| 落盘数据 | `Storage` 实现 + commit 原子性 | 已有 |

## 7. 还不存在的东西

| 缺失 | 它会拥有什么 | 为什么现在不建 |
| --- | --- | --- |
| `packages/providers` | 可替换实现（存储、模型、沙箱） | 第一个需要换一个 seam 的实现时才建（现有实现都已在内核里） |
| `platform/host` 的 `remote` transport | 手机与外部端接入 | 第一次真要让非本机端连接时；contracts 的 `transport.ts` 先定型 |
| `platform/host` 的 `credentials` | 凭据不落明文 | 接入第一个需要用户凭证的 provider 时 |

按什么顺序建、每步的验收判据是什么：见 [`plan/master-plan.md`](./plan/master-plan.md)。

## 8. 已知限制

平台与测试的限制（symlink、Windows 的 SQLite 句柄、哪些 lane 红不算回归）不在本文重复：见 [`migration/baseline.md`](./migration/baseline.md) 的"Known limits"。
