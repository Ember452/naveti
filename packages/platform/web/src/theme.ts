// The shell's stylesheet, kept as a string so the frame can inject it without a bundler-specific CSS pipeline.
// Deliberately small: a dark surface, a readable column, and the classes a panel may use.
export const theme = `
:root { color-scheme: dark; }
body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
.naveti { background: #101214; color: #e6e6e6; min-height: 100vh; box-sizing: border-box; }
.naveti-notice { display: grid; place-items: center; padding: 2rem; color: #9aa0a6; }
.naveti-token { display: flex; flex-direction: column; gap: 0.75rem; min-width: 22rem; }
.naveti-token input { padding: 0.5rem 0.6rem; border-radius: 0.4rem; border: 1px solid #2b3036; background: #161a1e; color: inherit; font: inherit; }
.naveti-token button { padding: 0.5rem; border-radius: 0.4rem; border: 1px solid #2b3036; background: #1e2227; color: inherit; cursor: pointer; }
.naveti-panel { display: grid; grid-template-columns: 16rem 1fr; min-height: 100vh; }
.naveti-list { border-right: 1px solid #23262a; padding: 0.75rem; overflow-y: auto; }
.naveti-list button { display: block; width: 100%; text-align: left; margin: 0 0 0.25rem; padding: 0.5rem 0.6rem; border: 0; border-radius: 0.4rem; background: transparent; color: inherit; cursor: pointer; }
.naveti-list button[aria-current="true"] { background: #1e2227; }
.naveti-list .title { font-size: 0.9rem; display: block; }
.naveti-list .when { font-size: 0.75rem; color: #7f868d; }
.naveti-transcript { padding: 1rem 1.25rem; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem; }
.naveti-entry { border: 1px solid #23262a; border-radius: 0.5rem; padding: 0.6rem 0.75rem; white-space: pre-wrap; }
.naveti-entry.tool { font-family: ui-monospace, "Cascadia Code", monospace; font-size: 0.85rem; color: #b8c0c8; }
.naveti-entry.tool header { color: #7fd1a3; margin-bottom: 0.35rem; }
.naveti-composer { display: flex; gap: 0.5rem; padding: 0.75rem 1.25rem 1.25rem; }
.naveti-composer textarea { flex: 1; min-height: 3.5rem; resize: vertical; padding: 0.5rem 0.6rem; border-radius: 0.4rem; border: 1px solid #2b3036; background: #161a1e; color: inherit; font: inherit; }
.naveti-composer button { padding: 0 1rem; border-radius: 0.4rem; border: 1px solid #2b3036; background: #1e2227; color: inherit; cursor: pointer; }
`;
