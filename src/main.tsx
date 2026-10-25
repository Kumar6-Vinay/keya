import { render } from "preact";
import { App } from "./app";
import "@fontsource/baloo-2/latin-600.css";
import "@fontsource/baloo-2/latin-700.css";
import "@fontsource/baloo-2/devanagari-600.css";
import "@fontsource/baloo-2/devanagari-700.css";
import "@fontsource/mukta/latin-400.css";
import "@fontsource/mukta/latin-700.css";
import "@fontsource/mukta/devanagari-400.css";
import "@fontsource/mukta/devanagari-700.css";
import "./styles.css";

render(<App />, document.getElementById("root")!);

// Offline play: register the service worker in the installable build (not in previews or dev).
if (import.meta.env.PROD && import.meta.env.MODE !== "single" && "serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => { /* app still works online */ });
}
