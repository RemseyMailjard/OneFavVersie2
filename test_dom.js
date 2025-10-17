const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = process.cwd();
const htmlPath = path.resolve(root, "index.html");

const vconsole = new VirtualConsole();
vconsole.on("log", (...args) => {
  console.log("[page]", ...args);
});
vconsole.on("error", (...args) => {
  console.error("[page][error]", ...args);
});

(async () => {
  const dom = new JSDOM(fs.readFileSync(htmlPath, "utf8"), {
    runScripts: "dangerously",
    resources: "usable",
    url: "file://" + htmlPath,
    virtualConsole: vconsole,
    beforeParse(window) {
      // Provide a simple file-based fetch for JSON files
      const fetch = (resource) => {
        try {
          const resolved = new URL(resource, "file://" + htmlPath).pathname;
          const txt = fs.readFileSync(resolved, "utf8");
          return Promise.resolve({ ok: true, json: () => JSON.parse(txt) });
        } catch (err) {
          return Promise.resolve({ ok: false, status: 404 });
        }
      };
      window.fetch = fetch;
      // minimal stubs
      window.matchMedia = () => ({
        matches: false,
        addListener: () => {},
        removeListener: () => {},
      });
      window.open = (url) => console.log("[page] window.open ->", url);
      // ensure localStorage exists
      // jsdom has a storage, so nothing to do
    },
  });

  // Wait for scripts to run
  await new Promise((resolve) => setTimeout(resolve, 500));

  const doc = dom.window.document;

  // Ensure some pinned apps exist (if none, create a simple custom app and pin it)
  let pinned = dom.window.localStorage.getItem("pinnedApps");
  if (!pinned) {
    const defaultPinned = ["ChatGPT"];
    dom.window.localStorage.setItem(
      "pinnedApps",
      JSON.stringify(defaultPinned)
    );
    console.log("[test] Set default pinnedApps ->", defaultPinned);
  }

  // Ensure inline favs toggle is on
  dom.window.localStorage.setItem("showInlineFavs", "true");

  // Re-invoke renderInlineFavs if available
  if (typeof dom.window.renderInlineFavs === "function") {
    dom.window.renderInlineFavs();
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const container = doc.getElementById("inlineFavsContainer");
  if (!container) {
    console.error("[test] inlineFavsContainer not found");
    process.exit(2);
  }

  console.log("[test] inlineFavsContainer.className=", container.className);
  console.log("[test] inlineFavsContainer.innerHTML=");
  console.log(container.innerHTML);

  // Exit
  process.exit(0);
})();
