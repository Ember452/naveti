# 主计划

> 计划会过期，所以它单独一份、单独更新，不写进 `structure.md`（那里只有稳定的规则）。
> 状态只在标题里标一次：`done` / `doing` / `next` / `later`。
> **做什么、先做哪个**不由本文回答，见 [`docs/product.md`](../product.md)；本文只定顺序、落点与验收。阶段的取舍与 product 优先级冲突时，改本文，不改 product 的排序依据。

## 阶段与判据

| 阶段 | 状态 | 内容 | Gate |
| --- | --- | --- | --- |
| **P0 机械层** | done | 分组目录 `packages/kernel/*`、pnpm 隔离式依赖、删手写 `paths`/alias 改 `exports` 的 `source` 条件、根 `test.projects` 单进程、密封测试环境、结构守卫（见 `docs/structure.md` §13） | `pnpm check` / `pnpm build` / `pnpm test:ci` 三平台全绿；Ubuntu 数字见 `migration/baseline.md` |
| **P1 规则层** | doing | `AGENTS.md`、`KERNEL.md`、`docs/structure.md`、`docs/architecture.md`、`docs/product.md`、`docs/kernel/{seats,divergence}.md`、`.agents/notes/`、`CONTRIBUTING.md`、`SECURITY.md` | `structure.md` §17 权威分工表里每篇文档在磁盘存在且被 `check-doc-links` 绿；此后**规则文档只为已被现实触发的漂移新增，不为“更完备”新增**（新增判据同 §13 守卫：照做会失败才写） |
| **P2 主干** | next | `spike 桌面 shell 前提` → `packages/contracts` → `packages/platform/host`（门面 + seat 表 + paths 注入 + transport loopback）→ `apps/server` → 第一个功能 `chat`（compose 装上内核已有工具）→ 最小 web 壳（只建 `panel`/`renderer` 两个 seat）→ `apps/web` | host 侧：loopback 端到端一轮**带工具调用**的对话（`read`/`edit`/`bash` 至少各发生一次且落盘可恢复）；client 侧：chat 界面在 `apps/web` 渲染同一轮对话。删掉该功能 = 删包 + 两行 |
| **P3 出包** | later | `packages/platform/web` 补全 → `apps/desktop` + `tsdown.config.ts`（shell 形态与 sqlite 结论由 P2 步骤 0 定案，此处只执行） | 出一个能装能跑、数据落在 `userData` 的安装包；安装包上跑通 product「一年判据」第 1 条的编码任务 |
| **P4 功能扩展** | later | 下一个功能由 `product.md` 首批功能表顺位定（当前是记忆与检索）；`platform/host` 的 `seats.ts` 转为唯一权威、开 `check-feature-registry` 与 `check-client-face` | 两个功能并行不互相 import；新功能的 seat 全部来自 `seats.ts` 封闭枚举，无新增挂点 |
| **P5 将来** | later | 远程 transport、`compose.ts` 生成化；运行期加载只做宿主侧 spike；product 优先级 3–5（定时/通知/检索）按各自消费者出现落进 P4 式的功能轮次 | — |

## P2 的拆解（下一步就做这个）

0. **spike：桌面 shell 里的 `node:sqlite`**（原待决 #1–#3，前置到这里）。Electron 内跑通 `durable` 的 SQLite storage 一次读写 + 包体积与启动耗时记录；顺带定主进程内跑 server 还是 spawn。产出一条 `.agents/notes/implemented/` 决策。**前提验证必须先于主干**：P2 的 `paths.ts` 注入与 chat 落盘都建立在 sqlite 可用上，spike 推翻前提的成本在这里是一天，放到 P3 是重写。若不可用，`storage` 提前做第二个 provider（原待决 #2 的退路），仍在本步骤内定案。
1. `packages/contracts`：只放跨进程 wire 类型与自研 seam 声明。判据：`check-workspace-resolution` 仍有 `source` 条件，且包内无 I/O。
2. `packages/platform/host`：`extend/` 门面（显式清单，禁 `export *`）、`seats.ts`（封闭枚举）、`paths.ts`（注入）、`transport/loopback`（token + 127.0.0.1）。
3. `apps/server`：`main.ts` 只做五步——读 paths → `openHost()` → `install(compose)` → 挂 HTTP/WS → 打印地址；`compose.ts` 一行一个功能。
4. `packages/features/chat`：第一个竖切功能，host + client 同包，`contract.ts` 先定型。compose 装配 `durable/src/tools/` 已有的 `read`/`edit`/`write`/`bash`/`image`；文件检索（glob/grep）没有独立实现，先用 `bash` 兜底，**第一个真实消费者出现时**（见下表）再立独立工具。
5. 最小 web 壳：`packages/platform/web` 只声明 `panel` + `renderer` 两个 seat（`seats.md` §3 里其余五个等各自消费者），`apps/web` 起界面。client 面的渲染验证从这一步才开始——P2 的 host Gate 不依赖它。

