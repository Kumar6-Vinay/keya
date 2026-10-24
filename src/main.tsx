import { render } from "preact";
import { App } from "./app";
import "./styles.css";

render(<App />, document.getElementById("root")!);

// Offline play: register the service worker in the installable build (not in previews or dev).
if (import.meta.env.PROD && import.meta.env.MODE !== "single" && "serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => { /* app still works online */ });
}
