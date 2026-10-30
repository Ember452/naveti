// The facade: what a feature is allowed to see of the kernel. Every export here is a name the kernel already owns;
// nothing in this file adds behavior. Features import `@naveti/host/extend/*` and never a kernel package name
// (structure.md §6), which is what lets the kernel be refactored without touching a single feature.
//
// A subpath appears only when a feature needs it. Tasks, hooks and wraps have no consumer yet; adding them is a
// facade change, and a facade change is the designed way for the kernel's surface to reach the product layer.

export type { Principal } from "@naveti/contracts/transport";
export { defineFeature, type Feature, type FeatureContext } from "./feature.ts";
export type { Contract, FollowAttach, Implementation, ParamsOf, Reference, Watchable } from "./serve.ts";
export type { Context, Harness, JsonObject } from "./types.ts";
