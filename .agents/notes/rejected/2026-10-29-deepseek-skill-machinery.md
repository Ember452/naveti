# 不移植 DeepSeek 的 skill 运行时与维护机器

- 背景：DeepSeek harness 有一套完整技能机制（`skill` / `skill-filesystem` / `skill-office` / `tool-skill` 四个包、invocation 策略守卫、从人工评审反馈生成技能增量的流水线，21 个技能）。naveti 要考虑的是：哪些现在借、哪些将来借、哪些不借。
- 决定：**只借判据，不借载体。**
  - 不建 `packages/skill*` 之类的技能运行时包。技能的运行时是**产品能力**，将来出现时应是 `packages/features/<id>` 的一个功能（有自己的 manifest、seats、contract），不是根目录的第 N 种形态。
  - 不建"从人工评审反馈生成技能"的流水线（双 reviewer、有界复评、promote 时比对 blob、不入库的私有工具 + designated operator）。它服务的是"62 PR / 426 条人工反馈"的量级，而本仓库没有外生评审流：`pr-gate.yml` 在，但没有"评审者提出 → 代码采纳"的证据对。
  - 不自动把经验总结成 skill。`.agents/notes/`（决策，只追加）与 `.agents/skills/`（流程，可执行）门禁不同，混起来就是第二套文档。
  - 不拷任何 `dsh-*` 正文。它们硬链本仓路径（`../../../docs/defensive-patterns/…`），拷进来等于新增第 10 处会漂移的真相。
- 被拒绝的替代方案：
  - **"频次到 3 就建 skill"直接照搬 DeepSeek 的"单次采纳证据即可"**。它的前提是存在采纳证据链；单人仓库里没有，所以频次仍是唯一可得的代理——但要求每条 skill 的规则**链到本仓库的真实 commit 或既有章节**（这是可以立刻照搬的那一半）。
  - **现在就建 invocation 策略一致性守卫**。它守的是"同一技能在两个 agent 产品里暴露方式一致"，naveti 只有 `.agents/skills` 一处，无对齐对象。触发条件：出现第二套暴露策略。
- 后果：采纳清单与触发条件记在 [`docs/plan/master-plan.md`](../../../docs/plan/master-plan.md) 的「外部设计参考」，不留在对话里。第一个真正建的 skill（`add-a-guard`）已按"出处只写 commit hash 与章节号"的格式落地。
