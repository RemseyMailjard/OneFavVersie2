// Global state
let allApps = [];
let customApps = [];
let pinnedApps = [];
let selectedColor = 'blue';
let currentCategory = 'all';

// App menu toggle functionaliteit
document.addEventListener("DOMContentLoaded", () => {
  const appMenuBtn = document.getElementById("appMenuBtn");
  const appMenu = document.getElementById("appMenu");
  const themeToggle = document.getElementById("themeToggle");
  const settingsBtn = document.getElementById("settingsBtn");

  if (!appMenuBtn || !appMenu) {
    console.error("App menu elementen niet gevonden");
    return;
  }

  // Laad apps en instellingen
  loadApps();
  loadPinnedApps();
  loadCustomApps();
  loadTheme();

  // Setup event listeners
  setupEventListeners();
  setupKeyboardShortcuts();
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
    }
  });
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Ctrl+K of Cmd+K - Focus zoekbalk
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      const searchInput = document.getElementById("appSearch");
      const appMenu = document.getElementById("appMenu");
      
      if (appMenu?.classList.contains("hidden")) {
        document.getElementById("appMenuBtn")?.click();
      }
      searchInput?.focus();
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
    btn.classList.add("bg-gray-200", "text-gray-700", "dark:bg-gray-700", "dark:text-gray-300");
  });

  const activeBtn = document.querySelector(`[data-category="${category}"]`);
  if (activeBtn) {
    activeBtn.classList.add("active", "bg-blue-500", "text-white");
    activeBtn.classList.remove("bg-gray-200", "text-gray-700", "dark:bg-gray-700", "dark:text-gray-300");
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
  renderApps(allApps.filter((app) => currentCategory === "all" || app.category === currentCategory));
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

  // Pin indicator
  if (isPinned(app.name) && !isPinnedButton) {
    const pinBadge = document.createElement("div");
    pinBadge.className =
      "absolute top-1 right-1 text-yellow-500";
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
    appOrder: localStorage.getItem("appOrder"),
    theme: localStorage.getItem("theme"),
  };

  const dataStr = JSON.stringify(config, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `onefav-config-${new Date().toISOString().split("T")[0]}.json`;
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
