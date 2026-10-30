# 项目结构

> 空间轴权威。本文只回答三件事：**仓库里有什么、一个功能必须放在哪、什么还不该建。**
> 不回答：内核能不能改（见 [`KERNEL.md`](../KERNEL.md)）、什么算绿（见 [`docs/migration/baseline.md`](./migration/baseline.md)）、做什么功能（产品文档尚未写）。

## 目录

1. [这份文档管什么](#1-这份文档管什么)
2. [四层目标与结构手段](#2-四层目标与结构手段)
3. [根目录全景](#3-根目录全景)
4. [内核六包](#4-内核六包)
5. [五类包：职责与依赖方向](#5-五类包职责与依赖方向)
6. [内核门面](#6-内核门面为什么功能看不见内核)
7. [一个功能一个包](#7-一个功能一个包)
8. [manifest 与 compose](#8-manifest-与-compose三方一致)
9. [seam 与 provider](#9-seam-与-provider按契约换实现的准确形状)
10. [seat 目录](#10-seat-目录)
11. [发布形态、模块解析与打包](#11-发布形态一个打包入口不给每包写构建配置)
12. [防散落规则](#12-防散落规则)
13. [守卫](#13-守卫)
14. [仓库级基础设施](#14-仓库级基础设施)
15. [目录出现时机](#15-目录出现时机)
16. [明确不建](#16-明确不建)
17. [权威分工](#17-权威分工)
18. [待决项](#18-待决项)

## 1. 这份文档管什么

本文只写**规则**：什么放哪、什么不许出现、什么还不该建。

**状态不写在这里。** 有几个包、几条守卫、某个目录是否存在，用命令问，不问文档：

```bash
git ls-files 'packages/**/package.json'   # 有哪些包
ls scripts/check-*.mjs                    # 有哪些守卫
pnpm run check                            # 现在是不是绿
```

写进文档的状态每提交一次就漂移一次；这个仓库已经因此漂了八处（目录树重复写 `pnpm-workspace.yaml`、把已建好的守卫列为“待建”、列出一个不存在的 `docs/archived/` 等）。那些都不是笔误，是“把状态写进规则文档”的必然结果。

唯一保留“存在性”的地方是 §3 的目录树：树不可能不表达存在与否，所以它的规矩是**每一条要么真实存在，要么带 `[未建]`**。除树之外，本文不出现任何数量断言，也不重复写同一个文件两次。

三条要解决的问题（它们是规则，不会过期）：

1. **包数从 6 涨到 30+ 之后，手工枚举必然漂移。** 解法是分组目录 + 把模块解析交给 pnpm 的 symlink 与包的 `exports` 条件（§11.1），而不是维护一份更大的枚举表。
2. **功能会散落。** 判据是“改一个功能要开几个目录”。答案是竖切成包：一个功能一个 workspace 包，删功能 = 删目录 + 一行登记。
3. **内核要改，但没有落点。** 原策略是“冻结 + 只摘取上游补丁”，它把改动定性为例外事件。改成“三档变更 + 门面吸收 + 分歧账本”（见 `KERNEL.md`），改动才有地方发生、有地方记录。

**交付形态决定 `apps/` 的形状：** 现在出 Windows 安装包，将来支持手机远程控制。本机与远程共用同一个运行时与同一份前端产物，`apps/desktop` 不是第二个运行时。

**现在做到哪一步、按什么顺序继续：** 见 [`plan/master-plan.md`](./plan/master-plan.md)。**做什么、优先级**见 [`product.md`](./product.md)。本文不写阶段状态，也不写功能取舍。

## 2. 四层目标与结构手段

| 目标 | 结构手段 | 违反时的症状 |
| --- | --- | --- |
| 功能不散落 | 一个功能一个包 + `exports` 物理边界 + 依赖方向机检 | 改一个功能要开五个目录 |
| 按契约换实现 | seam 三角色（Definition / Provider / Consumer），provider 与 feature 分家 | 换存储后端，结果给用户多出一个功能 |
| 内核可改 | `@naveti/host` 门面 + 三档变更 + 分歧账本 | 内核里长出产品语义，三个月后没人知道改过哪 |
| 一次交付两个端 | `apps/desktop` 只做窗口与打包，`platform/host` 接受注入路径 | 桌面与手机各跑一套逻辑 |

## 3. 根目录全景

```text
naveti/
├── packages/                            所有 workspace 包（pnpm-workspace.yaml 分组 globs）
│   ├── kernel/                          L0 自有内核（pi 派生，可改）
│   │   ├── telemetry/                   @naveti/telemetry
│   │   ├── ai/                          @naveti/ai
│   │   ├── chord/                       @naveti/chord
│   │   ├── codemode/                    @naveti/codemode
│   │   ├── mcp/                         @naveti/mcp
│   │   ├── durable/                     @naveti/durable
│   │   └── README.md                    所有权、变更分级、扩展点索引
│   ├── contracts/                       L1 零 I/O：wire 契约与 transport 声明
│   ├── platform/                        L2 host（装配/seat/路径/transport）+ web（壳/slot）
│   ├── providers/                       [未建] L2.5 可替换实现，按 seam 分，不进功能清单
│   └── features/                        L3 一个功能一个包（§7），现为 `chat`
├── apps/                                L4 组合根：server（宿主）/ web（浏览器）；desktop 在 P3
├── scripts/                             守卫与编排脚本，清单见 §14（不在这里数个数）
├── tests/
│   ├── smoke/persist-resume.ts          持久化与恢复冒烟
│   └── golden/chat-wire.json           wire 契约与持久化格式的黄金文件（首次改动内核或首个产品数据结构时建）
├── docs/
│   ├── README.md                        导航：谁回答什么
│   ├── structure.md                     本文，空间轴权威
│   ├── product.md                       做什么、先做哪个、什么不做
│   ├── architecture.md                  系统怎么运转
│   ├── plan/master-plan.md              阶段、出现时机、待决
│   ├── plan/parked.md                   现在不做、到点必须重新判断的事（带触发条件与前提）
│   ├── kernel/
│   │   ├── seats.md                     扩展点权威表
│   │   └── divergence.md                与 pi 1.4.0 的分歧账本
│   ├── learn/                           学习文档：本项目讲解与带出处的外部资料（非权威）
│   └── migration/                       README / baseline / deviations / upstream-sync / diffs/
├── .agents/
│   ├── notes/{proposed,implemented,archived,rejected}/   决策记录（§14）
│   └── skills/add-a-guard/SKILL.md      已建；其余按需
├── .github/
│   ├── workflows/                       见 §14
│   ├── ISSUE_TEMPLATE/                  bug / config / contribution / package-report
│   └── APPROVED_CONTRIBUTORS            贡献者准入名单（approve-contributor.yml 读）
├── .githooks/                           pre-commit（静态检查）/ pre-push（pnpm check），用 hooks:install 装
├── .claude/skills                       [未建] 符号链接 → ../.agents/skills（不做第二份）
├── .upstream/                           gitignored，sync-upstream 的规范化缓存
├── AGENTS.md                            agent 硬约束（不是本文副本）
├── CLAUDE.md                            指针：规则见 AGENTS.md
├── KERNEL.md  NOTICE.md  README.md  LICENSE  CONTRIBUTING.md  SECURITY.md
├── pnpm-workspace.yaml  pnpm-lock.yaml  分组 globs、allowBuilds、锁文件
├── vitest.config.ts  vitest.base.ts     根 projects 入口、各包 mergeConfig 的共享默认值
├── tsdown.config.ts                     [未建] 发布期唯一打包入口（§11）
├── biome.json  tsconfig.json  tsconfig.base.json  package.json
└── .npmrc  .gitignore  .gitattributes
```

## 4. 内核六包

`packages/kernel/` 是自有内核（政策见 `KERNEL.md`）。六个包各自只回答一类问题：

| 包 | 负责 | 产品层需要的典型入口 |
| --- | --- | --- |
| `durable` | 持久化运行时：会话日志（entry）、doc（session / conversation / task 三种 scope）、task 状态机与调度、工具注册与执行、审批 hook、扩展装配（`defineExtension` / `defineTool` / `defineDoc` / `defineTask` / `hook` / `section` / `wrap*`）、`Harness.open()` | 全部 seat 的机制来源；功能不直接 import，只经门面 |
| `chord` | 类型化宿主运行时：契约、复制状态、JSON 链路上的 RPC、watch/snapshot 语义、SQLite 与内存后端 | 前端订阅功能状态的那条流 |
| `ai` | 统一 LLM API：provider 适配、模型目录、流式事件、token 计量 | 模型选择与会话生成 |
| `mcp` | Model Context Protocol 客户端：连接、工具/资源发现、OAuth | 连接器类功能的底座 |
| `codemode` | 沙箱内执行 JS，唯一能力是调用注入的工具 | 代码式工具编排 |
| `telemetry` | 厂商中立的遥测契约与类型化 schema 工具 | 运行指标与诊断 |

读代码顺序建议：`durable/src/harness/define.ts`（扩展点）→ `durable/src/harness/registry.ts`（装配 `install`）→ `durable/src/harness/harness.ts`（`Harness.open`）→ `durable/src/documents.ts`（doc）。

六包之间是**强耦合的一体**（`durable` 依赖 `chord` `ai` `codemode` `telemetry`，共享 entry schema 与 delta 编码）。因此 `KERNEL.md` §5 规定：`durable` 与 `chord` 必须成对升级，禁止半跟随。改造内核时也要记住——动 entry schema 就是同时动两个包。

## 5. 五类包：职责与依赖方向

| 类 | 例子 | 可以 import | 有界面 | 用户可见 | 变更频率 |
| --- | --- | --- | --- | --- | --- |
| **kernel** | `@naveti/durable` | 只 import 其他 kernel | 否 | 否 | 慢，但**允许改**（`KERNEL.md` §2） |
| **contracts** | `@naveti/contracts` | 内核的声明层（契约与 schema 构造，现为 `@naveti/chord`）；无 I/O、无状态、无注册表 | 否 | 否 | 稳定，破坏性改升版本 |
| **platform** | `@naveti/host`、`@naveti/web` | kernel、contracts | host 否 / web 是 | 否 | 中 |
| **provider** | `@naveti/storage-sqlite` | kernel、contracts、platform/host | 否 | **否** | 跟随上游生态 |
| **feature** | `@naveti/feature-memory` | contracts、host、web、其他 feature 的 `./contract` | 可选 | **是** | 高频 |
| **app** | `apps/server` | 全部（组合根） | — | — | 几乎不动 |

依赖铁律，每条都能用 `package.json` 或 import 图机检：

1. **kernel 不 import 产品层。** `dependencies` 里不出现 `@naveti/{contracts,host,web,feature-*,storage-*}`。
2. **feature 不 import kernel。** feature 的 `dependencies` 里不出现 `@naveti/{ai,chord,codemode,durable,mcp,telemetry}`。这条是"内核可改"的全部代价：多写一个门面，换来内核重构时功能一行不动。
3. **feature 之间只允许 `./contract` 子路径，且必须显式声明依赖。** 值导入另一个功能的实现 = 红。
4. **provider 不登记进 `compose.ts` 的功能清单。** 它只在配置里被选中，没有 id、没有面板、没有设置分区。
5. **client 面不 import `node:*`、不 import `platform/host`、不 import 同包 `src/host/**`。** 从 client 入口走值导入图机检。
6. **contracts 不 import `platform` 或 `features`；platform 不 import `features`。**
7. **引擎只在 `apps/server` 进程里加载。** `apps/web` 与 `apps/desktop` 的渲染进程不加载内核，否则会出两套运行时、两份存储状态。
8. **`platform/host` 不自己决定数据目录。** `dataDir` / `cacheDir` / `webAssetsDir` 由 `apps/*` 注入；取路径的代码只允许出现在 `apps/*`。
9. **包之间不用相对路径跨界 import。** 一律走包名 + `exports`；`check-ts-relative-imports` 兜住。
10. **不为模块解析加 `tsconfig` 的 `paths` 或 vitest alias。** 见 §11.1。

## 6. 内核门面：为什么功能看不见内核

`packages/platform/host/src/extend/` 重新导出被批准的扩展 API，按子路径切：

```text
@naveti/host/extend              装配入口（defineFeature、Extension 类型）
@naveti/host/extend/tools        defineTool、ToolRegistration、工具执行相关类型
@naveti/host/extend/docs         defineDoc、defineDocFamily、三种 scope 的类型
@naveti/host/extend/tasks        defineTask、TaskDefinition、TaskOutcome
@naveti/host/extend/hooks        hook、ToolTask / GenerationTask 的 handler 类型
@naveti/host/extend/prompt       section
@naveti/host/extend/wrap         wrapTool、wrapSection
@naveti/host/extend/settings     设置 schema [未建]
@naveti/host/extend/service      宿主侧服务注册 [未建]
@naveti/host/extend/types        纯类型汇总（功能只做类型标注时用这个）
```

三条纪律：

1. **禁止 `export *`。** 门面是显式清单，不是筒仓。清单本身就是"内核对功能的承诺"。
2. **只在有真实消费者时加子路径。** 没有功能用到的能力不进清单；清单越长，内核改动的传导面越大。
3. **门面只做转出与适配，不放业务逻辑。** 允许"把内核两个类型拼成一个"，不允许"判断该不该记这条记忆"。

门面存在的前提是**功能真的不用内核**。一旦某个功能需要内核深处能力（自定义 entry、直接操作 doc 内部），正确处理是给门面加子路径并在 `docs/kernel/seats.md` 登记，而不是在该功能里深引内核。

**门面的宽度是量出来的，不是声称的。** 每个子路径在 `scripts/entry-budgets.json` 里有预算，产品层的每个代码入口都必须有（`check-entry-graphs`），而且产品层入口的 `maxFiles` 是**手工天花板**：`--update` 只报实测、不写回，要抬数字必须改文件并在 PR 里说明。P2 落地时的实测表明：只引用类型的子路径很窄，而转出内核运行值的子路径与内核根入口同量级——因为一行 `export { … } from "@naveti/durable"` 拖进来的是整个 barrel。这不是门面的失败，是内核只有根入口的结果；收窄已写进 P4 的验收（目标：每个入口降到两位数），实测与理由见 `.agents/notes/implemented/2026-10-30-facade-width-measured.md`。

**门面是内核改动的吸收层**：内核重构时只改这里，功能包一行不动。这是"内核不冻结"能成立的结构原因。

## 7. 一个功能一个包

**一个功能 = 一个 workspace 包 + 一个 `exports` 出口面 + 固定 seat。这就是"功能不散落"的全部答案。**

```text
packages/features/memory/
├── package.json          exports: "." → host / "./client" / "./manifest"
├── naveti.feature.json   { id, contract, seats, requires, provides }
├── README.md             五行契约：拥有什么 / 可 import 什么 / 占哪些 seat / 依赖谁 / 删掉会怎样
├── src/
│   ├── host/index.ts     默认导出 defineFeature(...)
│   ├── host/doc.ts       功能状态（scope 三选一，见 docs/kernel/seats.md §4）
│   ├── host/tools.ts     defineTool 的贡献点
│   ├── host/<thing>.ts   一个贡献点一个文件
│   ├── shared.ts         纯函数，前后端共用（可选）
│   ├── client/index.ts   register(slots)
│   ├── client/panel.tsx  右栏面板，只吃 props 与 shared hook
│   ├── client/renderer.tsx  可选：本功能自有 entry kind 的渲染器
│   └── client/store.ts   可选：无 React 的镜像，React 只读它
└── test/
    ├── host.spec.ts      必有
    ├── client.spec.tsx   有界面必有
    └── fixtures/         本功能自己的夹具，不外放到仓库级目录
```

**wire 契约不在功能包里。** 它住 `packages/contracts`（宿主与客户端都要持有，而平台不许 import 功能），
所以功能包没有 `./contract` 出口——两份声明就是两套真相。功能间需要共享的*服务接口*仍可以走 `./contract`，
那是另一个事实（“我能被谁调”），与 wire 格式不同。

`package.json` 的出口面（包边界唯一可用的地方）：

```json
{
  "name": "@naveti/feature-memory",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": { "source": "./src/host/index.ts", "types": "./dist/host/index.d.ts", "import": "./dist/host/index.js" },
    "./client": { "source": "./src/client/index.ts", "types": "./dist/client/index.d.ts", "import": "./dist/client/index.js" },
    "./manifest": "./naveti.feature.json"
  },
  "dependencies": {
    "@naveti/contracts": "workspace:*"
  },
  "peerDependencies": {
    "@naveti/host": "workspace:*",
    "@naveti/web": "workspace:*"
  }
}
```

规则：

1. **命名固定 `@naveti/feature-<id>`，目录固定 `packages/features/<id>/`。** id 只允许小写短横线，且与目录名、包名后缀一致（机检）。
2. **wire 契约住 `@naveti/contracts`，功能包不自称契约的权威。** 契约为全局版本（`name` + `version`），契约改动同时更新 `tests/golden/` 的对应黄金文件。
3. **一个贡献点一个文件。** 单文件超过约 200 行再拆子目录，不预先拆。
4. **每个包至少一条 host 测试；有界面再加一条 client 测试。** 测试与夹具在包内 `test/`，禁止放仓库级 `tests/`；但**运行**由根上单个 vitest 进程统一调度，不是每包起一个 runner（§13.1）。
5. **包内文件可自由拆分，包外只能经 `exports` 进入。** 深路径 import 在所有包上是红。
6. **`compose.ts` 之外不得出现功能 id。** 壳文件、平台文件、其他功能里出现即红。

### 双面单包，而不是 host 包 + client 包

同一功能两个面（`src/host`、`src/client`）留在同一个包里，用 `exports` 子路径隔离：

- 判据是"删得掉"：一个包删一次；拆两包要删两处依赖，漏一处就是孤儿。
- 代价是 client 面无法用 `dependencies` 表达隔离，只能靠 import 图守卫（`check-client-face`）。这条守卫本来就要写。
- **拆分触发**：单包超过约 3000 行，或 client 面需要独立发布/独立测试车道。触发时才拆成 `feature-x` + `feature-x-client`，并同时更新本文。

## 8. manifest 与 compose：三方一致

| 位置 | 唯一负责的说法 |
| --- | --- |
| `packages/features/*/naveti.feature.json` | 我这个功能**提供什么**：id、契约版本、占哪些 seat、依赖哪些功能 |
| `apps/server/src/compose.ts` | 这次**装了哪些**功能：id → 入口 |
| `packages/features/*/` 目录 | 代码在哪 |

三者必须双向相等，由 `check-feature-registry` 机检（缺目录、缺登记、孤儿包、幽灵条目、未知 seat、悬空 `requires` 全部失败）。

manifest 只写**现在真有消费者**的字段：

```json
{
  "id": "memory",
  "contract": 1,
  "seats": { "host": ["doc", "tool", "section"], "client": ["panel", "settings"] },
  "requires": [],
  "provides": ["service:memory"]
}
```

**不预留 `entry` / `api` 之类的未来字段。** 没有消费者的字段会腐化：它既不被校验也不被测试，最后变成"看文档以为支持"的错觉。

运行期装包的真实边界，两面必须分开说——**这是本文上一版最大的错误：承诺了一条分不清两面的升级路径。**

| 面 | 能不能做 | 代价 |
| --- | --- | --- |
| 宿主面 | 能，`await import(specifier)` 在 Node 里可行 | 不是"加两个字段"：包要在运行时可解析（已装到 node_modules）、`api` 版本相容、卸载语义（dispose 顺序 + doc/task 回收）、错误隔离。这是 `KERNEL.md` §2 的 **C 档（结构手术）** |
| 界面面 | 基本不能 | Vite 的代码分割是**构建期**的。运行期加载外部 React chunk 需要 Module Federation / import map / 预生成 chunk 清单，还要解决 React 单实例、样式注入、slot 契约版本 |

所以正确的承诺是一句话：**"不重新构建主程序即可新增宿主能力；界面随应用一起构建。"** 装一个新功能 = 装包 + 重建 SPA——对个人 agent 完全可接受，不值得为热插拔 UI 付上面那套复杂度。

现在不做任何预留。真要做，先写一条决策记录，第一个 spike 只做宿主侧（一个 demo 功能通过 `import()` 装上、被调用、被卸载、错误不影响主进程）；界面侧不承诺。

`compose.ts` 的形状（懒加载，启动成本按功能分摊）。宿主与客户端各一份：两个面本来就独立（一个功能可以只有宿主面），
但它们必须在功能集合上一致：

```ts
// apps/server/src/compose.ts
export const compose = [
  { id: "chat", host: () => import("@naveti/feature-chat") },
];

// apps/web/src/compose.ts
export const compose = [
  { id: "chat", client: () => import("@naveti/feature-chat/client") },
];
```

`apps/server/src/main.ts` 的完整职责只有五步：读 `paths` → `openHost(paths)` → 把 `compose.features` 传给 `install()` → 挂 HTTP/WS → 打印本地地址。超过约 200 行非 import 代码就是逻辑放错层。

## 9. seam 与 provider：按契约换实现的准确形状

一个 seam 有三个角色，缺一不算 seam：**Service Definition（声明接口）/ Provider（实现）/ Consumer（使用方）**。

| seam | Definition 放哪 | Provider 例子 |
| --- | --- | --- |
| 存储 | 内核已有（durable `Storage`）→ **不要重新声明** | `providers/storage-sqlite` |
| 模型 | 内核已有（`ai` 的 adapter） | `providers/llm-<vendor>` |
| 浏览器 / 沙箱 / 搜索 | 自研 → `packages/contracts/seams/<name>.ts`（只声明，不含注册表） | `providers/browser-<x>` |
| 连接器 | 内核已有（`mcp`） | `providers/mcp-<x>` |
| 功能的对外服务 | 功能自己的 `./contract` | 同包默认实现 |

两条纪律：

1. **内核已声明过的 seam，不在我们这边重写一份。** provider 直接实现内核接口；自研 seam 的声明放 `contracts`（无 I/O、无状态、不 import `platform`/`features`——但它会产出运行时值：chord 的 `remote()` / `method()` 就是用来算 name + version + 指纹的声明，纯 `import type` 拿不到指纹），而“当前选中哪个实现”的注册表与选择逻辑放 `platform/host`——选中是装配决策，不是类型。重写 = 两处真相，内核一改就对不上。
2. **Definition 跟着当前消费者走。** 没有第二个实现、没有第二个使用方，就不抽 interface（否则得到一层空抽象）。

`providers/` 目录**按需出现**：出现"同一个 seam 的第二个实现"时才建对应包。第一个实现如果已在内核里，不搬到 `providers/`。

**识别判据是两条可证伪的测试。** "用户能不能感觉到差别"不是判据——任何实现替换都可能影响质量（换数据库、换模型、换压缩算法都能被感知）：

1. **换实现只改配置**：换掉它只需改配置里的选择项，不改任何 feature 代码 → 是 provider。需要改 feature 才能换 → 不是。
2. **不贡献 seat、不改策略**：它不新增 tool / panel / nav / settings 分区，也不决定 agent 看到什么 → 是 provider。一旦贡献 seat 或改变策略，它就不是纯 provider。

边界案例——换一个向量数据库连接器：

- `providers/vector-<db>`：只实现 `VectorStore`（建表、写索引、按向量查询）。这是 provider。
- "怎么切块、要不要 rerank、召回几条、什么时候写、写失败怎么办"是**策略**，改变的是 agent 看到什么 → 属于 `feature-memory`（或独立 feature），**永远不进 `providers/`**。
- 两者常常一起改，但**不要因此合并成一个包**：合并的直接后果是"换数据库要动策略代码，策略又绑死某个数据库"。
- 判据落到一句话：**接口实现归 provider，用法与策略归 feature。** 决策权在谁手里，比"它看起来像不像一个功能"可靠得多。

`transport` 是例外：它在 `packages/platform/host/src/transport/` 内部做两个实现（`loopback`、将来的 `remote`），类型放 `contracts/transport.ts`。原因是两者共享握手与鉴权代码，拆成两个包会重复这部分；而它换的是"怎么连"，不是"连什么"。

## 10. seat 目录

seat 是功能接入宿主与界面的**固定挂点**。清单封闭，新增 seat 属于平台变更，要写决策记录。

权威表在 [`docs/kernel/seats.md`](./kernel/seats.md)：每个 seat 记机制（哪个内核符号）、门面子路径、状态、典型用途；另有 `doc` 三种 scope 的取舍表、新增 seat 的门槛、provider 与 seat 的区分。**本文不复制那张表**（复制即漂移）。

一句话摘要：宿主侧 7 个已采用 seat（`tool` `section` `hook` `wrap` `task` `doc` `extension`），另有 `config` / `service` 两个候选；客户端侧 7 个（`panel` `nav` `settings` `command` `composer` `renderer` `status`）。权威表见 [`docs/kernel/seats.md`](./kernel/seats.md)。

## 11. 发布形态：一个打包入口，不给每包写构建配置

| 阶段 | host 侧 | client 侧 |
| --- | --- | --- |
| 开发 | pnpm symlink + `customConditions: ["source"]` 直跑源码 | Vite 直跑源码 |
| 发布 | 根上**一个** `tsdown.config.ts`，入口由 manifest 生成：`features/* → dist/features/*.js`、`apps/server → dist/server.js` | Vite 单次构建，功能子路径自动分块 |

因此**加功能包 = 加目录，零构建配置**。这是"一个功能一个包"能长期不烂的前提，比任何守卫都重要。

安装包只由 `apps/desktop` 产出：窗口 + 主进程 + 打包/签名/更新脚本。主进程 **spawn** `apps/server` 的装配产物（而不是把业务塞进主进程），这样"手机远程"上线时不动桌面代码。

`platform/host` 只接受注入的路径，桌面传 `app.getPath("userData")`、CLI 传 `--home`、将来的服务器传环境变量——三种入口零分叉。

### 11.1 模块解析：不生成 paths、不写 alias

三层各管一件事，合起来就够，而且对 IDE 是"真路径"：

1. **包名 → 路径**：pnpm 在 `node_modules` 建 symlink（跨包依赖写 `workspace:*`）。
2. **入口 → 文件**：每个包的 `exports` 同时给出 `"source": "./src/index.ts"`、`"import": "./dist/index.js"`、`"types": "./dist/index.d.ts"`。
3. **按条件取源码**：`tsconfig.json` 设 `"customConditions": ["source"]`，`vitest.base.ts` 设 `resolve.conditions: ["source"]`。

于是 `tsconfig.json` 不需要 `paths`，`vitest.base.ts` 不需要 `@naveti/*` alias，TS Server 走的是 node_modules 里的真实符号链接——**加包零配置、零脚本、零重启**。

为什么不用 Project References 解决这个：references 解决的是**增量构建、构建顺序、边界强制**，它不参与模块解析。"用 references"与"要不要 paths"是两个独立问题；两个都做不冲突，但用了 references 还留着手写 paths 就是重复。

**手写 `paths` 的真实代价**：它是静态字符串，加包必须跑脚本，TS Server 拿到的是旧映射——飘红与脚本执行时机强绑定，而红的往往是"忘了跑脚本"，不是代码错了。

例外白名单：`paths` 只允许保留 `typebox` 这类 node_modules 重定向（1–3 条），由 `check-workspace-resolution` 锁死；出现第 4 条要走决策记录。

迁移顺序（P0 的第一步，只改配置不改代码）：

1. 挑一个包，删掉它在 `paths` 与 vitest alias 里的条目，只靠上面三层解析；
2. 跑 `tsc --noEmit` + 该包测试 + IDE 里"转到定义"验证；
3. 通过后全量删。不通过再退回生成器，但必须在决策记录里写清为什么条件解析不成立。

## 12. 防散落规则

| # | 规则 | 违反时的症状 |
| --- | --- | --- |
| 1 | 一个功能的一切都在它自己的包里；包外唯一允许出现的痕迹是两份 `compose.ts` 各一行 | 改一个功能要开五个目录 |
| 2 | 功能之间 import 为 0，只允许 `./contract` 类型面 + 显式声明依赖 | 功能互相调用内部实现，删除时牵一发动全身 |
| 3 | 跨进程/跨功能 wire 类型进 `contracts/<domain>.ts`；功能内部类型留在 `shared.ts` | 契约目录变成杂物间，或功能私造协议 |
| 4 | 功能不给内核打补丁。需要改内核就走 `KERNEL.md` §2 的对应档位 | 内核里长出产品语义，回补上游时冲突 |
| 5 | client 面只 import `contracts`、`platform/web`、自身 `shared.ts`、其他功能的 `./contract` | 前端打进服务端代码，包体积与安全同时出事 |
| 6 | **装配不改壳。** 壳文件（`app-frame.tsx`、`sidebar.tsx`、`chat-view.tsx`）里出现任何功能 id 即失败 | 每加一个功能都要动同一个巨型组件 |
| 7 | 状态只有一处真相：功能状态住 durable doc（宿主侧），前端只消费流；`localStorage` 只允许纯视图偏好 | 前端自造持久状态，刷新与多端对不上 |
| 8 | wire 必须远程安全：不放 `Date` 对象、不放函数、id 是不透明字符串、订阅可断点续传 | 手机远程上线时要改每一个功能 |
| 9 | **删得掉**：删功能 = 删包 + 两份 `compose.ts` 各一行 + 两处依赖声明 + 重生生成物（锁文件、测试清单）；判据是 `packages/platform/*` 未动 | 仓库里堆着没人敢删的死代码 |
| 10 | 同一个事实只有一处权威；要引用就写"见 X"，不复制正文 | 复制的那一刻就开始漂移 |
| 11 | **凭据不进 URL**（query、path、`VITE_*` 都不行）。本机 token 走 WebSocket subprotocol，将来的远程凭据走请求头或首帧认证 | 凭据落进历史/日志/代理，换掉时要动已发布的客户端 |

## 13. 守卫

守卫清单不在这里数个数：`ls scripts/check-*.mjs` 就是当前全集，`package.json` 的 `check` 链决定谁在跑。本节只写**每条守卫守什么**、**哪些还没建**、**为什么**。

### 已建的

| 守卫 | 判据 | 反例测试 | 退役条件 |
| --- | --- | --- | --- |
| `check-pinned-deps` | 依赖版本钉死，不允许浮动范围 | 有 | 依赖冻结改由锁文件策略单独承担后 |
| `check-runtime-deps` | 运行时依赖闭包完整（不漏声明） | 有 | 闭包由打包器或 `pnpm deploy` 直接算出后 |
| `check-ts-relative-imports` | 相对导入不跨包 | 有（直接拿 cwd 扫描，夹具就是一个临时目录） | TypeScript 或 lint 原生拒绝跨包相对导入后 |
| `check-vitest-projects` | 根 `vitest.config.ts` 的 projects glob 只能命中配置文件或包目录（命中普通文件会让整个测试启动失败）；含测试的包必须自带 `vitest.config.ts` 且被某个 glob 收集 | 有 | projects 改成显式清单、误收不可能发生之后 |
| `check-entry-graphs` | 每个 `exports` 入口的值导入图预算（防 `export *` 把整包拖进来）；预算在 `scripts/entry-budgets.json`，`--update` 按实测 +10% 重写 `maxFiles`，`forbid`/`allow` 手工维护。**产品层（`packages/{contracts,platform,features}`、`apps/*`）的每个代码入口必须有条目**；内核包仍是手工按需登记 | 有（`NAVETI_CHECK_ROOT` 指向镜像仓库布局的夹具；含“产品层入口无预算”与“app 入口无预算”两个红例） | 入口预算由发布期打包产物报告接管后 |
| `check-lockfile-commit` | 依赖段变了 `pnpm-lock.yaml` 必须跟着变；反之锁文件变了必须有依赖变更，否则要 `NAVETI_ALLOW_LOCKFILE_CHANGE=1` | 有 | 锁文件改为 CI 生成、不再随提交进入仓库后 |
| `check-workspace-resolution` | 跨包依赖必须 `workspace:*`；`exports` 每条带 `source` 且在首位；`tsconfig` 无 `paths`、有 `customConditions`；vitest 配置无 `@naveti` alias | 有 | 模块解析交回 Project References 或打包器统一裁决后 |
| `check-package-layers` | 读 `dependencies` / `peerDependencies` / `devDependencies` 守四个方向：kernel 只依赖 kernel；contracts 只依赖内核的声明层（现为 `@naveti/chord`）；platform 不依赖 feature/app；feature 不依赖任何内核包 | 有（`NAVETI_CHECK_ROOT` 夹具，每个方向一条红例） | 包边界改由打包器或发布清单统一声明后 |
| `check-client-face` | 从每个功能的 `./client` 入口走**值导入图**（`import type` 不算），命中 `node:*`、`@naveti/host*`、同包 `src/host/**` 即失败 | 有（`NAVETI_CHECK_ROOT` 夹具：node 内置、host 包、同包 host 面、一跳远、无 client 面） | client 面改为独立构建目标、天然不解析 node 后 |
| `check-test-integrity` | `.only` / `describe.skip` 直接红；测试数不得减、各类 skip 不得增（对 `scripts/test-integrity.json` 棘轮） | 有 | 测试统计改为运行时采集、不再文本计数后 |
| `check-doc-links` | 我们拥有的 markdown（根 `*.md`、`docs/`、`.agents/`、`packages/kernel/README.md`）里的链接必须能解析；散文与代码块里的路径不查——那些经常是将来或示例路径 | 有 | 文档站构建的 dead-link 检查接管后 |
| `check-doc-counts` | 规则文档里不许出现清单数（`现有 N 个/条`、`N 个脚本/守卫/工作流`，以及旧的存在性标记）。只查说规矩的文档：`docs/migration/` 与 `.agents/notes/` 豁免 | 有 | 规则文档里的清单段全部移入生成物后 |
| `check-parked-triggers` | `docs/plan/parked.md` 每条推迟的事都必须带**触发条件 + 复核日期 + 前提**；条件成立或日期到期就红，红则必须在同一改动里做/改条件/作废 | 有 | parked 机制改为外部 issue 跟踪后 |
| `check-kernel-divergence` | 与 `scripts/kernel-baseline.json` 不同的内核文件必须在 `docs/kernel/divergence.md` 或 `docs/migration/deviations.md` 被命名；`--write` 拒绝吸收未命名改动，且基线在暂存区时必须同时暂存账本 | 有（`NAVETI_CHECK_ROOT` 指向临时树；含 `.json` glob、`.tsx` 边界、`--write` 拒绝吸收等红例） | 决定不再跟随上游、停止回补后 |
| `check-gate-registration` | 每条 `scripts/check-*.mjs` 必须同时有 `.test.mjs`、在 `check` 链里可达（透过 `pnpm run` 别名追踪）、并在本文出现且填了退役条件；链里引用的脚本必须存在 | 有 | 守卫清单改由生成器产出、登记不再手工后 |

两条纪律：反例测试要证明守卫**会变红**（只写绿例等于没有）；守卫的红例必须进 `check` 链（`pnpm run test:scripts`），否则反向校验永远不在门禁里。守卫能用夹具驱动的前提是它不把自己的目录当根：`check-entry-graphs` 靠 `NAVETI_CHECK_ROOT`，`check-ts-relative-imports` 靠 `process.cwd()`。

最后一列回答的是**这条守卫什么时候该消失**。它不是备注：`check-gate-registration` 要求每行都填，空着就红。只增不减的守卫最终会被人绕过，而绕过的习惯会传染给其它守卫。

### 未建的（每条都有触发条件，不是待办清单）

| 守卫 | 判据 | 建它的触发条件 |
| --- | --- | --- |
| `check-kernel-facade` | 产品侧只能从 `@naveti/host/extend/*` 的登记子路径取内核能力 | `platform/host/extend/` 建起来后 |
| `check-feature-registry` | 目录 ↔ manifest ↔ `compose.ts` 三方相等；seat 属于封闭枚举；壳文件无功能 id | 第二个功能出现时 |

### 不要生成器

**明确不要 `gen-paths.mjs`。** 生成 `tsconfig` 的 `paths` 与 vitest alias 有两个副作用：一是"加包后必须跑脚本才不飘红"，把 IDE 响应速度绑在脚本上；二是生成物与真实解析不一致时，红的是脚本而不是代码。解析问题的正确解法在 §11.1，守卫负责守住它。

唯一的生成器是 `gen-feature-index.mjs`（把 `compose.ts` 从 manifest 生成），出现条件是功能数超过约 20 或重复登记出过事故。它解决"登记重复"，不解决"解析漂移"。

### 13.1 测试位置与测试运行是两件事

- **位置**：测试在包内 `packages/**/test/`，夹具在 `test/fixtures/`。删包即删测试，不留孤儿——这条不因为下面的运行方式而改变。
- **运行**：根上一个 `vitest.config.ts`，用 `test.projects`（Vitest 3 起取代旧的 `vitest.workspace.ts`；本仓库已是 Vitest 4，旧写法已移除）按 glob 收集所有包，**单进程调度、文件级并行**。跑单包用 `vitest run --project <name>`。
- **为什么不能"测试在包里，所以每包一个 runner"**：旧做法是每包一次 `vitest`，包数 N 就启动 N 次、N 份 transform 缓存。30–50 个包时反馈时间线性增长，而这是每天要做几十次的动作。
- 包内 `vitest.config.ts` 只在确实需要特殊设置时存在，默认继承根配置。
- **隔离例外**：会 spy 全局定时器或共享模块状态的用例（现在 `chord` 有一个）单独放一个 project，只对它设 `isolate` / `--no-file-parallelism`，不要因此把整包改成串行。
- CI 的车道划分：`test-ci` 跑与本地同源的 `pnpm test:ci`（含 `pnpm smoke`），`durable-lanes` 只补 `test:ci` 不跑的 retention0 / store / workers；不再按目录循环。
- `durable` 的 `test` 只跑默认套件；`retention0` / `store` / `workers` 是显式 lane（`test:retention0` / `test:store` / `test:workers`），由 `durable-lanes` 跑，不要靠 `pnpm test` 全跑。

### 13.2 测试完整性：清单棘轮，不是上限

"每文件设一个 skip 上限 + 每项写 reason"不是最优解：上限是拍出来的数字，合法新增时要抬高，而抬高的那一步没有审查价值；reason 是自由文本，没人读。

改用**清单棘轮**：`scripts/test-integrity.json` 记录每个测试文件的 `tests / skips / conditionalSkips / helperSkips / todos`，任何变化都必须用 `pnpm run test-integrity:write` 重新生成，并**在同一个提交里出现**。那份 JSON diff 就是审查物：`env-node.test.ts: helperSkips 2 -> 5` 比一个被悄悄抬高的上限有用得多。

- **不需要基线的硬规则**：`.only` 直接红（它会让整轮只剩标记的用例）；`describe.skip` 直接红（整块消失）。`vitest.config.ts` 另设 `allowOnly: false` 做运行时兜底，防止绕过文本扫描。
- **允许的方向**：测试数可增、各类 skip 可减、新测试文件随便加。只有反方向红。
- **重构例外**：同一文件的 `each` 计数上升时，`tests` 下降不再算“删测试”，但仍必须跑 `--write` 重新基线；否则豁免会一直复用旧基线。JSON diff 是审查物。它仍然抓不到“加一个 `.each` 同时删掉更多用例”的具体数量，只能要求这次重基线被看见。
- **删文件**必须同步改基线，否则红——删除也是变更，必须进 diff。
- **局限（必须知道）**：这是文本计数，不是运行时统计。`.each` 重构会要求一次 `--write` 重基线，但“加一个 `.each` 同时删更多用例”的具体数量仍可能漏过；把断言从 `toBe(4)` 改成 `toBeGreaterThan(0)` 它**抓不到**。测试**质量**不属于这道守卫，只能靠黄金文件与人工验收。

## 14. 仓库级基础设施

这一层和 `packages/` 同等重要：它决定"人和 agent 进仓库后按什么规则干活"。

### `.github/workflows/`

| 文件 | 负责 | 需要改什么 |
| --- | --- | --- |
| `ci.yml` | `build-check`（build → check）+ `test-ci`（`pnpm test:ci` + `pnpm smoke`，与本地同源）+ `durable-lanes`（retention0 / store / workers） | 已转 pnpm；Ubuntu 已有两次实测（数字见 `docs/migration/baseline.md`） |
| `pr-title.yml` | PR 标题格式：`type(scope): 摘要` | 不动 |
| `deps-audit.yml` | 生产依赖公告审计（定时） | 已转 pnpm：`pnpm install --frozen-lockfile` + `node scripts/deps-audit.mjs`。npm 的 `audit signatures` 步骤已删——pnpm 无等价命令，锁文件完整性由安装本身保证 |
| `pr-gate.yml` | PR 门槛 | 不动 |
| `issue-gate.yml` | issue 准入门槛 | 不动 |
| `issue-triage-labels.yml` | 自动打标签 | 不动 |
| `approve-contributor.yml` | 贡献者准入（配 `APPROVED_CONTRIBUTORS`） | 不动 |
| `remove-inprogress-on-close.yml` | 关闭时清理标签 | 不动 |

**待建：`desktop-release.yml`** —— build → 打包 → 签名 → 上传。触发条件：第一个能装的 exe 出现时。上签名证书后此文件是唯一发布路径。

### `.githooks/`

不用 husky 依赖，只把 `core.hooksPath` 指到仓库里的目录（`pnpm run hooks:install`，故意不进 `postinstall`）。

| 钩子 | 跑什么 | 为什么是这个范围 |
| --- | --- | --- |
| `pre-commit` | biome **检查**（不写盘）、依赖钉版、相对导入、入口图、工作区解析、锁文件一致性、测试清单棘轮 | 只要秒级。钩子里的格式化会改文件，改完就提交等于提交了没审查的内容 |
| `pre-push` | `pnpm check`（加 tsc 与守卫红例） | 离机前把静态门禁跑完 |
| 不跑 | 测试 | `pnpm test:ci` 约 4.5 分钟且需要 build，留给 CI |

两个坑：钩子必须在索引里是 `100755`，否则 Linux/macOS 上静默不执行（Git for Windows 不看这个位，本机测不出来）；`pre-commit` 里**不能**用 `biome --write`，它会改文件，改完就提交等于提交了没审查过的内容。

### `.agents/`

| 路径 | 负责 | 出现时机 |
| --- | --- | --- |
| `notes/proposed/` | 未定的决定 | 第一条需要记录的决定出现时（本文与 `KERNEL.md` 的这次改动本身就是决定） |
| `notes/implemented/` | 已实施的决定 | 同上 |
| `notes/archived/` | 被取代的决定（保留不删） | 同上 |
| `notes/rejected/` | 被拒绝的决定 + 理由 | 同上 |
| `skills/<name>/SKILL.md` | 仓库级 agent skill：把"加一个功能包"这类多步流程固化成可复用指令 | 同一步骤被手工做过 3 次 |

四态子目录的规则：一条决定一个文件，命名 `<日期>-<slug>.md`，字段固定 **背景 / 决定 / 被拒绝的替代方案 / 后果**。`rejected/` 比其余三栏加起来都值钱——它是唯一能防止同一个争论重复半年的东西。

**规模控制：** 只在"改了边界、改了内核语义、新增一个 seat、新增一条守卫"时记录。普通功能设计写功能 README，不进 notes，否则 notes 会变成第二套文档反过来拖慢开发。

决策记录**只放 `.agents/notes/`**，不在 `docs/` 下另开 `decisions/`——两处就是两套真相。

### `AGENTS.md` 与 `CLAUDE.md`

| 文件 | 负责 | 纪律 |
| --- | --- | --- |
| 根 `AGENTS.md` | agent 在本仓库的硬约束：读文档顺序、位置对照表、依赖方向、加功能流程、改内核流程、禁止事项、验收命令 | 只写"必须"与"指针"，不复制本文表格 |
| `packages/AGENTS.md` [未建] | 包级补充规则（导出形态、测试位置、README 要求） | 第一个自研包落地时建 |
| `CLAUDE.md` | 一句话指针：规则见 `AGENTS.md` | 永远不放第二份规则 |
| `.claude/skills` [未建] | 符号链接 → `../.agents/skills` | 与 `.agents/skills` 同时建，不做第二份 |

### `docs/`

只放长期权威文档（`README.md`、本文、`architecture.md`、`plan/`、`kernel/*`、`migration/*`）。临时分析、方案草稿、会议结论不放这里——它们属于 `.agents/notes/` 或直接消失。文件数与新文件的门槛见 [`docs/README.md`](./README.md)。

### `scripts/`

清单用 `ls scripts/` 看，本节只记分类与纪律（不在这里数个数）。

| 类 | 脚本 | 职责 |
| --- | --- | --- |
| 格式 | `biome-check.mjs` | 调 biome，`--write` 时兼作格式化 |
| 检查 | `check-pinned-deps.mjs` / `.test.mjs` | 依赖版本钉死 |
| 检查 | `check-runtime-deps.mjs` / `.test.mjs` | 运行时依赖闭包 |
| 检查 | `check-vitest-projects.mjs` / `.test.mjs` | 根项目的 glob 只能收配置文件或包目录 |
| 检查 | `check-doc-links.mjs` / `.test.mjs` | 本文档体系里的 markdown 链接必须能解析 |
| 检查 | `check-doc-counts.mjs` / `.test.mjs` | 规则文档不携带清单数（`docs/migration/` 除外） |
| 检查 | `check-parked-triggers.mjs` / `.test.mjs` | 推迟的点子必须可被叫醒，且带可推翻的前提 |
| 检查 | `check-gate-registration.mjs` / `.test.mjs` | 守卫本身不得漏登记（缺红例 / 不在链里 / 不在本文） |
| 审计 | `deps-audit.mjs` / `.test.mjs` + `deps-audit-accept.json` | 生产依赖公告；要联网所以不进 `check`，定时跑；豁免是一条带理由的数据行 |
| 检查 | `check-ts-relative-imports.mjs` / `.test.mjs` | 相对导入不跨包 |
| 检查 | `check-entry-graphs.mjs` / `.test.mjs` + `entry-budgets.json` | 入口值导入图预算；`--update` 重写 `maxFiles` |
| 检查 | `check-workspace-resolution.mjs` / `.test.mjs` | 内部依赖必须 `workspace:*`、`exports` 带首位的 `source` 条件、`tsconfig` 无 `paths`、vitest 无 `@naveti` alias |
| 检查 | `check-package-layers.mjs` / `.test.mjs` | 包之间的依赖方向：kernel 不依赖产品层、contracts 只依赖内核声明层、platform 不依赖 feature、feature 不依赖内核 |
| 检查 | `check-client-face.mjs` / `.test.mjs` | 功能的 client 面不加载 `node:*`、`@naveti/host` 或同包 host 面 |
| 检查 | `check-lockfile-commit.mjs` / `.test.mjs` | 清单依赖段与 `pnpm-lock.yaml` 必须同进同退 |
| 检查 | `check-test-integrity.mjs` / `.test.mjs` + `test-integrity.json` | 测试清单棘轮：`.only` / `describe.skip` 直接红，测试数不得减、skip 不得增 |
| 检查 | `check-kernel-divergence.mjs` / `.test.mjs` + `kernel-baseline.json` | 内核与基线不一致的每个文件都必须在 `divergence.md` 或 `deviations.md` 被命名；基线同时记录上游独有的路径，所以“恢复了上游文件”不会被当成普通新增 |
| 测试编排 | `hermetic-env.mjs` | 移植上游 `test.sh` 的密封环境：临时 HOME/TMP、无 API key、不读用户 git/npm 配置、`TZ=UTC LANG=C` |
| 仓库 | `install-hooks.mjs` | 把 `core.hooksPath` 指到 `.githooks/`；故意不进 `postinstall` |
| 检查 | `model-catalog-protocol.ts` / `.test.ts` | 模型目录协议校验 |
| 测试编排 | `run-tests.mjs` | 全量测试（Windows 上唯一受支持方式） |
| 迁移 | `rename-scope.mjs`、`scope-rules.mjs`、`sync-upstream.mjs` | 作用域改名、规则表、上游对照 |
| 发布 | `package-workspaces.mjs`、`release-packages.mjs`、`deps-audit.mjs` / `.test.mjs` | 打包、发布、依赖审计（`deps-audit` 要联网，不进 `check`；它的夹具走 `NAVETI_AUDIT_REPORT`） |

新增脚本必须落在其中一类，并更新 `package.json` 的 `check` 或 CI。

### `tests/`

只放跨包的公共资产：`smoke/`（现有）+ `golden/`（首次内核改动、回补，或 durable 里第一次出现产品自己的数据结构时，以 `plan/master-plan.md` 的触发表为准）。功能自己的夹具留在功能包内。

## 15. 目录出现时机

判据不是版本号，是**第一个消费者出现**。没有消费者就建 = 空壳。

具体的触发条件表、阶段顺序与验收 gate 都在 [`plan/master-plan.md`](./plan/master-plan.md)：它们是会变的，所以不住在本文。

`deploy/`、`docker/` 不在 §16 的禁令里：第一次出安装包时，如果发布路径需要它们，按 `plan/master-plan.md` 的 P3 触发条件再建。

## 16. 明确不建

| 不建 | 原因 |
| --- | --- |
| `packages/product/` 单包 | "功能变包"之后它只剩反作用：把包边界退化成目录边界 |
| 与 `packages/` 并列的第三种顶层目录（`product/`、`src/`、`modules/`） | 会让 workspace 成员散落在两种形态里，且要同步改四处配置 |
| 按能力类型横切的 `kernel/` + `capabilities/` 分组 | 那是上一版散落的来源；归属按"谁拥有"分，不按"能力像什么"分 |
| `plugins/` 运行期插件层 | 编译期内置已由 `features/` 承载；再开一层会得到两套生命周期。§8 已写清它的真实边界 |
| `docs/decisions/` | 决策记录的唯一落点是 `.agents/notes/` |
| `evals/`、`profiles/`、`rfcs/`、`infra/`、`examples/` | 没有当前消费者（`packages/durable/test/examples/` 已有可跑样例） |
| 仓库级 `snapshots/` | 黄金文件放 `tests/golden/`，功能夹具放功能内 |
| 每包一份 `tsconfig.build.json` | 发布期由根上单个 `tsdown` 入口按 manifest 打包（§11） |
| `gen-paths.mjs`（生成 `paths`/alias 的脚本） | 它把"能不能正确解析"变成"有没有跑脚本"，见 §13 |
| 任何标了 `[未建]` 的目录先建空壳 | 空目录会让“结构已完成”与“结构已规划”无法区分 |

`deploy/`、`docker/` 不在这里：它们由 P3 的发布路径决定，见 §15 与 [`plan/master-plan.md`](./plan/master-plan.md)。

## 17. 权威分工

| 文档 | 唯一负责的说法 |
| --- | --- |
| `KERNEL.md` | 内核能不能改、分档门槛、分歧账本、上游回补政策 |
| `docs/kernel/seats.md` | 有哪些扩展点、机制是什么、谁在用 |
| `docs/kernel/divergence.md` | 我们改了内核哪些地方、为什么 |
| `NOTICE.md` | 许可与来源 |
| `docs/migration/*` | 来源、偏离清单、什么算绿、回补怎么跑 |
| `docs/README.md` | 哪类问题去问哪篇文档（导航） |
| `docs/structure.md`（本文） | 文件放哪、什么不该建 |
| `docs/architecture.md` | 运行时怎么运转（分层、一次提交的路径、信任边界） |
| `docs/product.md` | 做什么、先做哪个、什么不做（产品目标与功能优先级） |
| `docs/plan/master-plan.md` | 阶段、目录出现时机、待决项 |
| `docs/plan/parked.md` | 推迟的事：它们的触发条件、复核日期与当时依赖的前提 |
| `docs/learn/` | 怎么学会读这个项目（读者材料；不是权威，冲突时以本节其它文档为准） |
| `packages/features/*/naveti.feature.json` | 该功能提供什么 |
| `apps/server/src/compose.ts` | 系统里到底装了哪些功能 |
| `packages/features/*/README.md` | 该功能的唯一契约说明 |
| `AGENTS.md` | agent 在本仓库必须遵守的硬约束 |
| `.agents/notes/README.md` | 决策记录的写法与四态规则 |
| `README.md` | 一句话定位 |

## 18. 待决项

技术选型的待决（桌面外壳、`node:sqlite` 退路、远程鉴权、`compose.ts` 生成化时机等）全部在 [`plan/master-plan.md`](./plan/master-plan.md) 的「待决」表；本文不重复，因为那些是会变的。

唯一属于“结构规则”且尚未闭合的一条：**内核是否拆包**。判据是“连续若干次改动都只落在 `durable` 的同一个子目录”，满足才拆，不拆就先靠门面与账本控制半径。