## 目录何时出现

判据是**第一个消费者出现**，不是版本号。没有消费者就建 = 空壳。

| 触发条件 | 新增 |
| --- | --- |
| 出现第一个跨 web/server 的 wire 类型 | `packages/contracts/` |
| 第一个功能同时需要宿主面和界面面 | `packages/features/<id>/` |
| chat 的 client 面要渲染（P2 拆解步骤 5） | `packages/platform/web/`、`apps/web/` |
| 编码会话里出现“用 bash 找文件很别扭”的真实反馈 | `glob`/`grep` 独立工具（进 chat 包或 host 工具面，按 `structure.md` §7 判归属） |
| 需要替换一个 seam 的第二个实现 | `packages/providers/<seam>-<impl>/` |
| 第二个功能出现 | `seats.ts` 转唯一权威 + 打开 `check-feature-registry` |
| 第一次出安装包 | `apps/desktop`、`tsdown.config.ts`、`desktop-release.yml` |
| 第一个可装的 exe 出现，或 transport 开始接受来 127.0.0.1 之外的连接 | `deps-audit` 从每周一改回每天（现在没有自动依赖变更，每天跑只会训练唯一的那个读者去静音它），并把 `tests/golden/` 提到发布前置 |
| 第一次要手机连本机 | `platform/host/src/transport/remote` + `contracts/auth.ts` |
| 同一步骤被手工做 3 次 | `.agents/skills/<name>/` |
| 首次改动内核，**或 durable 里第一次出现产品自己的数据结构**（chat 会话落盘即触发） | `tests/golden/` + `docs/kernel/divergence.md` 条目 |
| 功能数超过约 20，或重复登记出过事故 | `gen-feature-index.mjs` 接管 `compose.ts` |

## 外部设计参考

对照过 DeepSeek harness 的技能机制（四个运行时包 + invocation 守卫 + 从人工评审生成增量的流水线）。原则是**只借判据，不借载体**；不借的部分已经记在 `.agents/notes/rejected/2026-10-29-deepseek-skill-machinery.md`，这里只记已做与待做。

### 已采用

| 借来的做法 | 本仓库的形状 | 证据 |
| --- | --- | --- |
| 规则必须链到真实事件，不能链到观察感受 | skill 的「出处」只允许写 commit hash 与已有章节号 | `.agents/skills/add-a-guard/SKILL.md` |
| 单一范围 + 漂移即拒绝 | `check-doc-links` 让指向不存在文件的链接直接红 | 首次运行就拦到一条真断链 |
| 守卫要能被反例证明 | 进入门禁的守卫都有会红的用例 | `5a540d5`、`ab90e2c` |
| P0 定义是“照做会失败”而不是“写得不好” | 新增文档/守卫的验收问句：新 agent 照它做会不会错；不会就删 | 本轮拒掉了五条无消费者的守卫与两条散文检查 |
| 到点先用现实检验前提，再决定做还是作废 | 桌面 shell 的 `node:sqlite` spike 前置为 P2 步骤 0，不再悬在待决表 | 本轮评估发现 plan 自身违反这条后修正 |

### 待采用

**不在这里列表。** 凡是“现在不做、将来某个条件成立时才判断”的东西，一律进 [`parked.md`](./parked.md)。理由不是排版：留在 plan 里的清单靠人记得，而 parked 条目带触发条件、复核日期与前提，到点会红，且必须先用现实检验前提再决定做还是作废。

## 待决

| # | 待决 | 当前倾向 | 决定前需要的证据 |
| --- | --- | --- | --- |
| 1 | 桌面外壳：Electron / Tauri / 自打包 Node；sqlite 退路；主进程还是 spawn | Electron + 主进程内跑 server | **已前置为 P2 拆解步骤 0 的 spike**，定案后写 `.agents/notes/implemented/` 并从本表删除 |
| 2 | 手机远程的鉴权模型 | 设备配对 + 能力 token，`contracts/auth.ts` 先定型 | 是否暴露公网 |
| 3 | `compose.ts` 何时改为生成物 | 功能数 > 20 或重复登记出过事故 | 漏登记次数 |
| 4 | 内核是否分拆 `durable` | 暂不拆，靠门面与账本控制半径 | 连续若干次改动都落在同一子目录 |
| 5 | Windows 上 5 个 symlink 用例 | 已改 `skipIf`（见 baseline） | —— |
