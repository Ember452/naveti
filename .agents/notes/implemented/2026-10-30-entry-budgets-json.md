# 入口预算搬到 JSON，并用 --update 维护

- 背景：`check-entry-graphs` 的 `maxFiles` 是手写常量，durable 根入口实测 78、预算也是 78，加一条合法 import 就红；调整一次要改代码、写一段解释预算由来的注释。只覆盖 ai/codemode/durable 三个包。
- 决定：预算移到 `scripts/entry-budgets.json`；`--update` 对每个预算取该预算下所有展开入口的最大图，写 `ceil(measured * 1.1)`，保留 `forbid`/`allow`；JSON diff 就是审查物。首次更新给每个入口 10% 余量。
- 被拒绝的替代方案：
  - **只加 10% 余量、仍留在代码里。** 下次增长还是手改数字；没有审查物。
  - **删掉 `maxFiles` 只留 `forbid`。** 会失去“入口被 barrel 拖大”的体积信号。
  - **`--update` 按最后一个展开入口写。** `./utils/*` 会展开成多个入口，最后一个不是最大的；实测会写出过小预算并立刻红。
- 后果：预算增长是一次可审的 JSON diff；`forbid`/`allow` 仍是手工契约。未纳入预算的包仍然不受体积约束，新增预算需要一次有意的决定。
