// The browser entry: fill the seat table from compose, then hand it to the shell with the host's address.
//
// The address is what the server printed (`ws://127.0.0.1:PORT/`), passed as `?url=`. The token is not in the URL: the
// shell asks for it, because a credential in a query string ends up in history, in logs and in every proxy in between.
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
