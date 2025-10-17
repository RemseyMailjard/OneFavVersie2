// Global state
let allApps = [];
let customApps = [];
let pinnedApps = [];
let collections = [];
let appStats = {}; // Usage statistics
let selectedColor = "blue";
let selectedCollectionColor = "blue";
let currentCategory = "all";
let editingCollectionId = null;

// AI Mode state
let currentAIMode = "gpt"; // Default: ChatGPT
const aiModes = {
  google: { name: "Google", prefix: "g:", icon: "🔍", color: "text-blue-600" },
  gpt: { name: "ChatGPT", prefix: "gpt:", icon: "🤖", color: "text-green-600" },
  claude: {
    name: "Claude",
    prefix: "claude:",
    icon: "🧠",
    color: "text-purple-600",
  },
  gemini: {
    name: "Gemini",
    prefix: "gemini:",
    icon: "✨",
    color: "text-blue-600",
  },
  perplexity: {
    name: "Perplexity",
    prefix: "perplexity:",
    icon: "🔮",
    color: "text-indigo-600",
  },
};

// Search engine shortcuts
const searchEngines = {
  "g:": { name: "Google", url: "https://www.google.com/search?q=", icon: "🔍" },
  "yt:": {
    name: "YouTube",
    url: "https://www.youtube.com/results?search_query=",
    icon: "▶️",
  },
  "gpt:": { name: "ChatGPT", url: "https://chat.openai.com/?q=", icon: "🤖" },
  "claude:": { name: "Claude", url: "https://claude.ai/new?q=", icon: "🧠" },
  "gemini:": {
    name: "Gemini",
    url: "https://gemini.google.com/app?q=",
    icon: "✨",
  },
  "perplexity:": {
    name: "Perplexity",
    url: "https://www.perplexity.ai/?q=",
    icon: "🔮",
  },
  "gh:": { name: "GitHub", url: "https://github.com/search?q=", icon: "💻" },
  "x:": { name: "X (Twitter)", url: "https://x.com/search?q=", icon: "🐦" },
  "reddit:": {
    name: "Reddit",
    url: "https://www.reddit.com/search/?q=",
    icon: "📱",
  },
  "wiki:": {
    name: "Wikipedia",
    url: "https://en.wikipedia.org/wiki/Special:Search?search=",
    icon: "📚",
  },
  "maps:": {
    name: "Google Maps",
    url: "https://www.google.com/maps/search/",
    icon: "🗺️",
  },
  "translate:": {
    name: "Google Translate",
    url: "https://translate.google.com/?text=",
    icon: "🌐",
  },
};

// App menu toggle functionaliteit
document.addEventListener("DOMContentLoaded", async () => {
  const appMenuBtn = document.getElementById("appMenuBtn");
  const appMenu = document.getElementById("appMenu");
  const themeToggle = document.getElementById("themeToggle");
  const settingsBtn = document.getElementById("settingsBtn");

  if (!appMenuBtn || !appMenu) {
    console.error("App menu elementen niet gevonden");
    return;
  }

  // Laad theme eerst (sync)
  loadTheme();
  console.log("✅ Theme geladen");

  // Laad apps eerst (async) - DIT MOET EERST!
  await loadApps();
  console.log("✅ Apps geladen - allApps.length:", allApps.length);

  // Dan pas collections laden (heeft apps nodig)
  await loadCollections();
  console.log(
    "✅ Collections geladen - collections.length:",
    collections.length
  );

  // En dan andere sync functies
  loadPinnedApps();
  loadCustomApps();
  console.log("✅ Pinned apps en custom apps geladen");

  // Setup event listeners
  setupEventListeners();
  setupKeyboardShortcuts();
  setupHomePageAutocomplete();
  setupAIModeButton();
  console.log("✅ Event listeners ingesteld");

  // Initialize UI systems
  setupTagSuggestions();
  setupShowTagsToggle();
  setupUseFaviconsToggle();
  setupGridSizeToggle();
  setupHighlightSearchToggle();
  setupShowShortcutsToggle();
  setupShowAppsDashboardToggle();
  setupContextMenu();
  setupAppsDashboardMinimize();
  setupAppsDashboardDrag();
  renderAppsDashboard();
  console.log("✅ UI systems geïnitialiseerd");

  // Make functions globally available for inline onclick handlers
  window.openCollection = openCollection;
  window.editCollection = editCollection;
  window.deleteCollection = deleteCollection;

  console.log("🎉 Initialisatie compleet!");
});
/**
 * Setup alle event listeners
 */
function setupEventListeners() {
  const appMenuBtn = document.getElementById("appMenuBtn");
  const appMenu = document.getElementById("appMenu");
  const searchInput = document.getElementById("appSearch");
  const resetBtn = document.getElementById("resetOrder");
  const themeToggle = document.getElementById("themeToggle");
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsModal = document.getElementById("settingsModal");
  const closeSettings = document.getElementById("closeSettings");
  const addCustomApp = document.getElementById("addCustomApp");
  const customAppModal = document.getElementById("customAppModal");
  const cancelCustomApp = document.getElementById("cancelCustomApp");
  const customAppForm = document.getElementById("customAppForm");
  const exportBtn = document.getElementById("exportConfig");
  const importBtn = document.getElementById("importConfig");

  // Zoekfunctionaliteit - Handled by setupAutocomplete()
  // (Event listener moved to setupAutocomplete for autocomplete integration)

  // Reset button
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      resetAppOrder();
    });
  }

  // Theme toggle
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }

  // Settings
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      const isHidden = settingsModal?.classList.contains("hidden");
      settingsModal?.classList.remove("hidden");
      settingsModal?.classList.add("flex");
      settingsBtn.setAttribute("aria-expanded", "true");
    });
  }

  if (closeSettings) {
    closeSettings.addEventListener("click", () => {
      settingsModal?.classList.add("hidden");
      settingsModal?.classList.remove("flex");
      settingsBtn?.setAttribute("aria-expanded", "false");
    });
  }

  // Custom app modal
  if (addCustomApp) {
    addCustomApp.addEventListener("click", () => {
      customAppModal?.classList.remove("hidden");
      customAppModal?.classList.add("flex");
    });
  }

  if (cancelCustomApp) {
    cancelCustomApp.addEventListener("click", () => {
      customAppModal?.classList.add("hidden");
      customAppModal?.classList.remove("flex");
      customAppForm?.reset();
    });
  }

  if (customAppForm) {
    customAppForm.addEventListener("submit", handleCustomAppSubmit);
  }

  // Color picker
  document.querySelectorAll(".color-picker").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document
        .querySelectorAll(".color-picker")
        .forEach((b) => b.classList.remove("ring-4"));
      e.currentTarget.classList.add("ring-4");
      selectedColor = e.currentTarget.getAttribute("data-color");
    });
  });

  // Collection color picker
  document.querySelectorAll(".collection-color-picker").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document
        .querySelectorAll(".collection-color-picker")
        .forEach((b) => b.classList.remove("ring-4"));
      e.currentTarget.classList.add("ring-4");
      selectedCollectionColor = e.currentTarget.getAttribute(
        "data-collection-color"
      );
    });
  });

  // Collections Modal
  const collectionsBtn = document.getElementById("collectionsBtn");
  const collectionsModal = document.getElementById("collectionsModal");
  const closeCollections = document.getElementById("closeCollections");
  const createCollectionBtn = document.getElementById("createCollectionBtn");
  const collectionFormModal = document.getElementById("collectionFormModal");
  const cancelCollection = document.getElementById("cancelCollection");
  const collectionForm = document.getElementById("collectionForm");

  if (collectionsBtn) {
    collectionsBtn.addEventListener("click", () => {
      collectionsModal?.classList.remove("hidden");
      collectionsModal?.classList.add("flex");
      collectionsBtn.setAttribute("aria-expanded", "true");
      renderCollectionsList();
    });
  }

  if (closeCollections) {
    closeCollections.addEventListener("click", () => {
      collectionsModal?.classList.add("hidden");
      collectionsModal?.classList.remove("flex");
      collectionsBtn?.setAttribute("aria-expanded", "false");
    });
  }

  if (createCollectionBtn) {
    createCollectionBtn.addEventListener("click", () => {
      editingCollectionId = null;
      document.getElementById("collectionFormTitle").textContent =
        "Nieuwe Collection";
      collectionForm?.reset();
      selectedCollectionColor = "blue";
      renderAppSelectionList();
      collectionFormModal?.classList.remove("hidden");
      collectionFormModal?.classList.add("flex");
    });
  }

  if (cancelCollection) {
    cancelCollection.addEventListener("click", () => {
      collectionFormModal?.classList.add("hidden");
      collectionFormModal?.classList.remove("flex");
      editingCollectionId = null;
    });
  }

  if (collectionForm) {
    collectionForm.addEventListener("submit", handleCollectionSubmit);
  }

  // Export/Import
  if (exportBtn) {
    exportBtn.addEventListener("click", exportConfiguration);
  }

  if (importBtn) {
    importBtn.addEventListener("click", importConfiguration);
  }

  // Toggle menu bij klik op waffel button
  appMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isHidden = appMenu.classList.contains("hidden");

    if (isHidden) {
      appMenu.classList.remove("hidden");
      appMenu.classList.add("menu-enter");
      appMenuBtn.setAttribute("aria-expanded", "true");
      setTimeout(() => searchInput?.focus(), 100);
    } else {
      appMenu.classList.add("hidden");
      appMenu.classList.remove("menu-enter");
      appMenuBtn.setAttribute("aria-expanded", "false");
      if (searchInput) searchInput.value = "";
      filterApps("");
    }
  });

  // Sluit menu als je ergens anders klikt
  document.addEventListener("click", (e) => {
    if (!appMenuBtn.contains(e.target) && !appMenu.contains(e.target)) {
      appMenu.classList.add("hidden");
      appMenu.classList.remove("menu-enter");
      appMenuBtn.setAttribute("aria-expanded", "false");
      if (searchInput) searchInput.value = "";
      filterApps("");
    }
  });

  // Sluit menu met ESC toets
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!appMenu.classList.contains("hidden")) {
        appMenu.classList.add("hidden");
        appMenu.classList.remove("menu-enter");
        appMenuBtn.setAttribute("aria-expanded", "false");
        appMenuBtn.focus();
        if (searchInput) searchInput.value = "";
        filterApps("");
      }

      // Sluit modals
      if (settingsModal && !settingsModal.classList.contains("hidden")) {
        settingsModal.classList.add("hidden");
        settingsModal.classList.remove("flex");
        settingsBtn?.setAttribute("aria-expanded", "false");
      }
      customAppModal?.classList.add("hidden");
      customAppModal?.classList.remove("flex");
      const collectionsModal = document.getElementById("collectionsModal");
      if (collectionsModal && !collectionsModal.classList.contains("hidden")) {
        collectionsModal.classList.add("hidden");
        collectionsModal.classList.remove("flex");
        collectionsBtn?.setAttribute("aria-expanded", "false");
      }
      const collectionFormModal = document.getElementById(
        "collectionFormModal"
      );
      collectionFormModal?.classList.add("hidden");
      collectionFormModal?.classList.remove("flex");
    }
  });

  // Setup drag & drop zone voor apps grid
  setupDropZone();

  // Setup autocomplete for search
  setupAutocomplete();
}

/**
 * Setup drop zone voor het slepen van links naar de app grid
 */
