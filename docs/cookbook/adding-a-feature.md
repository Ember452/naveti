# 加一个功能

> 本文的最小示例是 `packages/features/chat` 的真实代码（P2）。与它不一致的示例都是错的。

## 最小形状

一个功能是**一个 workspace 包**：宿主面、`./client` 面与 `./manifest`。wire 契约不在包里——它住
`@naveti/contracts`，因为宿主与客户端都要持有它，而平台不允许 import 功能。

```text
packages/features/chat/
├── package.json          exports: "." → src/host/index.ts / "./client" / "./manifest"
├── naveti.feature.json   { id, contract, seats, requires, provides }
├── README.md             五行契约：拥有什么 / 可 import 什么 / 占哪些 seat / 依赖谁 / 删掉会怎样
└── src/
    ├── host/index.ts     默认导出 defineFeature(...)
    ├── host/doc.ts       功能的 doc（scope 三选一）
    ├── host/hub.ts       一个贡献点一个文件
    ├── host/conversation.ts
    ├── host/section.ts
    ├── client/index.ts   只 register(slots)
    └── client/panel.tsx  界面
```

宿主面只经门面取内核能力，不 import 内核包名：

```ts
// packages/features/chat/src/host/index.ts
export default defineFeature({
	id: "chat",
	install(ctx) {
		ctx.sections.add(chatSection);
		ctx.serve(ChatHub, hubFactory);
		ctx.serve(ChatConversation, conversationFactory);
	},
	async start({ harness, model, context }) {
		// 在开始监听之前跑：第一个客户端总能找到要打开的会话。
		await ensureRoot(harness, model, context);
	},
});
```

一个 served 工厂里，`self` 上是宿主替它打开的 harness、默认模型与 `follow` / `derive` / `get`，没有别的：

```ts
// packages/features/chat/src/host/conversation.ts
export const conversationFactory: FeatureFactory<typeof ChatConversation> = ({ conversation }, _principal, self) => ({
	variant: "owner",
	members: {
		view: self.follow((observer, context) => self.harness.observeConversation(id, observer, context, { min: 50 })),
		submit: async ({ content }, context) => {
			const target = await self.harness.conversation(id, context);
			if (target === undefined) throw new Error(`Conversation ${conversation} does not exist`);
			await target.submit({ type: "input", content }, context);
			return null;
		},
	},
});
```

客户端面只往 seat 里注册；界面里不出现其他功能，壳里不出现本功能：

```ts
// packages/features/chat/src/client/index.ts
export function register(slots: SlotRegistry): void {
	slots.renderers.add("naveti.assistant", AssistantEntry);
	slots.renderers.add("naveti.tool-result", ToolResultEntry);
	slots.panels.add(ChatPanel);
}
```

## 六条硬规则

1. **状态住 doc，scope 先选对。** `session` / `conversation` / `task` 三选一，取舍表在 [`kernel/seats.md`](../kernel/seats.md) §4。选错不会报错：放进 `session` 的会话数据会在两个会话间互相污染，放进 `conversation` 的用户偏好会在新会话里消失。`chat` 的会话列表是 `session`，它的第二条测试就是为这条写的（第二个会话里仍看得见两个会话）。
2. **契约先定型，且远程安全。** 契约在 `@naveti/contracts`：不放 `Date` 对象、不放函数、id 用不透明值；`view` 的形状就是内核的 `ConversationView`，不另立一套 DTO。
3. **一个贡献点一个文件。** 单文件约 200 行再拆子目录，不预先拆。
4. **不自开传输通道。** state 经 `self.follow` 变成 served 对象的成员；客户端经 `@naveti/web` 的那一条连接订阅。自己开 IPC 或轮询就是第二个真相。
5. **装配不改壳。** 壳（`apps/web/src/main.tsx`、`packages/platform/web/src/app-frame.tsx`）里出现功能 id 即失败；功能的唯一外部痕迹是两份 compose 的一行（宿主与客户端各一行）。
6. **删得掉。** 见下。

## 验证

```bash
pnpm check      # 结构、依赖方向、入口预算、文档链接、内核账本、两套 tsc
pnpm test:ci    # 门禁测试；先 pnpm build，它按 dist 解析工作区包
```

功能包内 `test/host.spec.ts` 是必需的；有界面再加 `test/client.spec.tsx`（`jsdom`，文件头写
`// @vitest-environment jsdom`）。测试与夹具住包内 `test/`，运行由根上单个进程统一调度（见
[`structure.md`](../structure.md) §13.1）。wire 契约改了要同时更新 `tests/golden/` 的黄金文件。

## 改内核时

功能需要门面没有的能力时，正确的动作是**给门面加子路径并在 `kernel/seats.md` 登记**，而不是在本功能里深引内核。若这确实改了内核行为，按 [`KERNEL.md`](../../KERNEL.md) §2 定档并在 [`kernel/divergence.md`](../kernel/divergence.md) 记一条——`check-kernel-divergence` 会拦住没有账本的改动。

## 删掉它

```text
删 packages/features/<id>/
删 apps/server/src/compose.ts 的一行（宿主）
删 apps/web/src/compose.ts 的一行（客户端）
删 apps/*/package.json 里对该包的依赖声明
跑 pnpm install 与 pnpm run test-integrity:write（生成物：锁文件、测试清单）
```

**判据不是"这几行"，而是"平台代码有没有动"**：`packages/platform/*` 一行不改，才算放对了。`chat` 在 P2 验收时实测如此——删包 + 两行 + 两处依赖声明 + 生成物，`pnpm check` 全绿。
