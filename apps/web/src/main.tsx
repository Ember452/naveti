// The browser entry: fill the seat table from compose, then hand it to the shell with the address of the host.
//
// The address is what the server printed (`ws://127.0.0.1:PORT/?token=…`), passed as `?url=`. A dev run can pin it in
// VITE_NAVETI_URL instead, so reloading the tab does not lose it.
import { AppFrame, createSlots } from "@naveti/web";
import { createRoot } from "react-dom/client";
import { compose } from "./compose.ts";

/// <reference types="vite/client" />

const { registry, slots } = createSlots();
for (const entry of compose) (await entry.client()).register(registry);

const printed = new URLSearchParams(window.location.search).get("url") ?? import.meta.env.VITE_NAVETI_URL;
const root = document.getElementById("root");
if (root === null) throw new Error("index.html has no #root");

createRoot(root).render(<AppFrame slots={slots} url={printed ?? undefined} />);
