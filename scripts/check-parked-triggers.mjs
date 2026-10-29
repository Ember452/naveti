#!/usr/bin/env node
/**
 * Parked ideas must have a wake-up condition, an expiry review, and a premise to
 * re-check — because "useful later" is a guess, and the guess is what expires.
 *
 * A plain list of deferred ideas fails in two directions. It is never noticed when
 * the moment arrives, and it is never deleted when the reason it seemed worth doing
 * turns out to have been wrong. So every entry needs all three lines:
 *
 *   条件：the machine-checkable trigger   `<glob> >= n` | `path_exists <path>` | `仅复核`
 *   复核：review_by <YYYY-MM-DD>          the backstop when the trigger never fires
 *   前提：the belief that made this worth parking, stated so a future reader can
 *                                          falsify it against reality, not against this file
 *
 * `条件：仅复核` is allowed for the honest case where nothing observable marks the
 * moment — the idea then wakes only at its review date. Inventing a filesystem proxy
 * for a non-observable trigger would be false precision, and the review date is what
 * keeps such an entry from becoming a zombie.
 *
 * When the guard goes red it demands a decision in the same change: do it, change the
 * condition with a reason, or delete it because 前提 no longer holds. "Leave it parked"
 * is not one of the three.
 */
import { existsSync, globSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = process.env.NAVETI_CHECK_ROOT ? resolve(process.env.NAVETI_CHECK_ROOT) : process.cwd();
const FILE = join(ROOT, "docs", "plan", "parked.md");
const TODAY = new Date().toISOString().slice(0, 10);

const FIELDS = {
	condition: /条件：(.+)$/m,
	review: /复核：(.+)$/m,
	premise: /前提：(.+)$/m,
};

function field(lines, key) {
	return FIELDS[key].exec(lines)?.[1]?.replaceAll("`", "").trim();
}

/** Parse `### title` blocks under `## 条目`. */
function entries(text) {
	const body = text.split(/^## 条目$/m)[1] ?? "";
	return body
		.split(/^### /m)
		.slice(1)
		.map((block) => {
			const [titleLine, ...rest] = block.split("\n");
			const lines = rest.join("\n");
			return {
				title: titleLine.trim(),
				condition: field(lines, "condition"),
				review: field(lines, "review"),
				premise: field(lines, "premise"),
				criteria: /判断依据：/.test(lines),
			};
		});
}

/** A condition or review date that has arrived. */
function fired(expression) {
	const count = /^(.+?)\s*>=\s*(\d+)$/.exec(expression ?? "");
	if (count) {
		const matched = globSync(count[1].trim(), { cwd: ROOT });
		return {
			met: matched.length >= Number(count[2]),
			detail: `${count[1].trim()} 当前命中 ${matched.length} 个（阈值 ${count[2]}）`,
		};
	}
	const exists = /^path_exists\s+(\S+)$/.exec(expression ?? "");
	if (exists) {
		const present = existsSync(join(ROOT, ...exists[1].split("/")));
		return { met: present, detail: present ? `${exists[1]} 已存在` : `${exists[1]} 还不存在` };
	}
	const review = /^review_by\s+(\d{4}-\d{2}-\d{2})$/.exec(expression ?? "");
	if (review) {
		return {
			met: TODAY >= review[1],
			detail: TODAY >= review[1] ? `复核日期 ${review[1]} 已到（今天 ${TODAY}）` : undefined,
		};
	}
	return { met: false, detail: undefined, invalid: true };
}

if (!existsSync(FILE)) {
	console.error("docs/plan/parked.md is missing; parked ideas have nowhere to wake up");
	process.exit(1);
}

const parsed = entries(readFileSync(FILE, "utf8"));
const problems = [];

for (const entry of parsed) {
	const missing = [];
	if (!entry.condition) missing.push("条件");
	if (!entry.review) missing.push("复核");
	if (!entry.premise) missing.push("前提");
	if (!entry.criteria) missing.push("判断依据");
	if (missing.length > 0) {
		problems.push(`「${entry.title}」缺少 ${missing.join("、")}——这条点子要么永远不会被叫醒，要么无法被作废`);
		continue;
	}

	for (const [kind, expression] of [["触发条件", entry.condition], ["到期复核", entry.review]]) {
		if (kind === "触发条件" && expression === "仅复核") continue;
		const result = fired(expression);
		if (result.invalid) {
			problems.push(`「${entry.title}」的${kind}无法判定：\`${expression}\`（只支持 <glob> >= n、path_exists、review_by、仅复核）`);
			continue;
		}
		if (!result.met) continue;
		problems.push(
			[
				`「${entry.title}」的${kind}成立：${result.detail}`,
				`      当时写下的前提：${entry.premise}`,
				`      先按现实检验这个前提，再在同一个改动里三选一：做 / 改条件并写下理由 / 作废（前提已被推翻，在 .agents/notes/ 留一条）`,
			].join("\n"),
		);
	}
}

if (problems.length > 0) {
	for (const problem of problems) console.error(problem);
	console.error(`\n${problems.length} problem(s) in docs/plan/parked.md (${parsed.length} entries read).`);
	process.exit(1);
}

console.log(`${parsed.length} parked idea(s) armed with a trigger and an expiry date; none reached, all premises intact.`);
