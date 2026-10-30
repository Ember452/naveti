# 主计划

> 计划会过期，所以它单独一份、单独更新，不写进 `structure.md`（那里只有稳定的规则）。
> 状态只在标题里标一次：`done` / `doing` / `next` / `later`。
> **做什么、先做哪个**不由本文回答，见 [`docs/product.md`](../product.md)；本文只定顺序、落点与验收。阶段的取舍与 product 优先级冲突时，改本文，不改 product 的排序依据。

## 阶段与判据

| 阶段 | 状态 | 内容 | Gate |
| --- | --- | --- | --- |
| **P0 机械层** | done | 分组目录 `packages/kernel/*`、pnpm 隔离式依赖、删手写 `paths`/alias 改 `exports` 的 `source` 条件、根 `test.projects` 单进程、密封测试环境、结构守卫（见 `docs/structure.md` §13） | `pnpm check` / `pnpm build` / `pnpm test:ci` 三平台全绿；Ubuntu 数字见 `migration/baseline.md` |
| **P1 规则层** | done | `AGENTS.md`、`KERNEL.md`、`docs/structure.md`、`docs/architecture.md`、`docs/product.md`、`docs/kernel/{seats,divergence}.md`、`.agents/notes/`、`CONTRIBUTING.md`、`SECURITY.md` | `structure.md` §17 权威分工表里每篇文档在磁盘存在且被 `check-doc-links` 绿；此后**规则文档只为已被现实触发的漂移新增，不为“更完备”新增**（新增判据同 §13 守卫：照做会失败才写） |
| **P2 主干** | done | `spike 桌面 shell 前提` → `packages/contracts` → `packages/platform/host`（门面 + seat 表 + paths 注入 + transport loopback）→ `apps/server` → 第一个功能 `chat`（compose 装上内核已有工具）→ 最小 web 壳（只建 `panel`/`renderer` 两个 seat）→ `apps/web` | host 侧：loopback 端到端一轮**带工具调用**的对话（`read`/`edit`/`bash` 至少各发生一次且落盘可恢复）——机器证据在 `apps/server/test/loopback.spec.ts`；client 侧：chat 界面在 `apps/web` 渲染同一轮对话——人工看过工具卡。删掉该功能 = 删包 + 两行（实测：平台代码未动）。**待验（不是待做）**：“第二个功能加进来时平台不改”这条判据只能在 P4 被检验 |
| **P3 出包** | later | `packages/platform/web` 补全 → `apps/desktop` + `tsdown.config.ts`（shell 形态由 P3 定案，运行时与存储已由 P2 步骤 0 定案，见 [`2026-10-30-p2-runtime-shape.md`](../../.agents/notes/implemented/2026-10-30-p2-runtime-shape.md)）；**断线自愈**：`@naveti/web` 的 `connect` 现在只拨一次，socket 掉线后界面停在最后一个快照且不报错，桌面端睡一晚就会撞上（见 `docs/architecture.md` §2 第 7 步的现状注） | 出一个能装能跑、数据落在 `userData` 的安装包；安装包上跑通 product「一年判据」第 1 条的编码任务。**出第一个安装包的同一轮必须定案两件 P2 仍未定的事：Electron 内 `node:sqlite` 是否可用、包体积与冷启动耗时**（到期条件在此，不再“以后再说”）；若不可用，按已写下的退路只加一个 `storage` provider 包。另加一条可证伪的：断网 30 秒再恢复，界面不刷新也能自己回到最新（今天做不到） |
| **P4 功能扩展** | later | 下一个功能由 `product.md` 首批功能表顺位定（当前是记忆与检索）；**第二个带界面的功能出现前先补客户端的挡路石**：`AppFrame` 今天把注册的 `panel` 全叠在一列，没有 `nav` 与面板切换——第二个 UI 功能一进来就是这个形状；**门面收窄**：给内核加窄子路径（`@naveti/durable/define`、`/types`、`/docs` 之类），把 `@naveti/host/extend/*` 每个子路径从今天的 87 文件量级压到 12 以内（实测与结论见 [`2026-10-30-facade-width-measured.md`](../../.agents/notes/implemented/2026-10-30-facade-width-measured.md)）。（`check-feature-registry` 已在 P2 后补建，不占 P4） | 两个功能并行不互相 import；新功能的 seat 全部来自 `seats.ts` 封闭枚举，无新增挂点；`extend/*` 每个入口的实测文件数降到两位数；两个面板能各占一处而不是上下叠 |
| **P5 将来** | later | 远程 transport、`compose.ts` 生成化；运行期加载只做宿主侧 spike；product 优先级 3–5（定时/通知/检索）按各自消费者出现落进 P4 式的功能轮次 | — |

## P2 的拆解（已完成，留作记录）

0. **spike：桌面 shell 里的 `node:sqlite`**（原待决 #1–#3，前置到这里）。**两段式，P2 已定案**：P2 只验 Node 侧（`node:sqlite` → `openStore` → `StoreStorage` → `Harness.open` 一轮读写 + 重启读回，实测已过）；**Electron 内可用性、包体积与冷启动留到 P3 安装包那轮**，到期条件已写进 P3 Gate，退路不变（不可用就只加一个 `storage` provider）。记录见 [`2026-10-30-p2-runtime-shape.md`](../../.agents/notes/implemented/2026-10-30-p2-runtime-shape.md)。之所以能拆开：P2 的 `paths.ts` 注入与 chat 落盘只依赖“`node:sqlite` 在 Node 里可用”，而 Electron 内是否可用能用同一个 spike 脚本在 P3 重跑——它不改变 P2 的任何形状，只影响发布产物。
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
| 第二个功能出现 | `seats.ts` 转唯一权威（`check-feature-registry` 已在 P2 后先建） |
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
| 1 | 桌面外壳：Electron / Tauri / 自打包 Node；宿主进程内还是 spawn | Electron + 宿主进程内跑 server（spawn 保留为退路） | 运行时与存储已由 P2 步骤 0 定案（见 [`2026-10-30-p2-runtime-shape.md`](../../.agents/notes/implemented/2026-10-30-p2-runtime-shape.md)）；只剩 Electron 内 `node:sqlite` 与包体积/启动耗时，到期条件写在 P3 的 Gate 列 |
| 2 | 手机远程的鉴权模型 | 设备配对 + 能力 token，`contracts/auth.ts` 先定型 | 是否暴露公网 |
| 3 | `compose.ts` 何时改为生成物 | 功能数 > 20 或重复登记出过事故 | 漏登记次数 |
| 4 | 内核是否分拆 `durable` | 暂不拆，靠门面与账本控制半径 | 连续若干次改动都落在同一子目录 |
| 5 | Windows 上 5 个 symlink 用例 | 已改 `skipIf`（见 baseline） | —— |
