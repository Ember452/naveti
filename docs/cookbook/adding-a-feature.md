# 加一个功能

> **状态：目标形状。** `packages/platform/host/extend/` 与第一个功能都还不存在（见 [`plan/master-plan.md`](../plan/master-plan.md) P2）。
> 门面落地、`packages/features/chat` 建起来之后，本文的最小示例要替换成那份真实代码，并把下面的"目标形状"提示删掉。
> 在那之前，引用这里的导入路径是不成立的——本文描述的是**一个功能必须长成什么样**，不是一套已经可调的 API。

## 最小形状

一个功能是**一个 workspace 包**，三个出口面：宿主面、`./contract`、客户端面。

```text
packages/features/chat/
├── package.json          exports: "." / "./contract" / "./client" / "./manifest"
├── naveti.feature.json   { id, contract, seats, requires, provides }
├── README.md             五行契约：拥有什么 / 可 import 什么 / 占哪些 seat / 依赖谁 / 删掉会怎样
└── src/
    ├── contract.ts       wire 类型 + 本功能服务接口（无运行时、无 node、无 react）
    ├── shared.ts         纯函数，前后端共用
    ├── host/index.ts     默认导出 defineFeature(...)
    └── client/index.ts   register(slots)
```

宿主面只经门面取内核能力，不 import 内核包名：

```ts
// 目标形状：门面尚未建立，这些导入在 P2 之前不成立。
import { defineFeature } from "@naveti/host/extend";
import { defineDoc } from "@naveti/host/extend/docs";
import { defineTool } from "@naveti/host/extend/tools";

export default defineFeature({
	id: "chat",
	seats: { host: ["doc", "tool"], client: [] },
	install(ctx) {
		// 状态先定 scope，再写别的（见下面的第 1 条）。
		const draft = defineDoc("chat.draft", { scope: "conversation" });

		ctx.tools.register(
			defineTool({
				name: "chat_open",
				description: "在聊天里打开一条草稿。",
				parameters: { draftId: { type: "string", required: true } },
				execute: async (args) => draft.read(args.draftId),
			}),
		);
	},
});
```

字段名和签名以门面落地时的 `contract.ts` 为准；这里固定的是**结构**，不是 API。

## 六条硬规则

1. **状态住 doc，scope 先选对。** `session` / `conversation` / `task` 三选一，取舍表在 [`kernel/seats.md`](../kernel/seats.md) §4。选错不会报错：放进 `session` 的会话数据会在两个会话间互相污染，放进 `conversation` 的用户偏好会在新会话里消失。
2. **契约先定型，且远程安全。** `contract.ts` 里不放 `Date` 对象、不放函数、id 是不透明字符串——手机远程上线时不需要回来改每一个功能。
3. **一个贡献点一个文件。** 单文件约 200 行再拆子目录，不预先拆。
4. **不自开传输通道。** 功能状态通过已有的 watch / snapshot 面到达前端；自己开一条 IPC 或轮询就是第二个真相。
5. **装配不改壳。** 壳文件里出现功能 id 即失败；功能的唯一外部痕迹是 `compose.ts` 的一行。
6. **删得掉。** 删这个功能 = 删包 + 删 `compose.ts` 一行。需要动别处，说明放错了。

## 验证

```bash
pnpm check      # 结构、依赖方向、文档链接、内核账本
pnpm test:ci    # 门禁测试；先 pnpm build，它按 dist 解析工作区包
```

功能包内 `test/host.spec.ts` 是必需的；有界面再加 `client.spec.tsx`。测试与夹具住包内 `test/`，运行由根上单个进程统一调度（见 [`structure.md`](../structure.md) §13.1）。

## 改内核时

功能需要门面没有的能力时，正确的动作是**给门面加子路径并在 `kernel/seats.md` 登记**，而不是在本功能里深引内核。若这确实改了内核行为，按 [`KERNEL.md`](../../KERNEL.md) §2 定档并在 [`kernel/divergence.md`](../kernel/divergence.md) 记一条——`check-kernel-divergence` 会拦住没有账本的改动。

## 删掉它

```text
删 packages/features/<id>/
删 compose.ts 里的一行
删 naveti.feature.json 登记的 seat（如果该 seat 只被它用）
```

这三步做完还剩下什么，就是当初放错的东西。
