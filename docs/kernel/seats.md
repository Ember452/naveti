# 扩展点（seat）权威表

> seat 是功能接入宿主与界面的**固定挂点**。清单封闭：新增 seat 属于平台变更，要写决策记录（`.agents/notes/`）。
> 本文是 seat 的唯一权威。`docs/structure.md` 只做指针，不复制本表。

## 1. 什么是 seat

seat 是"功能可以占的位置"，不是"功能的类型"。一个功能通常占 2–4 个 seat（例如记忆功能占 `doc` + `tool` + `section` + 界面的 `panel`）。

判据：**seat 必须由平台声明、由平台枚举、由守卫校验。** 功能自己发明挂点（直接改壳、自己开传输通道、自建全局单例）都不算 seat，且是红。

## 2. 宿主侧 seat（内核已有，可直接用）

机制全部来自 `packages/kernel/durable/src/harness/`，经门面 `@naveti/host/extend/*` 暴露。

> 状态列说明：`已有` = 机制已存在于内核且门面已有对应子路径。门面只开了有消费者的子路径：`tools` / `docs` / `prompt` / `serve` / `types` 已建；`tasks` / `hooks` / `wrap` 的机制在内核里，但还没有功能用，所以门面暂不给子路径（加它是门面工作，不是为某个功能开特例）。

| seat | 机制（内核符号） | 门面子路径 | 状态 | 典型用途 |
| --- | --- | --- | --- | --- |
| `tool` | `defineTool` / `ToolRegistration` | `@naveti/host/extend/tools` | 已有 | 记忆读写、检索、连接器、子 agent |
| `section` | `section` | `@naveti/host/extend/prompt` | 已有 | 注入系统提示词片段 |
| `hook` | `hook(ToolTask / GenerationTask, handlers)` | `@naveti/host/extend/hooks`（未开） | 机制已有 | 审批拦截、脱敏、上下文策略、结果改写 |
| `wrap` | `wrapTool` / `wrapSection` | `@naveti/host/extend/wrap`（未开） | 机制已有 | 不改原实现，包一层 |
| `task` | `defineTask` | `@naveti/host/extend/tasks`（未开） | 机制已有 | 定时、主动、后台作业、长任务 |
| `doc` | `defineDoc` / `defineDocFamily` | `@naveti/host/extend/docs` | 已有 | 功能状态（三种 scope 见 §4） |
| `extension` | `defineExtension` + `registry.install()` | `@naveti/host/extend` | 已有 | 一次装多个贡献点；`ctx.tools` / `ctx.sections` / `ctx.serve` 就是它的形状 |

装配顺序固定：`openHost()` 建 Harness → 调用方 `install(features)`（每个功能的 `install` 声明贡献，随后 `start` 跑启动工作）→ 启动任务调度 → 挂 transport。**引擎不做服务发现**，这也是不引入 DI 容器的原因。

`ctx.serve(contract, factory)` 不单列为 seat：它不是新的挂点，而是把功能自己的 state 暴露在**已声明的契约**上（`packages/contracts`）的那一步。功能不自己开通道；它只能经这一条已有的 transport 面到达客户端。

### 候选，未采用

下面两个挂点只存在于设想中，**不是 seat 清单的一部分**，也不会有 `@naveti/host/extend/*` 子路径。理由与 §8“不预留无消费者的字段”同构：先有挂点再有消费者，就是在猜形状。

| 候选 | 它会是什么 | 采用条件 |
| --- | --- | --- |
| `config` | 设置 schema，挂在 `platform/host/settings` | 第一个需要用户开关的功能出现时 |
| `service` | 功能向其他功能暴露能力 | 第二个功能真的需要调用第一个时（优先用事件或共享 doc 解决） |

## 3. 客户端 seat（平台未建）

| seat | 位置 | 状态 | 典型用途 |
| --- | --- | --- | --- |
| `panel` | 右栏面板 | **已建**（`@naveti/web`） | 文件、浏览器、终端、子 agent |
| `nav` | 侧栏导航项 | 未建 | 设置、插件页 |
| `settings` | 设置分区 | 未建 | 模型、工具策略、功能参数 |
| `command` | 命令面板 / 快捷键 | 未建 | 新建、归档、导出 |
| `composer` | 输入区扩展 | 未建 | 引用、附件、模板 |
| `renderer` | entry kind → 视图 | **已建**（`@naveti/web`） | 计划卡片、审批卡片、工具结果 |
| `status` | 顶栏状态 | 未建 | 上下文占用、计价、运行中任务 |

客户端 seat 由 `@naveti/web` 声明，功能 `client/index.ts` 用 `register(slots)` 占位。**壳文件里不允许出现功能 id**，由 `check-feature-registry` 校验。

## 4. `doc` 的三种 scope

| scope | 生命周期 | 该放什么 | 不该放什么 |
| --- | --- | --- | --- |
| `session` | 整个存储一个单例，无 history/fork | 用户偏好、记忆索引、主动额度、审批策略 | 任何"这次对话"的东西 |
| `conversation` | 每会话一份，fork 时选 `initial` / `current` / `asOf` | 会话内计划、工作区、该会话的工具授权 | 跨会话共享的数据 |
| `task` | 跟任务同生命周期，任务结束回收 | 一次性任务的中间结果 | 需要长期读的东西 |

选错 scope 是这类功能最常见的错误：**放到 `session` 的会话数据会在两个会话间互相污染，放到 `conversation` 的用户偏好会在新会话里消失。**

功能自己的 doc 通过已有的 watch / `watchDoc` / `snapshot` 面到达前端：在 served 工厂里用 `self.follow((observer, ctx) => harness.observeDoc(token, observer, ctx))` 把它变成一个 state 成员，客户端拿到的就是 snapshot 加 delta。功能不得自开传输通道。

## 5. 新增一个 seat 的门槛

1. 至少两个功能需要同一个挂点（只有一个消费者时，直接在该功能里做）。
2. 平台侧声明：类型 + 注册表 + 校验（slot 名闭集）。
3. 守卫更新：`seats` 枚举加一项，否则 manifest 校验不到。
4. 本文加一行（机制、门面子路径、状态）。
5. 写一条决策记录，说明被拒绝的替代方案。

## 6. 新增一个 provider（不是 seat）

provider 是"某个 seam 的实现"，不是挂点：不占 seat、没有 id、不进 `compose.ts` 的功能清单。判别只有两条可证伪的测试：换实现是否只需改配置、是否新增 seat 或改变策略——全文见 [`docs/structure.md`](../structure.md) §9，本文不重复。
