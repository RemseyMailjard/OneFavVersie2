// Global state
let allApps = [];
let customApps = [];
let pinnedApps = [];
let collections = [];
let selectedColor = "blue";
let selectedCollectionColor = "blue";
let currentCategory = "all";
let editingCollectionId = null;

// App menu toggle functionaliteit
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 DOMContentLoaded - Start initialisatie");

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
  console.log("✅ Event listeners ingesteld");

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

  // Zoekfunctionaliteit
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      filterApps(e.target.value);
    });
  }

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
      settingsModal?.classList.remove("hidden");
      settingsModal?.classList.add("flex");
    });
  }

  if (closeSettings) {
    closeSettings.addEventListener("click", () => {
      settingsModal?.classList.add("hidden");
      settingsModal?.classList.remove("flex");
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
      renderCollectionsList();
    });
  }

  if (closeCollections) {
    closeCollections.addEventListener("click", () => {
      collectionsModal?.classList.add("hidden");
      collectionsModal?.classList.remove("flex");
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
      setTimeout(() => searchInput?.focus(), 100);
    } else {
      appMenu.classList.add("hidden");
      appMenu.classList.remove("menu-enter");
      if (searchInput) searchInput.value = "";
      filterApps("");
    }
  });

  // Sluit menu als je ergens anders klikt
  document.addEventListener("click", (e) => {
    if (!appMenuBtn.contains(e.target) && !appMenu.contains(e.target)) {
      appMenu.classList.add("hidden");
      appMenu.classList.remove("menu-enter");
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
        appMenuBtn.focus();
        if (searchInput) searchInput.value = "";
        filterApps("");
      }

      // Sluit modals
      settingsModal?.classList.add("hidden");
      settingsModal?.classList.remove("flex");
      customAppModal?.classList.add("hidden");
      customAppModal?.classList.remove("flex");
      const collectionsModal = document.getElementById("collectionsModal");
      collectionsModal?.classList.add("hidden");
      collectionsModal?.classList.remove("flex");
      const collectionFormModal = document.getElementById(
        "collectionFormModal"
      );
      collectionFormModal?.classList.add("hidden");
      collectionFormModal?.classList.remove("flex");
    }
  });

  // Setup drag & drop zone voor apps grid
  setupDropZone();
}

/**
 * Setup drop zone voor het slepen van links naar de app grid
 */
function setupDropZone() {
  const appsGrid = document.getElementById("appsGrid");
  const appMenu = document.getElementById("appMenu");

  if (!appsGrid || !appMenu) return;

  let dropIndicator = null;

  // Maak drop indicator element
  const createDropIndicator = () => {
    if (!dropIndicator) {
      dropIndicator = document.createElement("div");
      dropIndicator.className =
        "col-span-4 rounded-lg border-2 border-dashed border-blue-400 bg-blue-50 dark:bg-blue-900/20 p-8 text-center hidden";
      dropIndicator.innerHTML = `
        <div class="flex flex-col items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p class="text-sm font-medium text-blue-600 dark:text-blue-400">Sleep een link hiernaartoe</p>
          <p class="text-xs text-blue-500 dark:text-blue-500">We maken er automatisch een app van!</p>
        </div>
      `;
      appsGrid.appendChild(dropIndicator);
    }
    return dropIndicator;
  };

  // Prevent default drag over hele document
  document.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  document.addEventListener("drop", (e) => {
    e.preventDefault();
  });

  // App menu drop zone
  appMenu.addEventListener("dragenter", (e) => {
    e.preventDefault();
    const indicator = createDropIndicator();
    indicator.classList.remove("hidden");
  });

  appMenu.addEventListener("dragleave", (e) => {
    // Alleen verbergen als we echt het app menu verlaten
    if (e.target === appMenu) {
      if (dropIndicator) {
        dropIndicator.classList.add("hidden");
      }
    }
  });

  appMenu.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  });

  appMenu.addEventListener("drop", (e) => {
    e.preventDefault();

    if (dropIndicator) {
      dropIndicator.classList.add("hidden");
    }

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

        console.log(`✅ Link gedropt: ${capitalizedName} - ${url}`);

        // Focus op naam input voor aanpassing
        setTimeout(() => nameInput?.focus(), 100);
      } catch (error) {
        console.error("Ongeldige URL gedropt:", error);
        alert("Ongeldige URL. Sleep een geldige link naar het app menu.");
      }
    }
  });
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Ctrl+K of Cmd+K - Open Command Palette
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      openCommandPalette();
    }

    // Ctrl+M of Cmd+M - Toggle menu
    if ((e.ctrlKey || e.metaKey) && e.key === "m") {
      e.preventDefault();
      document.getElementById("appMenuBtn")?.click();
    }

    // Ctrl+N of Cmd+N - Custom app toevoegen
    if ((e.ctrlKey || e.metaKey) && e.key === "n") {
      e.preventDefault();
      const customAppModal = document.getElementById("customAppModal");
      customAppModal?.classList.remove("hidden");
      customAppModal?.classList.add("flex");
    }

    // Ctrl+T of Cmd+T - Toggle theme
    if ((e.ctrlKey || e.metaKey) && e.key === "t") {
      e.preventDefault();
      toggleTheme();
    }

    // Ctrl+G of Cmd+G - Open Collections
    if ((e.ctrlKey || e.metaKey) && e.key === "g") {
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

  // Get unique categories
  const categories = [...new Set(apps.map((app) => app.category || "other"))];

  // Keep "Alle" button, add other categories
  const allBtn = categoryFilter.querySelector('[data-category="all"]');

  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.setAttribute("data-category", cat);
    btn.className =
      "category-btn whitespace-nowrap rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300";
    btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);

    btn.addEventListener("click", () => filterByCategory(cat));

    categoryFilter.appendChild(btn);
  });

  // All button handler
  if (allBtn) {
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
        window.open(app.url, "_blank");
      }
    });
  }

  // Icon container
  const iconContainer = document.createElement("div");
  iconContainer.className = `flex h-12 w-12 items-center justify-center rounded-full ${app.color.bg}`;

  // SVG icon
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", `h-6 w-6 ${app.color.text}`);
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("viewBox", app.icon.viewBox);

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", app.icon.path);

  svg.appendChild(path);
  iconContainer.appendChild(svg);

  // Label
  const label = document.createElement("span");
  label.className = "text-xs font-medium text-gray-700 dark:text-gray-300";
  label.textContent = app.name;

  button.appendChild(iconContainer);
  button.appendChild(label);

  return button;
}