function setupDropZone() {
  const appsGrid = document.getElementById("appsGrid");
  const appMenu = document.getElementById("appMenu");

  if (!appsGrid || !appMenu) return;

  // Prevent default drag over hele document
  document.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  document.addEventListener("drop", (e) => {
    e.preventDefault();
  });

  // Link Dropzone handlers (dedicated drop area)
  const linkDropzone = document.getElementById("linkDropzone");

  if (linkDropzone) {
    linkDropzone.addEventListener("dragenter", (e) => {
      e.preventDefault();
      // Check if it's an external drag (not a sortable drag)
      const isDraggingApp = e.dataTransfer.types.includes("text/html");
      if (!isDraggingApp) {
        linkDropzone.classList.add("drag-over");
      }
    });

    linkDropzone.addEventListener("dragleave", (e) => {
      e.preventDefault();
      // Only remove when actually leaving the dropzone
      if (
        e.target === linkDropzone ||
        !linkDropzone.contains(e.relatedTarget)
      ) {
        linkDropzone.classList.remove("drag-over");
      }
    });

    linkDropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      // Only allow external links, not internal app drags
      const isDraggingApp = e.dataTransfer.types.includes("text/html");
      if (!isDraggingApp) {
        e.dataTransfer.dropEffect = "copy";
      } else {
        e.dataTransfer.dropEffect = "none";
      }
    });

    linkDropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      linkDropzone.classList.remove("drag-over");

      // Haal URL op uit drop data
      const url =
        e.dataTransfer.getData("text/uri-list") ||
        e.dataTransfer.getData("text/plain");

      if (url && url.startsWith("http")) {
        // Extraheer domein naam voor app naam
        try {
          const urlObj = new URL(url);
          const hostname = urlObj.hostname.replace("www.", "");
          const appName = hostname.split(".")[0];
          const capitalizedName =
            appName.charAt(0).toUpperCase() + appName.slice(1);

          // Open custom app modal met pre-filled data
          const customAppModal = document.getElementById("customAppModal");
          const nameInput = document.getElementById("customAppName");
          const urlInput = document.getElementById("customAppUrl");

          if (nameInput) nameInput.value = capitalizedName;
          if (urlInput) urlInput.value = url;

          customAppModal?.classList.remove("hidden");
          customAppModal?.classList.add("flex");

          console.log(
            `✅ Link gedropt in dropzone: ${capitalizedName} - ${url}`
          );
          showToast("🔗 Link toegevoegd - pas aan indien nodig");

          // Focus op naam input voor aanpassing
          setTimeout(() => nameInput?.focus(), 100);
        } catch (error) {
          console.error("Ongeldige URL gedropt:", error);
          showToast("✗ Ongeldige URL");
        }
      }
    });
  }
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Normalize key to avoid case issues
    const key = e.key ? e.key.toLowerCase() : "";

    // Ctrl/Cmd + K - Open Command Palette
    if ((e.ctrlKey || e.metaKey) && key === "k") {
      e.preventDefault();
      openCommandPalette();
      return;
    }

    // Ctrl/Cmd + M - Toggle main menu
    if ((e.ctrlKey || e.metaKey) && key === "m") {
      e.preventDefault();
      document.getElementById("appMenuBtn")?.click();
      return;
    }

    // Ctrl/Cmd + Shift + A - Add custom app
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "a") {
      e.preventDefault();
      const customAppModal = document.getElementById("customAppModal");
      customAppModal?.classList.remove("hidden");
      customAppModal?.classList.add("flex");
      return;
    }

    // Ctrl/Cmd + Shift + D - Toggle theme
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "d") {
      e.preventDefault();
      toggleTheme();
      return;
    }

    // Ctrl/Cmd + G - Open Collections
    if ((e.ctrlKey || e.metaKey) && key === "g") {
      e.preventDefault();
      const collectionsModal = document.getElementById("collectionsModal");
      const isHidden = collectionsModal?.classList.contains("hidden");
      if (isHidden) {
        collectionsModal?.classList.remove("hidden");
        collectionsModal?.classList.add("flex");
        renderCollectionsList();
      } else {
        collectionsModal?.classList.add("hidden");
        collectionsModal?.classList.remove("flex");
      }
      return;
    }

    // Ctrl/Cmd + Q - Toggle Apps Dashboard
    if ((e.ctrlKey || e.metaKey) && key === "q") {
      e.preventDefault();
      const dashboard = document.getElementById("appsDashboardWidget");
      const toggle = document.getElementById("showAppsDashboardToggle");

      if (dashboard && toggle) {
        const isHidden = dashboard.classList.contains("hidden");
        if (isHidden) {
          dashboard.classList.remove("hidden");
          toggle.checked = true;
          localStorage.setItem("showAppsDashboard", "true");
          renderAppsDashboard();
        } else {
          dashboard.classList.add("hidden");
          toggle.checked = false;
          localStorage.setItem("showAppsDashboard", "false");
        }
      }
      return;
    }
  });
}

/**
 * Laad apps vanuit JSON bestand en render ze in het menu
 */
async function loadApps() {
  try {
    const response = await fetch("apps.json");

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Update menu titel
    const menuTitle = document.querySelector("#appMenu .text-sm");
    if (menuTitle && data.title) {
      menuTitle.textContent = data.title;
    }

    allApps = data.apps;

    // Load custom apps from localStorage
    const savedCustomApps = localStorage.getItem("customApps");
    if (savedCustomApps) {
      customApps = JSON.parse(savedCustomApps);
      allApps = [...allApps, ...customApps];
    }

    // Update counter
    updateAppCounter(allApps.length);

    // Setup categories
    setupCategories(allApps);

    // Render apps
    renderApps(allApps);
    renderPinnedApps();
    // renderCollectionsQuickAccess(); // Wordt nu aangeroepen na loadCollections()

    // Initialiseer sortable na het renderen
    initSortable();
  } catch (error) {
    console.error("Fout bij laden van apps:", error);
    showErrorMessage();
  }
}

/**
 * Setup category filter
 */
function setupCategories(apps) {
  const categoryFilter = document.getElementById("categoryFilter");
  if (!categoryFilter) return;

  // Category emoji mapping
  const categoryEmojis = {
    all: "📱",
    favorieten: "⭐",
    "ai-tools": "🤖",
    "ai-agents": "🧠",
    "microsoft-365": "🏢",
    windows: "🪟",
    "social-media": "💻",
  };

  // Get unique categories
  const categories = [...new Set(apps.map((app) => app.category || "other"))];

  // Keep "Alle" button, add other categories
  const allBtn = categoryFilter.querySelector('[data-category="all"]');

  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.setAttribute("data-category", cat);
    btn.className =
      "category-btn whitespace-nowrap rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300";

    // Format category name with emoji
    const emoji = categoryEmojis[cat] || "📦";
    const displayName = cat
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    btn.textContent = `${emoji} ${displayName}`;

    btn.addEventListener("click", () => filterByCategory(cat));

    categoryFilter.appendChild(btn);
  });

  // All button handler - update with emoji
  if (allBtn) {
    allBtn.textContent = "📱 Alle apps";
    allBtn.addEventListener("click", () => filterByCategory("all"));
  }
}

/**
 * Filter apps by category
 */
function filterByCategory(category) {
  currentCategory = category;

  // Update active button
  document.querySelectorAll(".category-btn").forEach((btn) => {
    btn.classList.remove("active", "bg-blue-500", "text-white");
    btn.classList.add(
      "bg-gray-200",
      "text-gray-700",
      "dark:bg-gray-700",
      "dark:text-gray-300"
    );
  });

  const activeBtn = document.querySelector(`[data-category="${category}"]`);
  if (activeBtn) {
    activeBtn.classList.add("active", "bg-blue-500", "text-white");
    activeBtn.classList.remove(
      "bg-gray-200",
      "text-gray-700",
      "dark:bg-gray-700",
      "dark:text-gray-300"
    );
  }

  // Filter apps
  if (category === "all") {
    renderApps(allApps);
  } else {
    const filtered = allApps.filter((app) => app.category === category);
    renderApps(filtered);
  }
}

/**
 * Render apps in het grid
 */
function renderApps(apps) {
  const appsGrid = document.querySelector("#appsGrid");

  if (!appsGrid) {
    console.error("Apps grid container niet gevonden");
    return;
  }

  // Leeg de grid eerst
  appsGrid.innerHTML = "";

  // Pas opgeslagen volgorde toe
  const sortedApps = applySavedOrder(apps);

  // Filter out pinned apps
  const unpinnedApps = sortedApps.filter((app) => !isPinned(app.name));

  // Maak voor elke app een button element
  unpinnedApps.forEach((app) => {
    const appButton = createAppButton(app);
    appsGrid.appendChild(appButton);
  });

  if (unpinnedApps.length === 0) {
    appsGrid.innerHTML = `
      <div class="col-span-4 py-8 text-center">
        <p class="text-sm text-gray-500 dark:text-gray-400">Geen apps in deze categorie</p>
      </div>
    `;
  }
}

/**
 * Render pinned apps
 */
function renderPinnedApps() {
  const pinnedSection = document.getElementById("pinnedSection");
  const pinnedAppsGrid = document.getElementById("pinnedApps");

  if (!pinnedAppsGrid || !pinnedSection) return;

  const pinned = allApps.filter((app) => isPinned(app.name));

  if (pinned.length === 0) {
    pinnedSection.classList.add("hidden");
    return;
  }

  pinnedSection.classList.remove("hidden");
  pinnedAppsGrid.innerHTML = "";

  pinned.forEach((app) => {
    const appButton = createAppButton(app, true);
    pinnedAppsGrid.appendChild(appButton);
  });
}

/**
 * Check if app is pinned
 */
function isPinned(appName) {
  return pinnedApps.includes(appName);
}

/**
 * Toggle pin status
 */
function togglePin(appName) {
  const index = pinnedApps.indexOf(appName);

  if (index > -1) {
    pinnedApps.splice(index, 1);
  } else {
    pinnedApps.push(appName);
  }

  savePinnedApps();
  renderApps(
    allApps.filter(
      (app) => currentCategory === "all" || app.category === currentCategory
    )
  );
  renderPinnedApps();
  renderAppsDashboard(); // Update Apps Dashboard
}

/**
 * Save pinned apps
 */
function savePinnedApps() {
  localStorage.setItem("pinnedApps", JSON.stringify(pinnedApps));
}

/**
 * Load pinned apps
 */
function loadPinnedApps() {
  const saved = localStorage.getItem("pinnedApps");
  if (saved) {
    pinnedApps = JSON.parse(saved);
  }
}

/**
 * Maak een app button element
 */
function createAppButton(app, isPinnedButton = false) {
  const button = document.createElement("button");
  button.className =
    "app-item flex flex-col items-center gap-2 rounded-lg p-3 text-center transition hover:bg-gray-50 cursor-grab active:cursor-grabbing relative group dark:hover:bg-gray-700";
  button.setAttribute("aria-label", `Open ${app.name}`);
  button.setAttribute("data-name", app.name);

  // Maak app draggable naar desktop
  button.setAttribute("draggable", "true");
  button.addEventListener("dragstart", (e) => {
    if (app.url) {
      // Stel data in voor drag naar desktop
      e.dataTransfer.effectAllowed = "copyLink";
      e.dataTransfer.setData("text/uri-list", app.url);
      e.dataTransfer.setData("text/plain", app.url);
      e.dataTransfer.setData(
        "DownloadURL",
        `application/internet-shortcut:${app.name}.url:${app.url}`
      );

      // Visual feedback
      button.style.opacity = "0.5";
      console.log(`🔗 Drag started: ${app.name} - ${app.url}`);
    }
  });

  button.addEventListener("dragend", (e) => {
    button.style.opacity = "1";
  });

  // Pin indicator
  if (isPinned(app.name) && !isPinnedButton) {
    const pinBadge = document.createElement("div");
    pinBadge.className = "absolute top-1 right-1 text-yellow-500";
    pinBadge.innerHTML = "📌";
    button.appendChild(pinBadge);
  }

  // Context menu (rechtermuisklik)
  button.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    showContextMenu(e, app.name);
  });

  // Voeg tooltip toe als er een URL is
  if (app.url) {
    const tooltip = document.createElement("div");
    tooltip.className =
      "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block pointer-events-none z-50";
    tooltip.innerHTML = `
      <div class="bg-gray-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg dark:bg-gray-700">
        ${new URL(app.url).hostname}
        <div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
      </div>
    `;
    button.appendChild(tooltip);

    button.addEventListener("click", (e) => {
      if (!button.classList.contains("sortable-drag")) {
        trackAppUsage(app.name); // Track usage
        window.open(app.url, "_blank");
      }
    });
  }

  // Icon container
  const iconContainer = document.createElement("div");
  iconContainer.className = `flex h-12 w-12 items-center justify-center rounded-full ${app.color.bg}`;

  // Check if favicons are enabled
  const useFavicons = localStorage.getItem("useFavicons") !== "false";

  // Try to use favicon if enabled and URL is available, otherwise use SVG
  if (useFavicons && app.url) {
    try {
      const url = new URL(app.url);
      const domain = url.hostname;

      // Create favicon img element
      const favicon = document.createElement("img");
      favicon.className = "h-8 w-8 rounded-sm";
      favicon.alt = `${app.name} icon`;

      // Try Google's favicon service first
      favicon.src = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;

      // Fallback to SVG on error
      favicon.addEventListener("error", () => {
        // Remove failed favicon
        favicon.remove();

        // Create SVG fallback
        const svg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg"
        );
        svg.setAttribute("class", `h-6 w-6 ${app.color.text}`);
        svg.setAttribute("fill", "currentColor");
        svg.setAttribute("viewBox", app.icon.viewBox);

        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        path.setAttribute("d", app.icon.path);

        svg.appendChild(path);
        iconContainer.appendChild(svg);
      });

      iconContainer.appendChild(favicon);
    } catch (error) {
      // Invalid URL, use SVG
      console.warn(`Invalid URL for ${app.name}, using SVG icon`);
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", `h-6 w-6 ${app.color.text}`);
      svg.setAttribute("fill", "currentColor");
      svg.setAttribute("viewBox", app.icon.viewBox);

      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      path.setAttribute("d", app.icon.path);

      svg.appendChild(path);
      iconContainer.appendChild(svg);
    }
  } else {
    // No URL, use SVG icon
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", `h-6 w-6 ${app.color.text}`);
    svg.setAttribute("fill", "currentColor");
    svg.setAttribute("viewBox", app.icon.viewBox);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", app.icon.path);

    svg.appendChild(path);
    iconContainer.appendChild(svg);
  }

  // Label
  const label = document.createElement("span");
  label.className = "text-xs font-medium text-gray-700 dark:text-gray-300";
  label.textContent = app.name;

  button.appendChild(iconContainer);
  button.appendChild(label);

  // Add tag badges if enabled
  const showTags = localStorage.getItem("showTags") !== "false";
  if (showTags && app.tags && app.tags.length > 0) {
    const tagsContainer = document.createElement("div");
    tagsContainer.className = "flex flex-wrap gap-1 justify-center mt-1";

    // Show max 3 tags to avoid clutter
    const visibleTags = app.tags.slice(0, 3);
    visibleTags.forEach((tag) => {
      const tagBadge = document.createElement("span");
      tagBadge.className =
        "text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full";
      tagBadge.textContent = tag;
      tagsContainer.appendChild(tagBadge);
    });

    button.appendChild(tagsContainer);
  }

  return button;
}

