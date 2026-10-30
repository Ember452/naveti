# 门面的认知面积实测：它今天只换了名字，没有压缩阅读量

- 背景：parked「门面入口的认知面积预算」的触发条件是 `packages/platform/host/src/extend` 出现，判断依据写的是"若 `@naveti/host/extend/tools` 实测超过 12 个文件，先拆门面，不放宽预算"。P2 把门面建起来，`node scripts/check-entry-graphs.mjs --update` 给出实测：`./extend/tools`、`./extend/docs`、`./extend/prompt` 各 **87** 个文件（`maxFiles = ceil(77 × 1.1)`），而内核 `@naveti/durable` 的根入口本身是 86。`./extend` 与 `./extend/serve` 只有 2–3 个文件，因为它们只引用类型（`import type` 在值导入图里被抹掉）。`@naveti/contracts` 的两个入口是 172/174 个文件，原因相同。
- 决定：**前提被证实**（门面与内核父入口同量级），但条目写的补救办法"拆门面"无效——宽度不在门面子路径，而在 `export { defineTool } from "@naveti/durable"` 这一行：它把内核的**根 barrel** 拖了进来。真正的补救是给内核加窄子路径（`@naveti/durable/define`、`/types`、`/docs` 之类），让门面每一行都从一个窄入口取符号。所以本条目改为带日期的复核项，补救搬进 P4（与 `check-kernel-facade` 同一轮），不在 P2 夹带内核改动——改内核要账本、要 golden、要按档位验收，那是另一轮的成本。
- 被拒绝的替代方案：
  - **现在放宽预算到 87**：那等于把"没有压缩"写成规则，守卫从此不再回答"门面变胖了吗"。
  - **现在给内核加子路径**：P2 的红线是"需要改内核才能跑通就停下报告"。这里不需要改内核也能跑通，只是读起来宽；夹带一次内核 `exports` 改动会让本次提交多出账本、基线与档位验收。
  - **让门面直接深引 `@naveti/durable/src/harness/define.ts`**：深路径引用是红的（`structure.md` §7 规则 5），且那是把包边界换成目录边界。
- 后果：`scripts/entry-budgets.json` 现在记下真实数字（87 / 174 / 274），所以它们只可能变小，不会悄悄变大。P4 的判定很具体：把每个 `extend/*` 子路径压到 12 以下，或者确认内核已用别的方式收窄，届时作废本条目并把结论写进 `structure.md` §6。今天的读者仍要为 `defineTool` 的类型打开内核的 `types.ts`——门面省下的是"该从哪个包 import"，不是"要读多少行"。
