# 系统怎么运转

> 本文回答"运行时是什么形状"：一次提交怎么走完一轮、状态存在哪、扩展从哪接进来。
> 不回答"文件放哪"（见 [`structure.md`](./structure.md)）、"什么算绿"（见 [`migration/baseline.md`](./migration/baseline.md)）。

## 1. 现在的地基

仓库里只有内核，没有产品层。所以本文描述的是**内核已经能做的事**（每个结论都能在 `packages/kernel/*` 与 `tests/smoke/persist-resume.ts` 里找到依据），以及产品层将来**必须**接到哪里（标注 `未建`）。

内核六包按依赖方向分三层：

```
telemetry       遥测契约与类型化 schema，谁都能用，不依赖别人
   ↑
ai              模型适配、模型目录、流式事件、token 计量
   ↑
chord           契约、复制状态、JSON 链路上的 RPC、watch/snapshot、sqlite 与内存后端
   ↑
codemode  mcp   沙箱执行 / MCP 客户端（并列的能力包）
   ↑
durable         唯一拥有"会话"的地方：日志、doc、task、工具执行、审批、装配
```

`durable` 是其余五包的消费者，不是它们的底座——`ai` 不认识 `durable`。这条方向决定了改 `ai` 不会牵动会话语义，改 `durable` 会。

## 2. 一次提交怎么走完一轮

以 `tests/smoke/persist-resume.ts` 为准，装配与运行是三段：

1. **打开**：`Harness.open(storage, { models, registry }, context)`。`storage` 是 `durable` 的 `Storage` 接口（内存、JSONL、SQLite 各有实现），`models` 来自 `ai`，`registry` 由调用方用 `createRegistry()` 建立并 `install()` 扩展。
2. **建会话**：`harness.root(context, { agent: { model } })` 得到根会话；会话住在一个不可变的 entry 日志上，doc 与 task 都是它的派生视图。
3. **提交**：一次用户输入变成一次 submission，驱动一次 generation。模型流式产出 assistant 文本与 tool call；每个 tool call 走工具执行管线（含 hook 与审批），结果作为 entry 提交进日志。

关键性质是**提交点唯一**：观察者看到的状态只在 commit 之后出现，所以"前端显示了什么"与"存储里有什么"不会分叉。中断与重启后，未完成的 generation 从日志恢复，而不是从内存重建——这是 `durable` 存在的理由。

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
| 浏览器/手机 → 宿主 | `platform/host` 的 transport | `未建` |
| 凭据 | `platform/host/credentials`，不落明文 | `未建` |
| 落盘数据 | `Storage` 实现 + commit 原子性 | 已有 |

## 7. 还不存在的东西

| 缺失 | 它会拥有什么 | 为什么现在不建 |
| --- | --- | --- |
| `packages/contracts` | 跨进程 wire 类型、自研 seam 声明 | 没有跨进程调用方 |
| `packages/platform/host` | 装配、seat 表、路径注入、transport、凭据 | 没有第一个功能要用它 |
| `packages/platform/web` | 壳、slot、主题、连接 | 没有界面要挂 |
| `packages/{providers,features}` | 可替换实现、用户可见能力 | 没有消费者 |
| `apps/*` | 组合根 | 同上 |

按什么顺序建、每步的验收判据是什么：见 [`plan/master-plan.md`](./plan/master-plan.md)。

## 8. 已知限制

平台与测试的限制（symlink、Windows 的 SQLite 句柄、哪些 lane 红不算回归）不在本文重复：见 [`migration/baseline.md`](./migration/baseline.md) 的"Known limits"。