/**
 * Show context menu
 */
// Context Menu State
let contextMenuState = {
  currentApp: null,
  isOpen: false,
};

/**
 * Show context menu
 */
function showContextMenu(e, appName) {
  e.preventDefault();

  const contextMenu = document.getElementById("contextMenu");
  if (!contextMenu) return;

  // Find the app
  const app = allApps.find((a) => a.name === appName);
  if (!app) return;

  // Store current app
  contextMenuState.currentApp = app;
  contextMenuState.isOpen = true;

  // Update pin button text
  const isPinnedNow = isPinned(appName);
  const contextPinText = document.getElementById("contextPinText");
  if (contextPinText) {
    contextPinText.textContent = isPinnedNow ? "Losmaken" : "Vastmaken";
  }

  // Position the menu
  const menuWidth = 200;
  const menuHeight = 250;
  let x = e.pageX;
  let y = e.pageY;

  // Check if menu would go off-screen
  if (x + menuWidth > window.innerWidth) {
    x = window.innerWidth - menuWidth - 10;
  }
  if (y + menuHeight > window.innerHeight) {
    y = window.innerHeight - menuHeight - 10;
  }

  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;

  // Show menu
  contextMenu.classList.remove("hidden");

  // Close on outside click
  setTimeout(() => {
    document.addEventListener("click", closeContextMenu, { once: true });
    document.addEventListener("contextmenu", closeContextMenu, { once: true });
  }, 0);
}

/**
 * Close context menu
 */
function closeContextMenu() {
  const contextMenu = document.getElementById("contextMenu");
  if (contextMenu) {
    contextMenu.classList.add("hidden");
  }
  contextMenuState.currentApp = null;
  contextMenuState.isOpen = false;
}

/**
 * Setup context menu actions
 */
function setupContextMenu() {
  const contextEdit = document.getElementById("contextEdit");
  const contextPin = document.getElementById("contextPin");
  const contextAddToWorkspace = document.getElementById(
    "contextAddToWorkspace"
  );
  const contextCopyUrl = document.getElementById("contextCopyUrl");
  const contextDelete = document.getElementById("contextDelete");

  // Edit action
  if (contextEdit) {
    contextEdit.addEventListener("click", () => {
      if (contextMenuState.currentApp) {
        // Check if it's a custom app
        const customApp = customApps.find(
          (a) => a.name === contextMenuState.currentApp.name
        );
        if (customApp) {
          // Open edit modal (reuse add modal)
          openEditAppModal(customApp);
        } else {
          alert("Alleen custom apps kunnen worden bewerkt");
        }
      }
      closeContextMenu();
    });
  }

  // Pin/Unpin action
  if (contextPin) {
    contextPin.addEventListener("click", () => {
      if (contextMenuState.currentApp) {
        togglePin(contextMenuState.currentApp.name);
      }
      closeContextMenu();
    });
  }

  // Add to Workspace action
  if (contextAddToWorkspace) {
    contextAddToWorkspace.addEventListener("click", () => {
      if (contextMenuState.currentApp) {
        // Open collections modal to select workspace
        openAddToWorkspaceModal(contextMenuState.currentApp);
      }
      closeContextMenu();
    });
  }

  // Copy URL action
  if (contextCopyUrl) {
    contextCopyUrl.addEventListener("click", async () => {
      if (contextMenuState.currentApp && contextMenuState.currentApp.url) {
        try {
          await navigator.clipboard.writeText(contextMenuState.currentApp.url);
          // Show feedback
          showToast("✓ URL gekopieerd!");
        } catch (err) {
          console.error("Failed to copy URL:", err);
          showToast("✗ Kopiëren mislukt");
        }
      }
      closeContextMenu();
    });
  }

  // Delete action
  if (contextDelete) {
    contextDelete.addEventListener("click", () => {
      if (contextMenuState.currentApp) {
        deleteCustomApp(contextMenuState.currentApp.name);
      }
      closeContextMenu();
    });
  }

  // Close on ESC key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && contextMenuState.isOpen) {
      closeContextMenu();
    }
  });

  // Close on scroll
  document.addEventListener("scroll", () => {
    if (contextMenuState.isOpen) {
      closeContextMenu();
    }
  });
}

/**
 * Show toast notification
 */
function showToast(message) {
  // Remove existing toast
  const existingToast = document.getElementById("toast");
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement("div");
  toast.id = "toast";
  toast.className =
    "fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-lg shadow-lg z-[200] animate-toast";
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2000);
}

/**
 * Open Add to Workspace modal
 */
function openAddToWorkspaceModal(app) {
  const modal = document.getElementById("collectionsModal");
  if (!modal) return;

  // Store which app we're adding
  modal.dataset.addingApp = app.name;

  // Show modal
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  // Add info text
  const existingInfo = modal.querySelector(".adding-app-info");
  if (existingInfo) existingInfo.remove();

  const info = document.createElement("div");
  info.className =
    "adding-app-info bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-lg text-sm mb-4";
  info.textContent = `Selecteer een workspace om "${app.name}" aan toe te voegen`;

  const modalContent = modal.querySelector(".max-w-3xl");
  if (modalContent) {
    modalContent.insertBefore(info, modalContent.firstChild.nextSibling);
  }
}

/**
 * Open edit app modal
 */
function openEditAppModal(app) {
  const modal = document.getElementById("customAppModal");
  if (!modal) return;

  // Fill form with existing data
  document.getElementById("customAppName").value = app.name;
  document.getElementById("customAppUrl").value = app.url || "";
  document.getElementById("customAppCategory").value = app.category || "all";
  document.getElementById("customAppTags").value = app.tags
    ? app.tags.join(", ")
    : "";

  // Set color if available
  if (app.color && app.color.bg) {
    const colorMatch = app.color.bg.match(/bg-(\w+)-/);
    if (colorMatch) {
      selectedColor = colorMatch[1];
      // Update color picker visual
      document.querySelectorAll(".color-picker").forEach((picker) => {
        picker.classList.remove("ring-4", "ring-blue-300");
      });
      const activePicker = document.querySelector(
        `[data-color="${selectedColor}"]`
      );
      if (activePicker) {
        activePicker.classList.add("ring-4", "ring-blue-300");
      }
    }
  }

  // Store that we're editing (not adding new)
  modal.dataset.editing = app.name;

  // Update modal title
  const title = modal.querySelector("h3");
  if (title) {
    title.textContent = "App Bewerken";
  }

  // Show modal
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

/**
 * Delete custom app
 */
function deleteCustomApp(appName) {
  const index = customApps.findIndex((app) => app.name === appName);
  if (index > -1) {
    if (confirm(`Weet je zeker dat je "${appName}" wilt verwijderen?`)) {
      customApps.splice(index, 1);
      saveCustomApps();
      loadApps();
    }
  }
}

/**
 * Handle custom app form submit
 */
function handleCustomAppSubmit(e) {
  e.preventDefault();

  const modal = document.getElementById("customAppModal");
  const isEditing = modal.dataset.editing;

  const name = document.getElementById("customAppName").value;
  const url = document.getElementById("customAppUrl").value;
  const category = document.getElementById("customAppCategory").value;
  const tagsInput = document.getElementById("customAppTags").value;

  // Parse tags: split by comma, trim whitespace, filter empty strings
  const tags = tagsInput
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  const appData = {
    name,
    category,
    url,
    tags: tags.length > 0 ? tags : [],
    icon: {
      type: "svg",
      viewBox: "0 0 24 24",
      path: "M13 2L3 14h8l-2 8 10-12h-8l2-8z", // Lightning bolt icon
    },
    color: {
      bg: `bg-${selectedColor}-100`,
      text: `text-${selectedColor}-600`,
    },
  };

  if (isEditing) {
    // Update existing app
    const index = customApps.findIndex((app) => app.name === isEditing);
    if (index !== -1) {
      customApps[index] = appData;
      showToast("✓ App bijgewerkt!");
    }
    delete modal.dataset.editing;
  } else {
    // Add new app
    customApps.push(appData);
    showToast("✓ App toegevoegd!");
  }

  saveCustomApps();

  // Reset modal title
  const title = modal.querySelector("h3");
  if (title) {
    title.textContent = "Custom App Toevoegen";
  }

  // Close modal and reset form
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  document.getElementById("customAppForm").reset();

  // Reload apps
  loadApps();
}

/**
 * Save custom apps
 */
function saveCustomApps() {
  localStorage.setItem("customApps", JSON.stringify(customApps));
}

/**
 * Load custom apps
 */
function loadCustomApps() {
  const saved = localStorage.getItem("customApps");
  if (saved) {
    customApps = JSON.parse(saved);
  }
}

/**
 * Export configuration
 */
function exportConfiguration() {
  const config = {
    customApps,
    pinnedApps,
    collections,
    appOrder: localStorage.getItem("appOrder"),
    theme: localStorage.getItem("theme"),
  };

  const dataStr = JSON.stringify(config, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `onefav-config-${
    new Date().toISOString().split("T")[0]
  }.json`;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Import configuration
 */
function importConfiguration() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";

  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target.result);

        if (config.customApps) {
          localStorage.setItem("customApps", JSON.stringify(config.customApps));
        }
        if (config.pinnedApps) {
          localStorage.setItem("pinnedApps", JSON.stringify(config.pinnedApps));
        }
        if (config.collections) {
          localStorage.setItem(
            "customCollections",
            JSON.stringify(config.collections)
          );
        }
        if (config.appOrder) {
          localStorage.setItem("appOrder", config.appOrder);
        }
        if (config.theme) {
          localStorage.setItem("theme", config.theme);
        }

        alert("Configuratie succesvol geïmporteerd!");
        location.reload();
      } catch (error) {
        alert("Fout bij importeren: " + error.message);
      }
    };

    reader.readAsText(file);
  };

  input.click();
}

/**
 * Theme toggle
 */
function toggleTheme() {
  const html = document.documentElement;
  const sunIcon = document.getElementById("sunIcon");
  const moonIcon = document.getElementById("moonIcon");

  if (html.classList.contains("dark")) {
    html.classList.remove("dark");
    localStorage.setItem("theme", "light");
    sunIcon?.classList.remove("hidden");
    moonIcon?.classList.add("hidden");
  } else {
    html.classList.add("dark");
    localStorage.setItem("theme", "dark");
    sunIcon?.classList.add("hidden");
    moonIcon?.classList.remove("hidden");
  }
}

/**
 * Load theme
 */
function loadTheme() {
  const theme = localStorage.getItem("theme");
  const html = document.documentElement;
  const sunIcon = document.getElementById("sunIcon");
  const moonIcon = document.getElementById("moonIcon");

  if (theme === "dark") {
    html.classList.add("dark");
    sunIcon?.classList.add("hidden");
    moonIcon?.classList.remove("hidden");
  } else {
    html.classList.remove("dark");
    sunIcon?.classList.remove("hidden");
    moonIcon?.classList.add("hidden");
  }
}

/**
 * Filter apps op basis van zoekterm met fuzzy matching
 */