/**
 * Show context menu
 */
function showContextMenu(e, appName) {
  // Remove existing context menu
  document.querySelectorAll(".context-menu").forEach((m) => m.remove());

  const menu = document.createElement("div");
  menu.className =
    "context-menu fixed z-[100] rounded-lg bg-white shadow-lg border border-gray-200 py-1 dark:bg-gray-800 dark:border-gray-700";
  menu.style.left = `${e.pageX}px`;
  menu.style.top = `${e.pageY}px`;

  const isPinnedNow = isPinned(appName);

  menu.innerHTML = `
    <button class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300" data-action="pin">
      ${isPinnedNow ? "Unpin" : "📌 Pin"} app
    </button>
    <button class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300" data-action="delete">
      🗑️ Verwijder
    </button>
  `;

  menu.querySelector('[data-action="pin"]').addEventListener("click", () => {
    togglePin(appName);
    menu.remove();
  });

  menu.querySelector('[data-action="delete"]').addEventListener("click", () => {
    deleteCustomApp(appName);
    menu.remove();
  });

  document.body.appendChild(menu);

  // Remove on click outside
  setTimeout(() => {
    document.addEventListener(
      "click",
      () => {
        menu.remove();
      },
      { once: true }
    );
  }, 0);
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

  const name = document.getElementById("customAppName").value;
  const url = document.getElementById("customAppUrl").value;
  const category = document.getElementById("customAppCategory").value;

  const newApp = {
    name,
    category,
    url,
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

  customApps.push(newApp);
  saveCustomApps();

  // Close modal and reset form
  document.getElementById("customAppModal").classList.add("hidden");
  document.getElementById("customAppModal").classList.remove("flex");
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
 * Filter apps op basis van zoekterm
 */
function filterApps(searchTerm) {
  const appsGrid = document.querySelector("#appsGrid");
  if (!appsGrid) return;

  const appItems = appsGrid.querySelectorAll(".app-item");
  const term = searchTerm.toLowerCase().trim();

  let visibleCount = 0;

  appItems.forEach((item) => {
    const appName = item.getAttribute("data-name").toLowerCase();
    const matches = appName.includes(term);

    if (matches) {
      item.style.display = "";
      visibleCount++;
    } else {
      item.style.display = "none";
    }
  });

  // Toon "geen resultaten" bericht
  const existingMessage = appsGrid.querySelector(".no-results");
  if (visibleCount === 0 && term !== "") {
    if (!existingMessage) {
      const message = document.createElement("div");
      message.className = "no-results col-span-4 py-8 text-center";
      message.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Geen apps gevonden voor "${searchTerm}"</p>
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

  let result = "";
  for (let i = 0; i < text.length; i++) {
    if (matches.includes(i)) {
      result += `<span class="text-blue-600 dark:text-blue-400 font-semibold">${text[i]}</span>`;
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
