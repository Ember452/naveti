# docs 导航

`docs/` 只放**描述**：系统怎么运转、放哪、为什么这么定。
**规矩**放根目录，因为它们是 agent 与贡献者的第一道门。

## 谁回答什么

| 问题 | 文档 | 位置 |
| --- | --- | --- |
| 我作为 agent 必须遵守什么 | `AGENTS.md` | 根 |
| 内核能改到什么程度、怎么记账 | `KERNEL.md` | 根 |
| 我要提交代码，门槛是什么 | `CONTRIBUTING.md` | 根 |
| 怎么报漏洞 | `SECURITY.md` | 根 |
| 这个文件该放哪、什么还不该建 | [`structure.md`](./structure.md) | docs |
| 系统现在怎么运转 | [`architecture.md`](./architecture.md) | docs |
| 接下来做什么、按什么顺序 | [`plan/master-plan.md`](./plan/master-plan.md) | docs |
| 有哪些扩展点、机制是什么 | [`kernel/seats.md`](./kernel/seats.md) | docs |
| 内核被动过哪些地方 | [`kernel/divergence.md`](./kernel/divergence.md) | docs |
| 来源、偏离、什么算绿、怎么回补 | [`migration/`](./migration/) | docs |
| 某条决定为什么这样定 | `.agents/notes/` | 根 |

## 四条写文档的规矩

1. **一篇文档回答一个读者问题。** 写不出一句"它回答什么"，说明它该拆。
2. **不在文档里写状态。** "有几个脚本""守卫几条""某目录是否存在"由 `ls`、`git ls-files`、`package.json` 回答；文档只写**规则**与**为什么**。写进去的那一刻就开始漂移。
3. **不出现"将来会有"的目录。** 未建的东西只出现在 `plan/master-plan.md` 的出现时机表里，不画进目录树。
4. **同一个事实只有一处权威。** 引用写"见 X"，不复制正文。

## 容量

`docs/` 长期不超过 **15 个文件**（连 `diffs/` 与 `.json` 算）。超过说明有内容该回包内：包自己的契约写进包 README，测试夹具进包内 `test/`，决策进 `.agents/notes/`。

每个新文件必须能回答：**它替谁省掉了什么问题？** 答不出来就不建。

## 与 `.agents/notes/` 的分工

`docs/` 写"现在成立的事实与规则"，会随代码更新；`.agents/notes/` 写"某天为什么选了这条路"，只追加不改写。两者都不写对方的内容。