function filterApps(searchTerm) {
  const appsGrid = document.querySelector("#appsGrid");
  if (!appsGrid) return;

  const appItems = appsGrid.querySelectorAll(".app-item");
  const term = searchTerm.toLowerCase().trim();

  let visibleCount = 0;
  const results = [];

  // Collect all apps with fuzzy match scores
  appItems.forEach((item) => {
    const appName = item.getAttribute("data-name");

    // Get app data to check tags
    const app = allApps.find((a) => a.name === appName);

    if (term === "") {
      // No search term - show all
      results.push({ item, score: 0, matches: null });
    } else {
      // Try fuzzy match on app name
      let fuzzyResult = fuzzyMatch(appName, term);

      // If no match on name, try tags
      if (!fuzzyResult && app && app.tags) {
        const tagMatch = app.tags.some((tag) => fuzzyMatch(tag, term));
        if (tagMatch) {
          // Give tag matches a slightly lower priority score
          fuzzyResult = { score: 100, matches: [] };
        }
      }

      if (fuzzyResult) {
        results.push({
          item,
          score: fuzzyResult.score,
          matches: fuzzyResult.matches,
        });
      } else {
        // Hide non-matching items
        item.style.display = "none";
      }
    }
  });

  // Sort by fuzzy match score (lower is better)
  results.sort((a, b) => a.score - b.score);

  // Show matching items and highlight
  results.forEach((result, index) => {
    result.item.style.display = "";
    result.item.style.order = index; // Reorder based on relevance

    // Highlight matched characters in app name
    if (result.matches && result.matches.length > 0) {
      const label = result.item.querySelector("span");
      if (label) {
        const appName = result.item.getAttribute("data-name");
        label.innerHTML = highlightMatches(appName, result.matches);
      }
    } else {
      // Reset highlight when no search
      const label = result.item.querySelector("span");
      if (label) {
        label.textContent = result.item.getAttribute("data-name");
      }
    }
    visibleCount++;
  });

  // Make grid use flexbox order for sorting
  appsGrid.style.display = "flex";
  appsGrid.style.flexWrap = "wrap";

  // Toon "geen resultaten" bericht
  const existingMessage = appsGrid.querySelector(".no-results");
  if (visibleCount === 0 && term !== "") {
    if (!existingMessage) {
      const message = document.createElement("div");
      message.className = "no-results col-span-4 py-8 text-center w-full";
      message.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Geen apps gevonden voor "${searchTerm}"</p>
        <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">Try using partial matches like "gm" for Gmail</p>
      `;
      appsGrid.appendChild(message);
    }
  } else if (existingMessage) {
    existingMessage.remove();
  }

  updateAppCounter(visibleCount, appItems.length);
}

/**
 * Update de app counter
 */
function updateAppCounter(visible, total) {
  const counter = document.getElementById("appCounter");
  if (!counter) return;

  if (total === undefined) {
    counter.textContent = `${visible} apps`;
  } else if (visible === total) {
    counter.textContent = `${total} apps`;
  } else {
    counter.textContent = `${visible} van ${total} apps`;
  }
}

/**
 * Reset de volgorde van apps naar origineel
 */
function resetAppOrder() {
  if (confirm("Weet je zeker dat je de volgorde wilt resetten?")) {
    localStorage.removeItem("appOrder");
    location.reload();
  }
}

/**
 * Toon error message als apps niet geladen kunnen worden
 */
function showErrorMessage() {
  const appsGrid = document.querySelector("#appsGrid");

  if (!appsGrid) return;

  appsGrid.innerHTML = `
    <div class="col-span-4 py-8 text-center">
      <p class="text-sm text-gray-500 dark:text-gray-400">Apps kunnen niet worden geladen</p>
    </div>
  `;
}

/**
 * Initialiseer Sortable.js voor drag & drop functionaliteit
 */
function initSortable() {
  const appsGrid = document.querySelector("#appsGrid");

  if (!appsGrid || typeof Sortable === "undefined") {
    console.error("SortableJS niet geladen of grid niet gevonden");
    return;
  }

  Sortable.create(appsGrid, {
    animation: 150,
    ghostClass: "sortable-ghost",
    dragClass: "sortable-drag",
    delay: 100,
    delayOnTouchOnly: true,
    touchStartThreshold: 5,

    onEnd: function (evt) {
      console.log("App verplaatst van", evt.oldIndex, "naar", evt.newIndex);
      saveAppOrder();
    },
  });
}

/**
 * Sla de nieuwe volgorde van apps op in localStorage
 */
function saveAppOrder() {
  const appsGrid = document.querySelector("#appsGrid");
  const appButtons = appsGrid.querySelectorAll("button[data-name]");

  const order = Array.from(appButtons).map((btn) =>
    btn.getAttribute("data-name")
  );

  localStorage.setItem("appOrder", JSON.stringify(order));
  console.log("Nieuwe volgorde opgeslagen:", order);
}

/**
 * Laad de opgeslagen volgorde en sorteer de apps
 */
function applySavedOrder(apps) {
  const savedOrder = localStorage.getItem("appOrder");

  if (!savedOrder) {
    return apps;
  }

  try {
    const order = JSON.parse(savedOrder);

    const sortedApps = [];
    order.forEach((name) => {
      const app = apps.find((a) => a.name === name);
      if (app) {
        sortedApps.push(app);
      }
    });

    apps.forEach((app) => {
      if (!order.includes(app.name)) {
        sortedApps.push(app);
      }
    });

    return sortedApps;
  } catch (error) {
    console.error("Fout bij laden opgeslagen volgorde:", error);
    return apps;
  }
}

/**
 * ==========================================
 * COLLECTIONS MANAGEMENT
 * ==========================================
 */

/**
 * Laad collections vanuit JSON bestand en merge met localStorage
 */
async function loadCollections() {
  try {
    // Laad eerst de default collections uit JSON
    const response = await fetch("collections.json");

    if (response.ok) {
      const data = await response.json();
      const defaultCollections = data.collections || [];

      // Check of we custom collections in localStorage hebben
      const saved = localStorage.getItem("customCollections");
      const customCollections = saved ? JSON.parse(saved) : [];

      // Merge default en custom collections
      // Custom collections overschrijven defaults met dezelfde ID
      const mergedCollections = [...defaultCollections];

      customCollections.forEach((customCol) => {
        const index = mergedCollections.findIndex(
          (col) => col.id === customCol.id
        );
        if (index >= 0) {
          // Overschrijf default collection
          mergedCollections[index] = customCol;
        } else {
          // Voeg nieuwe custom collection toe
          mergedCollections.push(customCol);
        }
      });

      collections = mergedCollections;

      // Render collections in de UI
      renderCollectionsQuickAccess();
      renderUsageStats(); // Render usage statistics
    } else {
      console.warn("collections.json niet gevonden, gebruik localStorage");
      loadCollectionsFromLocalStorage();
    }
  } catch (error) {
    console.error("Fout bij laden collections uit JSON:", error);
    loadCollectionsFromLocalStorage();
  }

  return collections;
}

/**
 * Laad collections alleen uit localStorage (fallback)
 */
function loadCollectionsFromLocalStorage() {
  const saved = localStorage.getItem("customCollections");
  if (saved) {
    try {
      collections = JSON.parse(saved);
      renderCollectionsQuickAccess(); // Render ook bij fallback
    } catch (error) {
      console.error("Fout bij laden collections:", error);
      collections = [];
    }
  }
}

/**
 * Sla collections op in localStorage
 * Alleen custom/gewijzigde collections worden opgeslagen
 */
function saveCollections() {
  // Sla alle collections op (inclusief gewijzigde defaults)
  localStorage.setItem("customCollections", JSON.stringify(collections));
}

/**
 * Check of een collection uit JSON komt of custom is
 */
function isDefaultCollection(collectionId) {
  // Je kunt hier een lijst van default IDs bijhouden
  const defaultIds = ["morning-routine", "work-tools", "content-creation"];
  return defaultIds.includes(collectionId);
}

/**
 * Haal volledige app objecten op voor een collection
 * @param {Object} collection - Collection object met apps array
 * @returns {Array} Array van app objecten uit apps.json
 */
function getCollectionApps(collection) {
  if (!collection || !collection.apps) return [];

  return collection.apps
    .map((appName) => allApps.find((app) => app.name === appName))
    .filter((app) => app !== undefined); // Filter out apps die niet gevonden zijn
}

/**
 * Valideer of alle apps in een collection bestaan
 * @param {Object} collection - Collection object
 * @returns {Object} Object met valid en missing apps
 */
function validateCollectionApps(collection) {
  const validApps = [];
  const missingApps = [];

  collection.apps.forEach((appName) => {
    const app = allApps.find((a) => a.name === appName);
    if (app) {
      validApps.push(app);
    } else {
      missingApps.push(appName);
    }
  });

  return { validApps, missingApps };
}

/**
 * Render de lijst met collections in de Collections modal
 */
function renderCollectionsList() {
  const listContainer = document.getElementById("collectionsList");
  if (!listContainer) return;

  listContainer.innerHTML = "";

  if (collections.length === 0) {
    listContainer.innerHTML = `
      <div class="text-center py-12">
        <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Nog geen collections aangemaakt</p>
      </div>
    `;
    return;
  }

  collections.forEach((collection) => {
    const item = document.createElement("div");
    item.className = `collection-item p-4 rounded-lg bg-${collection.color}-50 dark:bg-${collection.color}-900/20 border border-${collection.color}-200 dark:border-${collection.color}-800`;

    const isDefault = isDefaultCollection(collection.id);
    const defaultBadge = isDefault
      ? '<span class="ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-400">Default</span>'
      : "";

    // Haal app objecten op uit apps.json
    const { validApps, missingApps } = validateCollectionApps(collection);

    // Maak app preview (iconen)
    const appPreview = validApps
      .slice(0, 5)
      .map(
        (app) => `
      <div class="${app.color.bg} ${app.color.text} rounded p-1 inline-flex" title="${app.name}">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="${app.icon.viewBox}" fill="currentColor">
          <path d="${app.icon.path}" />
        </svg>
      </div>
    `
      )
      .join("");

    const moreApps =
      validApps.length > 5
        ? `<span class="text-xs text-${collection.color}-600 dark:text-${
            collection.color
          }-400">+${validApps.length - 5} meer</span>`
        : "";

    const warningBadge =
      missingApps.length > 0
        ? `<span class="ml-2 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full" title="Sommige apps niet gevonden">⚠️ ${missingApps.length} missing</span>`
        : "";

    item.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <div class="flex-1">
          <h4 class="font-semibold text-${collection.color}-900 dark:text-${
      collection.color
    }-100 flex items-center">${
      collection.name
    }${defaultBadge}${warningBadge}</h4>
          <p class="text-sm text-${collection.color}-700 dark:text-${
      collection.color
    }-300">${collection.description || ""}</p>
        </div>
        <div class="flex gap-2 ml-4">
          <button 
            onclick="openCollection('${collection.id}')"
            class="px-3 py-1 text-sm bg-${
              collection.color
            }-600 text-white rounded hover:bg-${
      collection.color
    }-700 transition-colors whitespace-nowrap"
            title="Open alle apps"
          >
            Open All
          </button>
          <button 
            onclick="editCollection('${collection.id}')"
            class="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            title="Bewerk collection"
          >
            ✏️
          </button>
          <button 
            onclick="deleteCollection('${collection.id}')"
            class="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            title="Verwijder collection"
          >
            🗑️
          </button>
        </div>
      </div>
      <div class="flex items-center gap-2 mt-2 flex-wrap">
        ${appPreview}
        ${moreApps}
      </div>
    `;

    listContainer.appendChild(item);
  });
}

/**
 * Render app selectie checkboxes in het Collection Form
 */
function renderAppSelectionList() {
  const container = document.getElementById("appSelectionList");
  if (!container) return;

  container.innerHTML = "";

  console.log("🔍 renderAppSelectionList - allApps.length:", allApps.length);

  if (allApps.length === 0) {
    container.innerHTML =
      '<p class="text-sm text-gray-500 dark:text-gray-400">Geen apps beschikbaar</p>';
    console.warn("⚠️ Geen apps beschikbaar! Apps zijn nog niet geladen.");
    return;
  }

  allApps.forEach((app) => {
    const label = document.createElement("label");
    label.className =
      "flex items-center gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "collectionApp";
    checkbox.value = app.name;
    checkbox.className =
      "w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500";

    const appInfo = document.createElement("div");
    appInfo.className = "flex items-center gap-2";
    appInfo.innerHTML = `
      <div class="${app.color} rounded p-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="${app.icon.viewBox}" fill="currentColor">
          <path d="${app.icon.path}" />
        </svg>
      </div>
      <span class="text-sm text-gray-700 dark:text-gray-200">${app.name}</span>
    `;

    label.appendChild(checkbox);
    label.appendChild(appInfo);
    container.appendChild(label);
  });
}

/**
 * Render collections in het quick access gedeelte van het app menu
 */
function renderCollectionsQuickAccess() {
  const container = document.getElementById("collectionsQuickAccess");
  if (!container) return;

  container.innerHTML = "";

  if (collections.length === 0) {
    container.innerHTML =
      '<p class="text-xs text-gray-400 dark:text-gray-500 italic">Geen collections</p>';
    return;
  }

  collections.slice(0, 5).forEach((collection) => {
    const button = document.createElement("button");
    button.className = `flex items-center gap-2 px-3 py-2 rounded-lg bg-${collection.color}-50 dark:bg-${collection.color}-900/20 border border-${collection.color}-200 dark:border-${collection.color}-800 hover:bg-${collection.color}-100 dark:hover:bg-${collection.color}-900/30 transition-colors text-left w-full`;
    button.innerHTML = `
      <span class="text-${collection.color}-600 dark:text-${collection.color}-400">📁</span>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium text-${collection.color}-900 dark:text-${collection.color}-100 truncate">${collection.name}</div>
        <div class="text-xs text-${collection.color}-600 dark:text-${collection.color}-400">${collection.apps.length} apps</div>
      </div>
    `;
    button.onclick = () => openCollection(collection.id);
    container.appendChild(button);
  });
}

/**
 * Open alle apps in een collection
 */
function openCollection(collectionId) {
  const collection = collections.find((c) => c.id === collectionId);
  if (!collection) {
    console.error("Collection niet gevonden:", collectionId);
    return;
  }

  // Valideer en haal app objecten op uit apps.json
  const { validApps, missingApps } = validateCollectionApps(collection);

  // Waarschuwing als er apps ontbreken
  if (missingApps.length > 0) {
    console.warn(
      `⚠️ De volgende apps uit collection "${collection.name}" zijn niet gevonden in apps.json:`,
      missingApps
    );
  }

  // Open alleen de gevonden apps
  validApps.forEach((app) => {
    if (app.url) {
      window.open(app.url, "_blank");
    }
  });

  // Feedback naar gebruiker
  if (validApps.length > 0) {
    console.log(
      `✅ ${validApps.length} app(s) geopend uit collection "${collection.name}"`
    );
  }

  // Sluit app menu
  const appMenu = document.getElementById("appMenu");
  appMenu?.classList.add("hidden");
  appMenu?.classList.remove("menu-enter");
}

/**
 * Bewerk een bestaande collection
 */
function editCollection(collectionId) {
  const collection = collections.find((c) => c.id === collectionId);
  if (!collection) return;

  editingCollectionId = collectionId;

  // Vul formulier
  const nameInput = document.getElementById("collectionName");
  const descInput = document.getElementById("collectionDescription");

  if (nameInput) nameInput.value = collection.name;
  if (descInput) descInput.value = collection.description || "";

  // Selecteer kleur
  selectedCollectionColor = collection.color;
  document.querySelectorAll(".collection-color-picker").forEach((btn) => {
    btn.classList.remove("ring-4");
  });
  const colorBtn = document.querySelector(
    `.collection-color-picker[data-collection-color="${collection.color}"]`
  );
  if (colorBtn) {
    colorBtn.classList.add("ring-4");
  }

  // Vink apps aan
  renderAppSelectionList();
  setTimeout(() => {
    document
      .querySelectorAll('input[name="collectionApp"]')
      .forEach((checkbox) => {
        checkbox.checked = collection.apps.includes(checkbox.value);
      });
  }, 100);

  // Open form modal
  const collectionsModal = document.getElementById("collectionsModal");
  collectionsModal?.classList.add("hidden");
  collectionsModal?.classList.remove("flex");

  const formModal = document.getElementById("collectionFormModal");
  formModal?.classList.remove("hidden");
  formModal?.classList.add("flex");
}

/**
 * Verwijder een collection
 */
function deleteCollection(collectionId) {
  const collection = collections.find((c) => c.id === collectionId);
  if (!collection) return;

  if (confirm(`Weet je zeker dat je "${collection.name}" wilt verwijderen?`)) {
    collections = collections.filter((c) => c.id !== collectionId);
    saveCollections();
    renderCollectionsList();
    renderCollectionsQuickAccess();
  }
}

/**
 * Handle collection form submit (create or edit)
 */
function handleCollectionSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById("collectionName");
  const descInput = document.getElementById("collectionDescription");
  const selectedApps = Array.from(
    document.querySelectorAll('input[name="collectionApp"]:checked')
  ).map((cb) => cb.value);

  const name = nameInput?.value.trim();
  const description = descInput?.value.trim();

  if (!name) {
    alert("Voer een naam in voor de collection");
    return;
  }

  if (selectedApps.length === 0) {
    alert("Selecteer minimaal één app");
    return;
  }

  if (editingCollectionId) {
    // Bewerk bestaande collection
    const collection = collections.find((c) => c.id === editingCollectionId);
    if (collection) {
      collection.name = name;
      collection.description = description;
      collection.color = selectedCollectionColor;
      collection.apps = selectedApps;
    }
    editingCollectionId = null;
  } else {
    // Maak nieuwe collection
    const newCollection = {
      id: Date.now().toString(),
      name: name,
      description: description,
      color: selectedCollectionColor,
      apps: selectedApps,
    };
    collections.push(newCollection);
  }

  saveCollections();
  renderCollectionsList();
  renderCollectionsQuickAccess();

  // Reset form
  nameInput.value = "";
  descInput.value = "";
  selectedCollectionColor = "blue";
  document.querySelectorAll(".collection-color-picker").forEach((btn) => {
    btn.classList.remove("ring-4");
  });
  document
    .querySelector('.collection-color-picker[data-collection-color="blue"]')
    ?.classList.add("ring-4");

  // Sluit form modal, open collections modal
  const formModal = document.getElementById("collectionFormModal");
  formModal?.classList.add("hidden");
  formModal?.classList.remove("flex");

  const collectionsModal = document.getElementById("collectionsModal");
  collectionsModal?.classList.remove("hidden");
  collectionsModal?.classList.add("flex");
}

/**
 * ==========================================
 * COMMAND PALETTE
 * ==========================================
 */

let commandPaletteSelectedIndex = 0;
let commandPaletteResults = [];

/**
 * Open Command Palette
 */
function openCommandPalette() {
  const palette = document.getElementById("commandPalette");
  const input = document.getElementById("commandPaletteInput");

  palette?.classList.remove("hidden");
  palette?.classList.add("flex");
  input?.focus();

  // Render initial commands
  renderCommandPaletteResults("");
}

/**
 * Close Command Palette
 */
function closeCommandPalette() {
  const palette = document.getElementById("commandPalette");
  const input = document.getElementById("commandPaletteInput");

  palette?.classList.add("hidden");
  palette?.classList.remove("flex");
  if (input) input.value = "";
  commandPaletteSelectedIndex = 0;
}

/**
 * Get all available commands
 */
function getCommands() {
  return [
    {
      icon: "➕",
      title: "New App",
      description: "Create a new custom app",
      action: () => {
        closeCommandPalette();
        document.getElementById("addCustomApp")?.click();
      },
      keywords: ["new", "add", "create", "app", "custom"],
    },
    {
      icon: "📁",
      title: "New Collection",
      description: "Create a new collection",
      action: () => {
        closeCommandPalette();
        document.getElementById("collectionsBtn")?.click();
        setTimeout(
          () => document.getElementById("createCollectionBtn")?.click(),
          100
        );
      },
      keywords: ["new", "collection", "group", "create"],
    },
    {
      icon: "🌙",
      title: "Toggle Dark Mode",
      description: "Switch between light and dark theme",
      action: () => {
        closeCommandPalette();
        toggleTheme();
      },
      keywords: ["dark", "light", "theme", "mode", "toggle"],
    },
    {
      icon: "⚙️",
      title: "Settings",
      description: "Open settings modal",
      action: () => {
        closeCommandPalette();
        document.getElementById("settingsBtn")?.click();
      },
      keywords: ["settings", "preferences", "config"],
    },
    {
      icon: "💾",
      title: "Export Configuration",
      description: "Download your settings as JSON",
      action: () => {
        closeCommandPalette();
        exportConfiguration();
      },
      keywords: ["export", "download", "backup", "save"],
    },
    {
      icon: "📥",
      title: "Import Configuration",
      description: "Upload settings from JSON",
      action: () => {
        closeCommandPalette();
        importConfiguration();
      },
      keywords: ["import", "upload", "restore", "load"],
    },
    {
      icon: "🔄",
      title: "Reset App Order",
      description: "Reset apps to default order",
      action: () => {
        closeCommandPalette();
        resetAppOrder();
      },
      keywords: ["reset", "order", "default"],
    },
    {
      icon: "📊",
      title: "View Collections",
      description: "Manage your app collections",
      action: () => {
        closeCommandPalette();
        document.getElementById("collectionsBtn")?.click();
      },
      keywords: ["collections", "groups", "view", "manage"],
    },
  ];
}

/**
 * Fuzzy search implementation
 */
function fuzzyMatch(text, query) {
  text = text.toLowerCase();
  query = query.toLowerCase();

  let queryIndex = 0;
  let textIndex = 0;
  const matches = [];

  while (queryIndex < query.length && textIndex < text.length) {
    if (text[textIndex] === query[queryIndex]) {
      matches.push(textIndex);
      queryIndex++;
    }
    textIndex++;
  }

  // All characters must be found
  if (queryIndex !== query.length) {
    return null;
  }

  // Calculate score (lower is better)
  let score = textIndex;
  for (let i = 1; i < matches.length; i++) {
    score += matches[i] - matches[i - 1];
  }

  return { matches, score };
}

/**
 * Highlight matched characters
 */
function highlightMatches(text, matches) {
  if (!matches || matches.length === 0) return text;

  // Check if highlighting is enabled
  const highlightEnabled = localStorage.getItem("highlightSearch") !== "false";

  if (!highlightEnabled) {
    return text; // Return plain text without highlighting
  }

  let result = "";
  for (let i = 0; i < text.length; i++) {
    if (matches.includes(i)) {
      result += `<span class="search-highlight">${text[i]}</span>`;
    } else {
      result += text[i];
    }
  }
  return result;
}

/**
 * Render Command Palette results
 */
function renderCommandPaletteResults(query) {
  const resultsContainer = document.getElementById("commandPaletteResults");
  if (!resultsContainer) return;

  const commands = getCommands();

  // Add apps to commands
  const appCommands = allApps.map((app) => ({
    icon: "🚀",
    title: app.name,
    description: app.url ? new URL(app.url).hostname : app.category,
    action: () => {
      closeCommandPalette();
      if (app.url) {
        window.open(app.url, "_blank");
      }
    },
    keywords: [app.name.toLowerCase(), app.category, app.url || ""],
  }));

  const allCommands = [...commands, ...appCommands];

  // Filter and sort by fuzzy match
  if (query.trim() === "") {
    commandPaletteResults = commands; // Show only system commands when empty
  } else {
    commandPaletteResults = allCommands
      .map((cmd) => {
        const titleMatch = fuzzyMatch(cmd.title, query);
        const keywordMatch = cmd.keywords.some((kw) => fuzzyMatch(kw, query));

        if (titleMatch || keywordMatch) {
          return {
            ...cmd,
            titleMatch,
            score: titleMatch ? titleMatch.score : 1000,
          };
        }
        return null;
      })
      .filter((cmd) => cmd !== null)
      .sort((a, b) => a.score - b.score);
  }

  // Render results
  resultsContainer.innerHTML = "";

  if (commandPaletteResults.length === 0) {
    resultsContainer.innerHTML = `
      <div class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
        <p class="text-sm">No results found for "${query}"</p>
      </div>
    `;
    return;
  }

  commandPaletteResults.forEach((cmd, index) => {
    const item = document.createElement("button");
    item.className = `w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left ${
      index === commandPaletteSelectedIndex
        ? "bg-gray-100 dark:bg-gray-700"
        : ""
    }`;

    const highlightedTitle = cmd.titleMatch
      ? highlightMatches(cmd.title, cmd.titleMatch.matches)
      : cmd.title;

    item.innerHTML = `
      <span class="text-2xl flex-shrink-0">${cmd.icon}</span>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium text-gray-900 dark:text-gray-100">${highlightedTitle}</div>
        <div class="text-xs text-gray-500 dark:text-gray-400 truncate">${cmd.description}</div>
      </div>
    `;

    item.addEventListener("click", () => cmd.action());
    resultsContainer.appendChild(item);
  });

  commandPaletteSelectedIndex = 0;
}

/**
 * Setup Command Palette event listeners
 */
function setupCommandPalette() {
  const palette = document.getElementById("commandPalette");
  const input = document.getElementById("commandPaletteInput");

  if (!input || !palette) return;

  // Input event
  input.addEventListener("input", (e) => {
    renderCommandPaletteResults(e.target.value);
  });

  // Keyboard navigation
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeCommandPalette();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      commandPaletteSelectedIndex = Math.min(
        commandPaletteSelectedIndex + 1,
        commandPaletteResults.length - 1
      );
      renderCommandPaletteResults(input.value);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      commandPaletteSelectedIndex = Math.max(
        commandPaletteSelectedIndex - 1,
        0
      );
      renderCommandPaletteResults(input.value);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (commandPaletteResults[commandPaletteSelectedIndex]) {
        commandPaletteResults[commandPaletteSelectedIndex].action();
      }
    }
  });

  // Click outside to close
  palette.addEventListener("click", (e) => {
    if (e.target === palette) {
      closeCommandPalette();
    }
  });
}

// Initialize Command Palette
setupCommandPalette();

/**
 * ==========================================
 * USAGE STATISTICS
 * ==========================================
 */

/**
 * Load usage statistics from localStorage
 */
function loadAppStats() {
  const saved = localStorage.getItem("appStats");
  if (saved) {
    try {
      appStats = JSON.parse(saved);
    } catch (error) {
      console.error("Error loading app stats:", error);
      appStats = {};
    }
  }
}

/**
 * Save usage statistics to localStorage
 */
function saveAppStats() {
  localStorage.setItem("appStats", JSON.stringify(appStats));
}

/**
 * Track app usage
 */
function trackAppUsage(appName) {
  if (!appStats[appName]) {
    appStats[appName] = {
      clicks: 0,
      lastUsed: null,
      firstUsed: Date.now(),
    };
  }

  appStats[appName].clicks++;
  appStats[appName].lastUsed = Date.now();

  saveAppStats();
  console.log(`📊 App clicked: ${appName} (${appStats[appName].clicks} times)`);
}

/**
 * Get most used apps
 */
function getMostUsedApps(limit = 5) {
  return Object.entries(appStats)
    .map(([name, stats]) => ({
      name,
      ...stats,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit);
}

/**
 * Get recently used apps
 */
function getRecentlyUsedApps(limit = 5) {
  return Object.entries(appStats)
    .filter(([_, stats]) => stats.lastUsed)
    .map(([name, stats]) => ({
      name,
      ...stats,
    }))
    .sort((a, b) => b.lastUsed - a.lastUsed)
    .slice(0, limit);
}

/**
 * Render usage statistics in app menu
 */
function renderUsageStats() {
  const mostUsed = getMostUsedApps(3);
  const recent = getRecentlyUsedApps(3);

  if (mostUsed.length === 0) return; // No stats yet

  // Add to quick access section
  const quickAccessContainer = document.getElementById(
    "collectionsQuickAccess"
  );
  if (!quickAccessContainer) return;

  const statsSection = document.createElement("div");
  statsSection.className =
    "mt-4 pt-4 border-t border-gray-200 dark:border-gray-700";
  statsSection.innerHTML = `
    <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
      📊 MOST USED
    </p>
  `;

  mostUsed.forEach((stat) => {
    const app = allApps.find((a) => a.name === stat.name);
    if (!app) return;

    const button = document.createElement("button");
    button.className = `flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left w-full mb-1`;
    button.innerHTML = `
      <div class="${app.color.bg} ${app.color.text} rounded p-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="${app.icon.viewBox}" fill="currentColor">
          <path d="${app.icon.path}" />
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">${app.name}</div>
        <div class="text-xs text-gray-500 dark:text-gray-400">${stat.clicks} clicks</div>
      </div>
    `;
    button.onclick = () => {
      trackAppUsage(app.name);
      if (app.url) window.open(app.url, "_blank");
    };
    statsSection.appendChild(button);
  });

  quickAccessContainer.parentNode?.insertBefore(
    statsSection,
    quickAccessContainer
  );
}

// Load stats on init
loadAppStats();

/* ========================================
   KEYBOARD HINTS WIDGET
   ======================================== */

/**
 * Setup keyboard hints widget
 */
function setupKeyboardHints() {
  const hintsContainer = document.getElementById("keyboardHints");
  const closeBtn = document.getElementById("closeHints");
  const toggleBtn = document.getElementById("toggleHintsSize");
  const showBtn = document.getElementById("showHintsBtn");

  // Check if user previously closed the hints
  const hintsClosed = localStorage.getItem("keyboardHintsClosed") === "true";
  const hintsMinimized =
    localStorage.getItem("keyboardHintsMinimized") === "true";

  if (hintsClosed) {
    hintsContainer.classList.add("hidden");
    showBtn.classList.remove("hidden");
  } else if (hintsMinimized) {
    minimizeHints();
  }

  // Close hints
  closeBtn?.addEventListener("click", () => {
    hintsContainer.classList.add("hidden");
    showBtn.classList.remove("hidden");
    localStorage.setItem("keyboardHintsClosed", "true");
  });

  // Toggle size (minimize/maximize)
  let isMinimized = hintsMinimized;
  toggleBtn?.addEventListener("click", () => {
    isMinimized = !isMinimized;
    if (isMinimized) {
      minimizeHints();
      localStorage.setItem("keyboardHintsMinimized", "true");
    } else {
      maximizeHints();
      localStorage.setItem("keyboardHintsMinimized", "false");
    }
  });

  // Show hints again
  showBtn?.addEventListener("click", () => {
    showBtn.classList.add("hidden");
    hintsContainer.classList.remove("hidden");
    localStorage.setItem("keyboardHintsClosed", "false");
  });

  function minimizeHints() {
    const card = hintsContainer.querySelector("div");
    card.classList.add("max-w-xs");

    // Hide all shortcuts except first one
    const shortcuts = card.querySelectorAll(".space-y-2 > div");
    shortcuts.forEach((shortcut, index) => {
      if (index > 0) shortcut.classList.add("hidden");
    });

    toggleBtn.textContent = "Show more";
  }

  function maximizeHints() {
    const card = hintsContainer.querySelector("div");
    card.classList.remove("max-w-xs");

    // Show all shortcuts
    const shortcuts = card.querySelectorAll(".space-y-2 > div");
    shortcuts.forEach((shortcut) => {
      shortcut.classList.remove("hidden");
    });

    toggleBtn.textContent = "Minimize";
  }
}

// Initialize keyboard hints
setupKeyboardHints();

/* ========================================
   TAGS SYSTEM
   ======================================== */

/**
 * Get all unique tags from all apps
 */
function getAllTags() {
  const tags = new Set();

  // Get tags from default apps
  allApps.forEach((app) => {
    if (app.tags && Array.isArray(app.tags)) {
      app.tags.forEach((tag) => tags.add(tag.toLowerCase()));
    }
  });

  // Get tags from custom apps
  customApps.forEach((app) => {
    if (app.tags && Array.isArray(app.tags)) {
      app.tags.forEach((tag) => tags.add(tag.toLowerCase()));
    }
  });

  return Array.from(tags).sort();
}

/**
 * Setup tag suggestions in custom app modal
 */
function setupTagSuggestions() {
  const tagsInput = document.getElementById("customAppTags");
  const suggestionsContainer = document.getElementById("tagSuggestions");

  if (!tagsInput || !suggestionsContainer) return;

  // Show popular tags as suggestions
  tagsInput.addEventListener("focus", () => {
    const allTags = getAllTags();
    const popularTags = allTags.slice(0, 8); // Show top 8

    suggestionsContainer.innerHTML = popularTags
      .map(
        (tag) =>
          `<button type="button" 
        class="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
        onclick="addTagToInput('${tag}')">${tag}</button>`
      )
      .join("");
  });
}

/**
 * Add a suggested tag to the input field
 */
function addTagToInput(tag) {
  const tagsInput = document.getElementById("customAppTags");
  if (!tagsInput) return;

  const currentValue = tagsInput.value.trim();
  if (currentValue) {
    // Add to existing tags
    const tags = currentValue.split(",").map((t) => t.trim());
    if (!tags.includes(tag)) {
      tagsInput.value = [...tags, tag].join(", ");
    }
  } else {
    tagsInput.value = tag;
  }
  tagsInput.focus();
}

/**
 * Setup show tags toggle in settings
 */
function setupShowTagsToggle() {
  const toggle = document.getElementById("showTagsToggle");
  if (!toggle) return;

  // Load saved preference (default: true)
  const showTags = localStorage.getItem("showTags") !== "false";
  toggle.checked = showTags;

  // Listen for changes
  toggle.addEventListener("change", (e) => {
    const enabled = e.target.checked;
    localStorage.setItem("showTags", enabled.toString());

    // Re-render apps to show/hide tags
    renderApps(filterApps(currentCategory));
  });
}

/**
 * Setup use favicons toggle in settings
 */
function setupUseFaviconsToggle() {
  const toggle = document.getElementById("useFaviconsToggle");
  if (!toggle) return;

  // Load saved preference (default: true)
  const useFavicons = localStorage.getItem("useFavicons") !== "false";
  toggle.checked = useFavicons;

  // Listen for changes
  toggle.addEventListener("change", (e) => {
    const enabled = e.target.checked;
    localStorage.setItem("useFavicons", enabled.toString());

    // Re-render apps to use favicons or SVG
    renderApps(
      allApps.filter(
        (app) => currentCategory === "all" || app.category === currentCategory
      )
    );
    renderPinnedApps();
    renderQuickApps(); // Update Quick Apps widget
    renderAppsDashboard(); // Update Apps Dashboard
  });
}

// Apply grid size classes to app containers
function applyGridSize(size) {
  const appsGrid = document.getElementById("appsGrid");
  const pinnedApps = document.getElementById("pinnedApps");

  if (!appsGrid || !pinnedApps) return;

  // Grid size mapping
  const gridSizes = {
    small: "grid-cols-6",
    medium: "grid-cols-4",
    large: "grid-cols-3",
  };

  // Remove all grid size classes
  Object.values(gridSizes).forEach((className) => {
    appsGrid.classList.remove(className);
    pinnedApps.classList.remove(className);
  });

  // Apply selected grid size
  const selectedClass = gridSizes[size] || gridSizes.medium;
  appsGrid.classList.add(selectedClass);
  pinnedApps.classList.add(selectedClass);
}

// Setup grid size toggle in settings
function setupGridSizeToggle() {
  const radios = document.querySelectorAll('input[name="gridSize"]');
  if (!radios || radios.length === 0) return;

  // Load saved preference (default: medium)
  const savedSize = localStorage.getItem("gridSize") || "medium";

  // Set the correct radio button as checked
  radios.forEach((radio) => {
    if (radio.value === savedSize) {
      radio.checked = true;
    }
  });

  // Apply initial grid size
  applyGridSize(savedSize);

  // Listen for changes
  radios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const size = e.target.value;
      localStorage.setItem("gridSize", size);
      applyGridSize(size);
    });
  });
}

// Setup search highlight toggle in settings
function setupHighlightSearchToggle() {
  const toggle = document.getElementById("highlightSearchToggle");
  if (!toggle) return;

  // Load saved preference (default: true)
  const highlightEnabled = localStorage.getItem("highlightSearch") !== "false";
  toggle.checked = highlightEnabled;

  // Listen for changes
  toggle.addEventListener("change", (e) => {
    const enabled = e.target.checked;
    localStorage.setItem("highlightSearch", enabled.toString());

    // Re-trigger current search to update highlighting
    const searchInput = document.getElementById("searchInput");
    if (searchInput && searchInput.value) {
      const event = new Event("input", { bubbles: true });
      searchInput.dispatchEvent(event);
    }

    // Also update Command Palette if it's open
    const commandInput = document.getElementById("commandPaletteInput");
    if (commandInput && commandInput.value) {
      const event = new Event("input", { bubbles: true });
      commandInput.dispatchEvent(event);
    }
  });
}

// Setup keyboard shortcuts widget toggle in settings
function setupShowShortcutsToggle() {
  const toggle = document.getElementById("showShortcutsToggle");
  const widget = document.getElementById("keyboardHints");

  if (!toggle || !widget) return;

  // Load saved preference (default: true)
  const showShortcuts = localStorage.getItem("showShortcuts") !== "false";
  toggle.checked = showShortcuts;

  // Apply initial visibility
  if (showShortcuts) {
    widget.classList.remove("hidden");
  } else {
    widget.classList.add("hidden");
  }

  // Listen for changes
  toggle.addEventListener("change", (e) => {
    const enabled = e.target.checked;
    localStorage.setItem("showShortcuts", enabled.toString());

    if (enabled) {
      widget.classList.remove("hidden");
    } else {
      widget.classList.add("hidden");
    }
  });
}

// Setup Quick Apps Widget visibility toggle
// Setup Apps Dashboard toggle
function setupShowAppsDashboardToggle() {
  const toggle = document.getElementById("showAppsDashboardToggle");
  const dashboard = document.getElementById("appsDashboardWidget");

  if (!toggle || !dashboard) return;

  // Load saved state
  const saved = localStorage.getItem("showAppsDashboard");
  const enabled = saved !== "false"; // Default to true

  toggle.checked = enabled;
  if (enabled) {
    dashboard.classList.remove("hidden");
  } else {
    dashboard.classList.add("hidden");
  }

  // Listen for changes
  toggle.addEventListener("change", (e) => {
    const enabled = e.target.checked;
    localStorage.setItem("showAppsDashboard", enabled.toString());

    if (enabled) {
      dashboard.classList.remove("hidden");
      renderAppsDashboard(); // Re-render when showing
    } else {
      dashboard.classList.add("hidden");
    }
  });
}

// Setup minimize button for Apps Dashboard Widget
function setupAppsDashboardMinimize() {
  const closeBtn = document.getElementById("closeDashboard");
  const widget = document.getElementById("appsDashboardWidget");

  if (!closeBtn || !widget) return;

  closeBtn.addEventListener("click", () => {
    widget.classList.add("hidden");
    // Update toggle in settings
    const toggle = document.getElementById("showAppsDashboardToggle");
    if (toggle) {
      toggle.checked = false;
      localStorage.setItem("showAppsDashboard", "false");
    }
  });
} // Setup drag functionality for Apps Dashboard Widget
function setupAppsDashboardDrag() {
  const widget = document.getElementById("appsDashboardWidget");
  const dragHandle = document.getElementById("dashboardDragHandle");

  if (!widget || !dragHandle) return;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialX = 0;
  let initialY = 0;

  // Load saved position
  const savedPosition = localStorage.getItem("appsDashboardPosition");
  if (savedPosition) {
    const { x, y } = JSON.parse(savedPosition);
    widget.style.left = x + "px";
    widget.style.top = y + "px";
  }

  dragHandle.addEventListener("mousedown", startDrag);

  function startDrag(e) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    const rect = widget.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;

    // Disable transition during drag
    widget.style.transition = "none";

    // Prevent text selection
    e.preventDefault();

    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", endDrag);

    // Change cursor
    document.body.style.cursor = "grabbing";
    dragHandle.style.cursor = "grabbing";
  }

  function drag(e) {
    if (!isDragging) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    let newX = initialX + deltaX;
    let newY = initialY + deltaY;

    // Constrain to viewport
    const rect = widget.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;

    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));

    widget.style.left = newX + "px";
    widget.style.top = newY + "px";
  }

  function endDrag() {
    if (!isDragging) return;

    isDragging = false;

    // Re-enable transition
    widget.style.transition = "all 0.3s ease";

    // Reset cursor
    document.body.style.cursor = "";
    dragHandle.style.cursor = "move";

    // Save position
    const rect = widget.getBoundingClientRect();
    localStorage.setItem(
      "appsDashboardPosition",
      JSON.stringify({
        x: rect.left,
        y: rect.top,
      })
    );

    document.removeEventListener("mousemove", drag);
    document.removeEventListener("mouseup", endDrag);
  }

  // Touch support for mobile
  dragHandle.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    startDrag({
      clientX: touch.clientX,
      clientY: touch.clientY,
      preventDefault: () => e.preventDefault(),
    });
  });

  document.addEventListener("touchmove", (e) => {
    if (isDragging) {
      const touch = e.touches[0];
      drag({
        clientX: touch.clientX,
        clientY: touch.clientY,
      });
    }
  });

  document.addEventListener("touchend", () => {
    if (isDragging) {
      endDrag();
    }
  });
}

// Render Apps Dashboard Widget
function renderAppsDashboard() {
  const dashboardList = document.getElementById("dashboardAppsList");
  const categoryFilter = document.getElementById("dashboardCategoryFilter");
  const counter = document.getElementById("dashboardAppCounter");

  if (!dashboardList) return;

  // Get current selected category
  const activeCategory =
    document
      .querySelector(".dashboard-category-btn.active")
      ?.getAttribute("data-dashboard-category") || "all";

  // Show PINNED apps instead of just top apps - like Fav Apps
  let displayApps = [];

  // Get pinned apps from allApps array
  const pinnedAppsData = allApps.filter((app) => pinnedApps.includes(app.name));

  // Filter by category if needed
  if (activeCategory !== "all") {
    displayApps = pinnedAppsData.filter(
      (app) => app.category === activeCategory
    );
  } else {
    displayApps = pinnedAppsData;
  }

  // Limit to 9 apps (3x3 grid)
  displayApps = displayApps.slice(0, 9);

  // Update counter
  if (counter) {
    counter.textContent = `${displayApps.length}/9`;
  }

  // Setup category filter if not done yet
  if (categoryFilter && categoryFilter.children.length === 1) {
    setupDashboardCategoryFilter();
  }

  // Clear current apps
  dashboardList.innerHTML = "";

  if (displayApps.length === 0) {
    dashboardList.innerHTML = `
      <div class="col-span-3 text-center py-4">
        <p class="text-xs text-gray-400 dark:text-gray-500">Geen gefavoriete apps</p>
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Pin apps via het menu</p>
      </div>
    `;
    return;
  }

  // Create app buttons with pin/unpin functionality
  displayApps.forEach((app) => {
    const appButton = document.createElement("div");
    appButton.className =
      "group relative flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors";

    // Pin/Unpin button (like in Fav Apps)
    const pinButton = document.createElement("button");
    pinButton.className =
      "absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10";
    pinButton.innerHTML = "×";
    pinButton.title = "Unpin app";
    pinButton.addEventListener("click", (e) => {
      e.stopPropagation();
      togglePinnedApp(app.name);
    });

    // Main app click area
    const appClickArea = document.createElement("button");
    appClickArea.className = "flex flex-col items-center gap-1 w-full";
    appClickArea.title = app.name;
    appClickArea.addEventListener("click", () => openApp(app));

    // Icon container
    const iconContainer = document.createElement("div");
    iconContainer.className =
      "w-8 h-8 flex items-center justify-center rounded-lg";

    // Create icon (same logic as Quick Apps)
    const useFavicons = localStorage.getItem("useFavicons") !== "false";

    if (useFavicons && app.url) {
      try {
        const url = new URL(app.url);
        const domain = url.hostname;

        const favicon = document.createElement("img");
        favicon.className = "w-6 h-6 rounded-sm";
        favicon.alt = `${app.name} icon`;
        favicon.src = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;

        favicon.addEventListener("error", () => {
          favicon.remove();
          createDashboardSVGIcon(iconContainer, app);
        });

        iconContainer.appendChild(favicon);
      } catch (error) {
        createDashboardSVGIcon(iconContainer, app);
      }
    } else {
      createDashboardSVGIcon(iconContainer, app);
    }

    // App name (abbreviated)
    const nameSpan = document.createElement("span");
    nameSpan.className =
      "text-xs text-gray-600 dark:text-gray-300 truncate max-w-full text-center";
    nameSpan.textContent =
      app.name.length > 8 ? app.name.substring(0, 7) + "..." : app.name;

    // Assemble the app click area
    appClickArea.appendChild(iconContainer);
    appClickArea.appendChild(nameSpan);

    // Assemble the full app button
    appButton.appendChild(pinButton);
    appButton.appendChild(appClickArea);

    dashboardList.appendChild(appButton);
  });
}

// Helper function to create SVG icons for dashboard
function createDashboardSVGIcon(container, app) {
  if (app.icon && app.icon.path) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", `h-5 w-5 ${app.color.text}`);
    svg.setAttribute("fill", "currentColor");
    svg.setAttribute("viewBox", app.icon.viewBox || "0 0 24 24");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", app.icon.path);

    svg.appendChild(path);
    container.appendChild(svg);
    container.className += ` ${app.color.bg}`;
  } else {
    container.textContent = app.name.charAt(0).toUpperCase();
    container.className += ` ${app.color.bg} ${app.color.text}`;
  }
}

// Setup category filter for dashboard
function setupDashboardCategoryFilter() {
  const categoryFilter = document.getElementById("dashboardCategoryFilter");
  if (!categoryFilter) return;

  // Get unique categories from all apps
  const categories = [...new Set(allApps.map((app) => app.category))];

  // Add category buttons
  categories.forEach((category) => {
    const categoryNames = {
      favorieten: "⭐ Favorieten",
      "ai-tools": "🤖 AI-tools",
      "ai-agents": "🧠 AI-agents",
      "microsoft-365": "🏢 Microsoft 365",
      windows: "🪟 Windows",
      "social-media": "💻 Social media",
      custom: "📦 Custom",
    };

    const button = document.createElement("button");
    button.setAttribute("data-dashboard-category", category);
    button.className =
      "dashboard-category-btn whitespace-nowrap rounded-full bg-gray-200 dark:bg-gray-600 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 transition hover:bg-gray-300 dark:hover:bg-gray-500";
    button.textContent = categoryNames[category] || category;

    button.addEventListener("click", () => {
      // Update active state
      document.querySelectorAll(".dashboard-category-btn").forEach((btn) => {
        btn.classList.remove("active", "bg-blue-500", "text-white");
        btn.classList.add(
          "bg-gray-200",
          "dark:bg-gray-600",
          "text-gray-700",
          "dark:text-gray-300"
        );
      });

      button.classList.add("active", "bg-blue-500", "text-white");
      button.classList.remove(
        "bg-gray-200",
        "dark:bg-gray-600",
        "text-gray-700",
        "dark:text-gray-300"
      );

      // Re-render apps
      renderAppsDashboard();
    });

    categoryFilter.appendChild(button);
  });
}

// Autocomplete state
let autocompleteState = {
  isOpen: false,
  selectedIndex: -1,
  results: [],
};

/**
 * Setup autocomplete for search input
 */
function setupAutocomplete() {
  const searchInput = document.getElementById("appSearch");
  const dropdown = document.getElementById("autocompleteDropdown");
  const resultsContainer = document.getElementById("autocompleteResults");

  console.log("🔍 setupAutocomplete called");
  console.log("  searchInput:", searchInput);
  console.log("  dropdown:", dropdown);
  console.log("  resultsContainer:", resultsContainer);
  console.log("  allApps.length:", allApps.length);

  if (!searchInput || !dropdown || !resultsContainer) {
    console.error("❌ Autocomplete elements niet gevonden!");
    return;
  }

  console.log("✅ Autocomplete setup - event listener toegevoegd");

  // Input handler for autocomplete
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();

    // IMPORTANT: Also filter the apps in the menu
    filterApps(e.target.value);

    if (query.length === 0) {
      hideAutocomplete();
      return;
    }

    // Get suggestions
    const suggestions = getAutocompleteSuggestions(query);
    autocompleteState.results = suggestions;

    // Auto-select first result if there's only 1 suggestion
    if (suggestions.length === 1) {
      autocompleteState.selectedIndex = 0;
    } else {
      autocompleteState.selectedIndex = -1;
    }

    if (suggestions.length > 0) {
      renderAutocompleteSuggestions(suggestions);
      showAutocomplete();
    } else {
      hideAutocomplete();
    }
  });

  // Keyboard navigation
  searchInput.addEventListener("keydown", (e) => {
    if (!autocompleteState.isOpen) return;

    const results = autocompleteState.results;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        autocompleteState.selectedIndex = Math.min(
          autocompleteState.selectedIndex + 1,
          results.length - 1
        );
        updateAutocompleteSelection();
        break;

      case "ArrowUp":
        e.preventDefault();
        autocompleteState.selectedIndex = Math.max(
          autocompleteState.selectedIndex - 1,
          -1
        );
        updateAutocompleteSelection();
        break;

      case "Enter":
        e.preventDefault();
        // If nothing selected but results exist, auto-select first result
        if (autocompleteState.selectedIndex === -1 && results.length > 0) {
          autocompleteState.selectedIndex = 0;
        }

        if (autocompleteState.selectedIndex >= 0) {
          selectAutocompleteSuggestion(
            results[autocompleteState.selectedIndex]
          );
        }
        break;

      case "Escape":
        e.preventDefault();
        hideAutocomplete();
        break;
    }
  });

  // Click outside to close
  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      hideAutocomplete();
    }
  });
}

/**
 * Setup AI Mode Button - Toggle between AI platforms
 */
function setupAIModeButton() {
  const aiModeBtn = document.getElementById("aiModeBtn");
  const searchInput = document.getElementById("homePageSearch");

  if (!aiModeBtn) {
    console.warn("⚠️ AI-modus button niet gevonden");
    return;
  }

  // Load saved AI mode from localStorage
  const savedMode = localStorage.getItem("aiMode");
  if (savedMode && aiModes[savedMode]) {
    currentAIMode = savedMode;
  }

  // Update button to show current AI mode
  updateAIModeButton();

  // Toggle AI mode on click
  aiModeBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    // Cycle through AI modes
    const modeKeys = Object.keys(aiModes);
    const currentIndex = modeKeys.indexOf(currentAIMode);
    const nextIndex = (currentIndex + 1) % modeKeys.length;
    currentAIMode = modeKeys[nextIndex];

    // Save to localStorage
    localStorage.setItem("aiMode", currentAIMode);

    // Update UI
    updateAIModeButton();

    // Auto-focus and prefill search input
    if (searchInput) {
      const mode = aiModes[currentAIMode];
      searchInput.value = mode.prefix + " ";
      searchInput.focus();

      // Trigger input event to show autocomplete
      const event = new Event("input", { bubbles: true });
      searchInput.dispatchEvent(event);
    }

    // Show toast notification
    showToast(
      `AI-modus: ${aiModes[currentAIMode].name} ${aiModes[currentAIMode].icon}`
    );
  });
}

/**
 * Update AI Mode Button UI
 */
function updateAIModeButton() {
  const aiModeBtn = document.getElementById("aiModeBtn");
  if (!aiModeBtn) return;

  const mode = aiModes[currentAIMode];
  const textSpan = aiModeBtn.querySelector(".leading-none");

  if (textSpan) {
    textSpan.textContent = `${mode.icon} ${mode.name}`;
    textSpan.className = `leading-none font-semibold ${mode.color}`;
  }
}

/**
 * Setup autocomplete for homepage search
 */
function setupHomePageAutocomplete() {
  const searchInput = document.getElementById("homePageSearch");
  const dropdown = document.getElementById("homePageAutocomplete");
  const resultsContainer = document.getElementById(
    "homePageAutocompleteResults"
  );

  console.log("🏠 setupHomePageAutocomplete called");
  console.log("  searchInput:", searchInput);
  console.log("  dropdown:", dropdown);

  if (!searchInput || !dropdown || !resultsContainer) {
    console.warn("⚠️ Homepage autocomplete elements niet gevonden");
    return;
  }

  console.log("✅ Homepage autocomplete setup");

  let selectedIndex = -1;
  let currentResults = [];

  // Input handler
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    console.log("🏠 Homepage input:", query);

    if (query.length === 0) {
      dropdown.classList.add("hidden");
      return;
    }

    // Check for search engine shortcuts first
    const searchEngineMatch = detectSearchEngine(query);

    if (searchEngineMatch) {
      // Show search engine suggestion
      currentResults = [{ type: "search-engine", data: searchEngineMatch }];
      selectedIndex = 0;
      renderHomePageSuggestions(currentResults);
      dropdown.classList.remove("hidden");
      return;
    }

    // Get app suggestions
    const suggestions = getAutocompleteSuggestions(query);
    currentResults = suggestions;

    // Auto-select first result if there's only 1 suggestion
    if (suggestions.length === 1) {
      selectedIndex = 0;
    } else {
      selectedIndex = -1;
    }

    if (suggestions.length > 0) {
      renderHomePageSuggestions(suggestions);
      dropdown.classList.remove("hidden");
      // Update selection visually if auto-selected
      if (suggestions.length === 1) {
        updateHomePageSelection();
      }
      console.log(
        "✅ Homepage dropdown shown with",
        suggestions.length,
        "results"
      );
    } else {
      dropdown.classList.add("hidden");
    }
  });

  // Keyboard navigation
  searchInput.addEventListener("keydown", (e) => {
    if (dropdown.classList.contains("hidden") || currentResults.length === 0)
      return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, currentResults.length - 1);
        updateHomePageSelection();
        break;

      case "ArrowUp":
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        updateHomePageSelection();
        break;

      case "Enter":
        e.preventDefault();
        // If nothing selected but results exist, auto-select first result
        if (selectedIndex === -1 && currentResults.length > 0) {
          selectedIndex = 0;
        }

        if (selectedIndex >= 0 && currentResults[selectedIndex]) {
          const result = currentResults[selectedIndex];

          // Handle search engine queries
          if (result.type === "search-engine") {
            window.open(result.data.fullUrl, "_blank");
          } else {
            // Handle regular app
            window.open(result.app.url, "_blank");
          }

          searchInput.value = "";
          dropdown.classList.add("hidden");
          selectedIndex = -1;
        }
        break;

      case "Escape":
        e.preventDefault();
        dropdown.classList.add("hidden");
        searchInput.blur();
        break;
    }
  });

  // Click outside to close
  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  });

  // Helper function to update selection
  function updateHomePageSelection() {
    const items = resultsContainer.querySelectorAll(".autocomplete-item");
    items.forEach((item, index) => {
      if (index === selectedIndex) {
        item.classList.add(
          "selected",
          "bg-blue-50",
          "dark:bg-blue-900/20",
          "border-l-blue-500"
        );
      } else {
        item.classList.remove(
          "selected",
          "bg-blue-50",
          "dark:bg-blue-900/20",
          "border-l-blue-500"
        );
      }
    });
  }
}

/**
 * Detect search engine shortcuts in query
 */
function detectSearchEngine(query) {
  for (const [prefix, engine] of Object.entries(searchEngines)) {
    if (query.toLowerCase().startsWith(prefix)) {
      const searchQuery = query.substring(prefix.length).trim();
      if (searchQuery.length > 0) {
        return {
          prefix,
          engine: engine.name,
          icon: engine.icon,
          query: searchQuery,
          fullUrl: engine.url + encodeURIComponent(searchQuery),
        };
      }
    }
  }
  return null;
}

/**
 * Render homepage autocomplete suggestions
 */
function renderHomePageSuggestions(suggestions) {
  const resultsContainer = document.getElementById(
    "homePageAutocompleteResults"
  );
  if (!resultsContainer) return;

  resultsContainer.innerHTML = "";

  suggestions.forEach((suggestion, index) => {
    const item = document.createElement("div");
    item.className =
      "autocomplete-item px-4 py-3 cursor-pointer flex items-center gap-3 border-l-3 border-transparent hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors";
    item.dataset.index = index;

    // Handle search engine suggestions differently
    if (suggestion.type === "search-engine") {
      const data = suggestion.data;

      // Icon container with emoji
      const iconContainer = document.createElement("div");
      iconContainer.className =
        "flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 flex-shrink-0 text-xl";
      iconContainer.textContent = data.icon;

      // Text container
      const textContainer = document.createElement("div");
      textContainer.className = "flex-1 min-w-0";

      const engineName = document.createElement("div");
      engineName.className =
        "text-sm font-medium text-gray-900 dark:text-gray-100 truncate";
      engineName.innerHTML = `Zoek op <span class="text-blue-600 dark:text-blue-400">${data.engine}</span>: <span class="font-normal">${data.query}</span>`;

      const hint = document.createElement("div");
      hint.className = "text-xs text-gray-500 dark:text-gray-400 truncate";
      hint.textContent = `Druk Enter om te zoeken...`;

      textContainer.appendChild(engineName);
      textContainer.appendChild(hint);

      item.appendChild(iconContainer);
      item.appendChild(textContainer);

      // Click handler
      item.addEventListener("click", () => {
        window.open(data.fullUrl, "_blank");
        document.getElementById("homePageSearch").value = "";
        document.getElementById("homePageAutocomplete").classList.add("hidden");
      });

      resultsContainer.appendChild(item);
      return; // Skip rest of the loop for this item
    }

    // Regular app suggestion rendering
    const iconContainer = document.createElement("div");
    iconContainer.className = `flex h-10 w-10 items-center justify-center rounded-full ${suggestion.app.color.bg} flex-shrink-0`;

    // Use favicon if enabled
    const useFavicons = localStorage.getItem("useFavicons") !== "false";

    if (useFavicons && suggestion.app.url) {
      try {
        const url = new URL(suggestion.app.url);
        const domain = url.hostname;
        const favicon = document.createElement("img");
        favicon.className = "h-6 w-6 rounded-sm";
        favicon.alt = `${suggestion.app.name} icon`;
        favicon.src = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
        favicon.addEventListener("error", () => {
          favicon.remove();
          const svg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
          );
          svg.setAttribute("class", `h-5 w-5 ${suggestion.app.color.text}`);
          svg.setAttribute("fill", "currentColor");
          svg.setAttribute("viewBox", suggestion.app.icon.viewBox);
          const path = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path"
          );
          path.setAttribute("d", suggestion.app.icon.path);
          svg.appendChild(path);
          iconContainer.appendChild(svg);
        });
        iconContainer.appendChild(favicon);
      } catch (error) {
        const svg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg"
        );
        svg.setAttribute("class", `h-5 w-5 ${suggestion.app.color.text}`);
        svg.setAttribute("fill", "currentColor");
        svg.setAttribute("viewBox", suggestion.app.icon.viewBox);
        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        path.setAttribute("d", suggestion.app.icon.path);
        svg.appendChild(path);
        iconContainer.appendChild(svg);
      }
    } else {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", `h-5 w-5 ${suggestion.app.color.text}`);
      svg.setAttribute("fill", "currentColor");
      svg.setAttribute("viewBox", suggestion.app.icon.viewBox);
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      path.setAttribute("d", suggestion.app.icon.path);
      svg.appendChild(path);
      iconContainer.appendChild(svg);
    }

    // Text container
    const textContainer = document.createElement("div");
    textContainer.className = "flex-1 min-w-0";

    const appName = document.createElement("div");
    appName.className =
      "text-sm font-medium text-gray-900 dark:text-gray-100 truncate";

    // Highlight matches
    if (suggestion.matches && suggestion.matches.length > 0) {
      appName.innerHTML = highlightMatches(
        suggestion.app.name,
        suggestion.matches
      );
    } else {
      appName.textContent = suggestion.app.name;
    }

    const reason = document.createElement("div");
    reason.className = "text-xs text-gray-500 dark:text-gray-400 truncate";
    reason.textContent = suggestion.reason;

    textContainer.appendChild(appName);
    textContainer.appendChild(reason);

    // Assemble
    item.appendChild(iconContainer);
    item.appendChild(textContainer);

    // Click handler
    item.addEventListener("click", () => {
      window.open(suggestion.app.url, "_blank");
      document.getElementById("homePageSearch").value = "";
      document.getElementById("homePageAutocomplete").classList.add("hidden");
    });

    resultsContainer.appendChild(item);
  });
}

/**
 * Get autocomplete suggestions
 */
function getAutocompleteSuggestions(query) {
  const lowerQuery = query.toLowerCase();
  const suggestions = [];

  // Search in all apps
  allApps.forEach((app) => {
    // Simple substring match first
    if (app.name.toLowerCase().includes(lowerQuery)) {
      suggestions.push({
        type: "app",
        app: app,
        score: 100,
        matches: [],
        reason: "App",
      });
    }
    // Then try fuzzy match for more results
    else {
      const matchResult = fuzzyMatch(app.name.toLowerCase(), lowerQuery);

      if (matchResult !== null) {
        suggestions.push({
          type: "app",
          app: app,
          score: matchResult.score,
          matches: matchResult.matches,
          reason: "App",
        });
      }
    }

    // Also check tags
    if (app.tags && app.tags.length > 0) {
      app.tags.forEach((tag) => {
        if (tag.toLowerCase().includes(lowerQuery)) {
          // Check if app not already added
          const exists = suggestions.find(
            (s) => s.app && s.app.name === app.name
          );
          if (!exists) {
            suggestions.push({
              type: "tag",
              app: app,
              score: 50,
              matches: [],
              reason: `Tag: ${tag}`,
            });
          }
        }
      });
    }
  });

  // Sort by score (lower is better for fuzzy match) and limit to top 5
  return suggestions.sort((a, b) => a.score - b.score).slice(0, 5);
}

/**
 * Render autocomplete suggestions
 */
function renderAutocompleteSuggestions(suggestions) {
  const resultsContainer = document.getElementById("autocompleteResults");
  if (!resultsContainer) return;

  resultsContainer.innerHTML = "";

  suggestions.forEach((suggestion, index) => {
    const item = document.createElement("div");
    item.className =
      "autocomplete-item px-4 py-2.5 cursor-pointer flex items-center gap-3 border-l-3 border-transparent";
    item.dataset.index = index;

    // Icon
    const iconContainer = document.createElement("div");
    iconContainer.className = `flex h-8 w-8 items-center justify-center rounded-full ${suggestion.app.color.bg} flex-shrink-0`;

    // Use favicon if enabled
    const useFavicons = localStorage.getItem("useFavicons") !== "false";

    if (useFavicons && suggestion.app.url) {
      try {
        const url = new URL(suggestion.app.url);
        const domain = url.hostname;

        const favicon = document.createElement("img");
        favicon.className = "h-5 w-5 rounded-sm";
        favicon.alt = `${suggestion.app.name} icon`;
        favicon.src = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;

        favicon.addEventListener("error", () => {
          favicon.remove();
          const svg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
          );
          svg.setAttribute("class", `h-4 w-4 ${suggestion.app.color.text}`);
          svg.setAttribute("fill", "currentColor");
          svg.setAttribute("viewBox", suggestion.app.icon.viewBox);
          const path = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path"
          );
          path.setAttribute("d", suggestion.app.icon.path);
          svg.appendChild(path);
          iconContainer.appendChild(svg);
        });

        iconContainer.appendChild(favicon);
      } catch (error) {
        const svg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg"
        );
        svg.setAttribute("class", `h-4 w-4 ${suggestion.app.color.text}`);
        svg.setAttribute("fill", "currentColor");
        svg.setAttribute("viewBox", suggestion.app.icon.viewBox);
        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        path.setAttribute("d", suggestion.app.icon.path);
        svg.appendChild(path);
        iconContainer.appendChild(svg);
      }
    } else {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", `h-4 w-4 ${suggestion.app.color.text}`);
      svg.setAttribute("fill", "currentColor");
      svg.setAttribute("viewBox", suggestion.app.icon.viewBox);
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      path.setAttribute("d", suggestion.app.icon.path);
      svg.appendChild(path);
      iconContainer.appendChild(svg);
    }

    // Text container
    const textContainer = document.createElement("div");
    textContainer.className = "flex-1 min-w-0";

    const appName = document.createElement("div");
    appName.className =
      "text-sm font-medium text-gray-900 dark:text-gray-100 truncate";

    // Highlight matches
    if (suggestion.matches && suggestion.matches.length > 0) {
      appName.innerHTML = highlightMatches(
        suggestion.app.name,
        suggestion.matches
      );
    } else {
      appName.textContent = suggestion.app.name;
    }

    const reason = document.createElement("div");
    reason.className = "text-xs text-gray-500 dark:text-gray-400";
    reason.textContent = suggestion.reason;

    textContainer.appendChild(appName);
    textContainer.appendChild(reason);

    // Assemble
    item.appendChild(iconContainer);
    item.appendChild(textContainer);

    // Click handler
    item.addEventListener("click", () => {
      selectAutocompleteSuggestion(suggestion);
    });

    // Hover handler
    item.addEventListener("mouseenter", () => {
      autocompleteState.selectedIndex = index;
      updateAutocompleteSelection();
    });

    resultsContainer.appendChild(item);
  });
}

/**
 * Update autocomplete selection visual
 */
function updateAutocompleteSelection() {
  const items = document.querySelectorAll(".autocomplete-item");
  items.forEach((item, index) => {
    if (index === autocompleteState.selectedIndex) {
      item.classList.add("selected");
      item.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } else {
      item.classList.remove("selected");
    }
  });
}

/**
 * Select an autocomplete suggestion
 */
function selectAutocompleteSuggestion(suggestion) {
  if (suggestion.app && suggestion.app.url) {
    trackAppUsage(suggestion.app.name);
    window.open(suggestion.app.url, "_blank");

    // Clear search and hide dropdown
    const searchInput = document.getElementById("appSearch");
    if (searchInput) {
      searchInput.value = "";
      filterApps(""); // Reset filter
    }
    hideAutocomplete();
  }
}

/**
 * Show autocomplete dropdown
 */
function showAutocomplete() {
  const dropdown = document.getElementById("autocompleteDropdown");
  console.log("🎯 showAutocomplete - dropdown:", dropdown);
  if (dropdown) {
    dropdown.classList.remove("hidden");
    autocompleteState.isOpen = true;
    console.log("✅ Dropdown shown - classes:", dropdown.className);
  }
}

/**
 * Hide autocomplete dropdown
 */
function hideAutocomplete() {
  const dropdown = document.getElementById("autocompleteDropdown");
  if (dropdown) {
    dropdown.classList.add("hidden");
    autocompleteState.isOpen = false;
    autocompleteState.selectedIndex = -1;
  }
}

// All initialization moved to DOMContentLoaded event listener above
// to ensure DOM is ready and allApps is loaded before running setup functions
