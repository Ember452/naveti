# 清单、manifest 与目录首次变成机检：check-feature-registry

- 背景：`structure.md` §8 一直写着"三方必须双向相等，由 `check-feature-registry` 机检"，而那个守卫不存在。后果已经量过两次：`naveti.feature.json` 是一份没人读的文件；`seats.ts` 的 `isHostSeat` / `isClientSeat` / `FeatureSeats` 三个函数零消费者；审计时发现文档把 `hook` / `wrap` / `task` 写成"机制已有"，而 `FeatureContext` 根本没有对应挂点——没有任何东西会拦下一个功能声明 `seats: ["hook"]`。
- 决定：P2 之后立刻补建，不等"第二个功能出现"。三条关系被分别写死：
  1. 目录 ↔ manifest ↔ `apps/server/src/compose.ts` 双向相等；
  2. 功能 `exports["./client"]` ⇔ 出现在 `apps/web/src/compose.ts`；
  3. `apps/web` 的 id 集合 ⊆ `apps/server` 的 id 集合。
  外加 `seats` 必须落在 `seats.ts` 的闭集里（读该文件解析，不复制第二份枚举）、`requires` 必须指向已装功能。
- 被拒绝的替代方案：
  - **两份 compose 相等**：`structure.md` §8 自己说两面独立（"一个功能可以有宿主面而没有界面"），相等会在第一个无界面功能出现时误报。写成子集后，第四个用例专门证明"只有宿主面的功能必须通过"。
  - **把 seat 闭集抄一份进守卫**：那就出现第二个真相，`seats.ts` 加一项而守卫忘改时，两边都不报错。守卫直接读 `seats.ts` 的 `export const HOST_SEATS = [...]`。
  - **继续靠 review，把 §8 里"由 … 机检"改成"靠 review"**：三个对象都已存在（目录、manifest、两份清单），且失败形态是"功能只装了一半而所有门都绿"——这种失败人眼看不见（页面就是空的），必须让机器说。
- 后果：`master-plan` P4 不再列它；`seats.ts` 的枚举函数仍没有调用者（守卫解析源码，不 import），但"声明了不可占的 seat"这条已经有人拦。仍未机检的一条是"壳文件里不出现功能 id"——那需要壳里先出现过功能 id 才知道要拦什么，目前一处都没有。
