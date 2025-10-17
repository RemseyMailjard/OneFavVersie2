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

// Prevent infinite loops flags
let isRenderingHomePage = false;
let isRenderingInlineFavs = false;
let isLoadingApps = false;
let lastRenderTime = 0;
const RENDER_THROTTLE_MS = 100;

// Feature modules instances with fallbacks
let fuzzySearch = null;
let analytics = null;
let recentSearches = null;
let tagFilter = null;
let uiEnhancements = null;
let keyboardShortcuts = null;
let appNotes = null;

// Initialize modules safely
function initializeModules() {
  try {
    if (typeof window.FuzzySearch !== "undefined") {
      fuzzySearch = new window.FuzzySearch();
    }
    if (typeof window.Analytics !== "undefined") {
      analytics = new window.Analytics();
    }
    if (typeof window.UIEnhancements !== "undefined") {
      uiEnhancements = new window.UIEnhancements();
    }
  } catch (error) {
    console.warn("Module initialization error:", error);
  }
}

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

// Search engine shortcuts (loaded from external JSON with inline fallback)
let searchEngines = [];
let apps = [];

async function ensureAppsLoaded() {
  if (allApps && allApps.length > 0) {
    return; // Already loaded
  }

  if (isLoadingApps) {
    console.warn("⚠️ Apps already loading, skipping...");
    return;
  }

  await loadApps();
}

async function loadApps() {
  if (isLoadingApps) {
    console.warn("⚠️ loadApps already in progress");
    return;
  }

  isLoadingApps = true;

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

    // Render homepage apps
    renderHomePageApps(allApps);
    renderHomePagePinnedApps();
    updateHomePageAppCounter(allApps.length);

    // renderCollectionsQuickAccess(); // Wordt nu aangeroepen na loadCollections()

    // Initialiseer sortable na het renderen
    initSortable();
  } catch (error) {
    console.error("Fout bij laden van apps:", error);
    showErrorMessage();
  } finally {
    isLoadingApps = false;
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
  renderHomePagePinnedApps(); // Update homepage pinned apps
  renderHomePageApps(allApps); // Update homepage all apps
  // Update inline favorites under search bar
  if (typeof renderInlineFavs === "function") renderInlineFavs();
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

  // Draggable management voor desktop drag vs reordering
  // Desktop: Alt+click of long-press (500ms) voor desktop drag
  // Mobiel: Long-press (500ms) voor desktop drag, normale touch voor reordering
  button.setAttribute("draggable", "false");

  let dragStartTime = 0;
  let isDragToDesktop = false;
  let altKeyPressed = false;
  let longPressTimer = null;
  let isLongPress = false;
  let touchStartTime = 0;

  // Desktop: Track Alt key state
  button.addEventListener("mousedown", (e) => {
    altKeyPressed = e.altKey;
    if (altKeyPressed) {
      button.setAttribute("draggable", "true");
      button.style.cursor = "copy";
      console.log("🎯 Alt+mousedown: Desktop drag enabled");
    }
  });

  button.addEventListener("mouseup", (e) => {
    if (!altKeyPressed) {
      button.setAttribute("draggable", "false");
      button.style.cursor = "";
    }
    altKeyPressed = false;
  });

  // Touch: Long-press for desktop drag
  button.addEventListener("touchstart", (e) => {
    touchStartTime = Date.now();
    isLongPress = false;

    // Start long-press timer (500ms)
    longPressTimer = setTimeout(() => {
      isLongPress = true;
      button.setAttribute("draggable", "true");

      // Visual feedback for long-press
      button.style.transform = "scale(1.05)";
      button.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.3)";
      button.classList.add("long-press-active");

      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      console.log("📱 Long-press detected: Desktop drag enabled");
    }, 500);
  });

  button.addEventListener("touchend", (e) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }

    // Reset visual feedback
    button.style.transform = "";
    button.style.boxShadow = "";
    button.classList.remove("long-press-active");

    // Short delay before resetting draggable to allow drag to complete
    setTimeout(() => {
      if (!isLongPress) {
        button.setAttribute("draggable", "false");
      }
      isLongPress = false;
    }, 100);
  });

  button.addEventListener("touchmove", (e) => {
    // Cancel long-press if user moves finger
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  });

  button.addEventListener("touchcancel", (e) => {
    // Cancel long-press on touch cancel
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }

    // Reset visual feedback
    button.style.transform = "";
    button.style.boxShadow = "";
    button.classList.remove("long-press-active");
    isLongPress = false;
  });

  button.addEventListener("dragstart", (e) => {
    dragStartTime = Date.now();

    // Desktop drag allowed when:
    // 1. Alt key is pressed (desktop)
    // 2. Long-press was detected (mobile)
    if ((e.altKey || isLongPress) && app.url) {
      // Alt + drag (desktop) or long-press + drag (mobile) = drag to desktop
      isDragToDesktop = true;
      e.dataTransfer.effectAllowed = "copyLink";
      e.dataTransfer.setData("text/uri-list", app.url);
      e.dataTransfer.setData("text/plain", app.url);
      e.dataTransfer.setData(
        "DownloadURL",
        `application/internet-shortcut:${app.name}.url:${app.url}`
      );

      // Visual feedback
      button.style.opacity = "0.5";
      
      if (e.altKey) {
        console.log(`🔗 Alt+Drag to desktop: ${app.name} - ${app.url}`);
      } else {
        console.log(`📱 Long-press+Drag to desktop: ${app.name} - ${app.url}`);
      }
    } else {
      // Prevent conflicting drag when Alt is not pressed
      console.log(`� Blocking drag - Alt not pressed or no URL`);
      e.preventDefault();
      return false;
    }
  });

  button.addEventListener("dragend", (e) => {
    if (isDragToDesktop) {
      button.style.opacity = "1";
      isDragToDesktop = false;
    }
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
      "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 pointer-events-none z-50 transition-opacity duration-200";
    tooltip.innerHTML = `
      <div class="bg-gray-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg dark:bg-gray-700">
        ${new URL(app.url).hostname}
        <div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
      </div>
    `;
    button.appendChild(tooltip);

    // Add custom hover handlers to prevent flickering
    let hoverTimeout = null;
    button.addEventListener("mouseenter", () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
      }
      hoverTimeout = setTimeout(() => {
        tooltip.classList.remove("opacity-0");
        tooltip.classList.add("opacity-100");
      }, 200); // 200ms delay before showing tooltip
    });

    button.addEventListener("mouseleave", () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
      }
      tooltip.classList.remove("opacity-100");
      tooltip.classList.add("opacity-0");
    });

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

      // Fallback to SVG on error (prevent multiple loads)
      let errorHandled = false;
      favicon.addEventListener("error", () => {
        if (errorHandled) return;
        errorHandled = true;

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
 * Initialiseer Sortable.js voor een specifiek grid element
 * @param {string} gridSelector - CSS selector voor het grid element
 * @param {string} saveFunction - Naam van de save functie ('saveAppOrder' of 'saveHomePageAppOrder')
 */
function initSortableForGrid(gridSelector, saveFunction = "saveAppOrder") {
  const appsGrid = document.querySelector(gridSelector);

  if (!appsGrid) {
    console.error(`Grid niet gevonden voor SortableJS: ${gridSelector}`);
    return;
  }

  if (typeof Sortable === "undefined") {
    console.error("SortableJS library niet geladen");
    return;
  }

  // Destroy existing sortable instance if any
  if (appsGrid.sortableInstance) {
    console.log(
      `🔄 Destroying existing SortableJS instance for ${gridSelector}`
    );
    appsGrid.sortableInstance.destroy();
  }

  console.log(`🔄 Initializing SortableJS for ${gridSelector}`);

  // Create new sortable instance
  const sortableInstance = Sortable.create(appsGrid, {
    animation: 150,
    ghostClass: "sortable-ghost",
    dragClass: "sortable-drag",
    chosenClass: "sortable-chosen",
    delay: 100,
    delayOnTouchOnly: true,
    touchStartThreshold: 5,
    forceFallback: false,
    preventOnFilter: false,

    // Only allow dragging on the app items, not the loading indicator
    draggable: ".app-item",

    onStart: function (evt) {
      console.log(
        `🔄 SortableJS drag started in ${gridSelector}:`,
        evt.item.getAttribute("data-name")
      );
      evt.item.classList.add("sortable-dragging");
    },

    onEnd: function (evt) {
      console.log(
        `🔄 App verplaatst van ${evt.oldIndex} naar ${evt.newIndex} in ${gridSelector}`
      );
      evt.item.classList.remove("sortable-dragging");

      // Only save if position actually changed
      if (evt.oldIndex !== evt.newIndex) {
        // Call the appropriate save function
        if (saveFunction === "saveHomePageAppOrder") {
          saveHomePageAppOrder();
        } else {
          saveAppOrder();
        }
      }
    },
  });

  // Store reference for cleanup
  appsGrid.sortableInstance = sortableInstance;
  console.log(`✅ SortableJS initialized successfully for ${gridSelector}`);
}

/**
 * Initialiseer Sortable.js voor drag & drop functionaliteit (hoofdgrid)
 */
function initSortable() {
  initSortableForGrid("#appsGrid", "saveAppOrder");
}

/**
 * Initialiseer Sortable.js voor de homepage apps grid
 */
function initHomePageSortable() {
  initSortableForGrid("#homePageAppsGrid", "saveHomePageAppOrder");
}

/**
 * Debug functie voor het testen van drag & drop
 * Roep aan vanuit console: window.debugSortable()
 */
window.debugSortable = function () {
  const appsGrid = document.querySelector("#appsGrid");
  const homePageAppsGrid = document.querySelector("#homePageAppsGrid");

  console.log("🔍 SortableJS Debug Info:");
  console.log("Main Apps Grid:", appsGrid);
  console.log("Homepage Apps Grid:", homePageAppsGrid);
  console.log("SortableJS loaded:", typeof Sortable !== "undefined");

  // Debug main grid
  if (appsGrid) {
    console.log("Main Grid - Sortable instance:", appsGrid.sortableInstance);
    console.log(
      "Main Grid - App items count:",
      appsGrid.querySelectorAll(".app-item").length
    );
    console.log(
      "Main Grid - Draggable elements:",
      appsGrid.querySelectorAll('[draggable="true"]').length
    );

    if (appsGrid.sortableInstance) {
      console.log("✅ Main Grid SortableJS is active");
    } else {
      console.log("❌ Main Grid SortableJS not initialized");
      console.log("Trying to reinitialize main grid...");
      initSortable();
    }
  }

  // Debug homepage grid
  if (homePageAppsGrid) {
    console.log(
      "Homepage Grid - Sortable instance:",
      homePageAppsGrid.sortableInstance
    );
    console.log(
      "Homepage Grid - App items count:",
      homePageAppsGrid.querySelectorAll(".app-item").length
    );
    console.log(
      "Homepage Grid - Draggable elements:",
      homePageAppsGrid.querySelectorAll('[draggable="true"]').length
    );

    if (homePageAppsGrid.sortableInstance) {
      console.log("✅ Homepage Grid SortableJS is active");
    } else {
      console.log("❌ Homepage Grid SortableJS not initialized");
      console.log("Trying to reinitialize homepage grid...");
      initHomePageSortable();
    }
  }
};

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
 * Sla de nieuwe volgorde van homepage apps op in localStorage
 */
function saveHomePageAppOrder() {
  const homePageAppsGrid = document.querySelector("#homePageAppsGrid");
  const appButtons = homePageAppsGrid.querySelectorAll("button[data-name]");

  const order = Array.from(appButtons).map((btn) =>
    btn.getAttribute("data-name")
  );

  localStorage.setItem("homePageAppOrder", JSON.stringify(order));
  console.log("Nieuwe homepage volgorde opgeslagen:", order);
}

/**
 * Laad de opgeslagen volgorde en sorteer de apps
 * @param {Array} apps - Array van apps om te sorteren
 * @param {string} storageKey - LocalStorage key voor de volgorde ('appOrder' of 'homePageAppOrder')
 */
function applySavedOrder(apps, storageKey = "appOrder") {
  const savedOrder = localStorage.getItem(storageKey);

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
    console.error(`Fout bij laden opgeslagen volgorde (${storageKey}):`, error);
    return apps;
  }
}

/**
 * Laad de opgeslagen volgorde voor homepage apps
 */
function applySavedHomePageOrder(apps) {
  return applySavedOrder(apps, "homePageAppOrder");
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
    item.className = `w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
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

  // Compact tooltip: populate and show on hover/focus of showBtn
  const compactTooltip = document.getElementById("compactHintsTooltip");
  const compactContent = document.getElementById("compactHintsContent");
  function buildCompactHints() {
    if (!compactContent) return;
    compactContent.innerHTML = "";
    const items = [
      ["Menu openen/sluiten", "Ctrl+M"],
      ["Zoeken", "Ctrl+K"],
      ["Custom app toevoegen", "Ctrl+N"],
      ["Theme wisselen", "Ctrl+T"],
      ["Workspaces beheren", "Ctrl+G"],
    ];
    items.forEach(([label, key]) => {
      const row = document.createElement("div");
      row.className = "flex justify-between items-center";
      const l = document.createElement("span");
      l.textContent = label;
      l.className = "truncate";
      const k = document.createElement("kbd");
      k.textContent = key;
      k.className = "ml-2 bg-gray-800 px-1 rounded";
      row.appendChild(l);
      row.appendChild(k);
      compactContent.appendChild(row);
    });
  }

  if (showBtn && compactTooltip) {
    buildCompactHints();
    showBtn.addEventListener("mouseenter", () => {
      compactTooltip.classList.remove("hidden");
    });
    showBtn.addEventListener("mouseleave", () => {
      compactTooltip.classList.add("hidden");
    });
    showBtn.addEventListener("focus", () =>
      compactTooltip.classList.remove("hidden")
    );
    showBtn.addEventListener("blur", () =>
      compactTooltip.classList.add("hidden")
    );
  }

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
    if (on) {
      container.classList.remove("hidden");
      if (typeof renderInlineFavs === "function") renderInlineFavs();
    } else {
      container.classList.add("hidden");
    }
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

  // Load saved preference (default: false)
  const useFavicons = localStorage.getItem("useFavicons") === "true";
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

// Setup toggle to show/hide Workspaces button
function setupShowWorkspacesToggle() {
  const toggle = document.getElementById("showWorkspacesToggle");
  const collectionsBtn = document.getElementById("collectionsBtn");

  if (!toggle || !collectionsBtn) return;

  // Default: hidden unless explicitly true in localStorage
  const enabled = localStorage.getItem("showWorkspaces") === "true";
  toggle.checked = enabled;

  if (enabled) {
    collectionsBtn.classList.remove("hidden");
  } else {
    collectionsBtn.classList.add("hidden");
  }

  toggle.addEventListener("change", (e) => {
    const on = e.target.checked;
    localStorage.setItem("showWorkspaces", on.toString());
    if (on) collectionsBtn.classList.remove("hidden");
    else collectionsBtn.classList.add("hidden");
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

  // Load saved preference (default: false)
  const showShortcuts = localStorage.getItem("showShortcuts") === "true";
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

  // Load saved state (default: false)
  const enabled = localStorage.getItem("showAppsDashboard") === "true";

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

// Setup inline favorites toggle and renderer
function setupShowInlineFavsToggle() {
  const toggle = document.getElementById("showInlineFavsToggle");
  const container = document.getElementById("inlineFavsContainer");
  if (!toggle || !container) return;

  const enabled = localStorage.getItem("showInlineFavs") === "true";
  toggle.checked = enabled;
  if (enabled) container.classList.remove("hidden");
  else container.classList.add("hidden");

  toggle.addEventListener("change", (e) => {
    const on = e.target.checked;
    localStorage.setItem("showInlineFavs", on.toString());
    if (on) container.classList.remove("hidden");
    else container.classList.add("hidden");
  });
}

// Prevent infinite loops

function renderInlineFavs() {
  // Prevent recursive calls
  if (isRenderingInlineFavs) {
    console.warn("⚠️ renderInlineFavs already in progress, skipping...");
    return;
  }

  isRenderingInlineFavs = true;

  const container = document.getElementById("inlineFavsContainer");
  if (!container) {
    isRenderingInlineFavs = false;
    return;
  }

  const enabled = localStorage.getItem("showInlineFavs") === "true";
  if (!enabled) {
    container.classList.add("hidden");
    isRenderingInlineFavs = false;
    return;
  }

  // Check if allApps is loaded - but don't trigger more loading
  if (!allApps || allApps.length === 0) {
    container.innerHTML = "";
    container.classList.add("hidden");
    isRenderingInlineFavs = false;
    return;
  }

  const pinned = allApps.filter((app) => isPinned(app.name));
  // pinned already computed above
  if (!pinned || pinned.length === 0) {
    container.innerHTML = "";
    container.classList.add("hidden");
    isRenderingInlineFavs = false;
    return;
  }

  container.classList.remove("hidden");
  container.innerHTML = "";

  // Create a compact chips row with icons and optional tags
  const row = document.createElement("div");
  row.className = "flex items-center gap-3 overflow-x-auto py-1";

  pinned.forEach((app) => {
    const btn = document.createElement("button");
    btn.className =
      "inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm hover:shadow-md";
    btn.setAttribute("aria-label", `Open ${app.name}`);
    btn.addEventListener("click", () => {
      trackAppUsage(app.name);
      if (app.url) window.open(app.url, "_blank");
    });

    // icon
    const iconWrap = document.createElement("span");
    iconWrap.className =
      "flex h-6 w-6 items-center justify-center rounded-full bg-gray-100";
    // Try favicon quickly if allowed
    const useFavicons = localStorage.getItem("useFavicons") !== "false";
    if (useFavicons && app.url) {
      try {
        const u = new URL(app.url);
        const img = document.createElement("img");
        img.className = "h-4 w-4 rounded-sm";
        img.src = `https://www.google.com/s2/favicons?sz=64&domain=${u.hostname}`;
        img.alt = app.name;
        iconWrap.appendChild(img);
      } catch (err) {
        const t = document.createElement("span");
        t.textContent = app.icon?.emoji || app.name[0];
        iconWrap.appendChild(t);
      }
    } else {
      const t = document.createElement("span");
      t.textContent = app.icon?.emoji || app.name[0];
      iconWrap.appendChild(t);
    }

    btn.appendChild(iconWrap);
    const lbl = document.createElement("span");
    lbl.className = "text-xs text-gray-700";
    lbl.textContent = app.name;
    btn.appendChild(lbl);

    // Optional small tags under label (show up to 2)
    if (app.tags && app.tags.length > 0) {
      const tags = document.createElement("div");
      tags.className = "ml-2 flex gap-1";
      app.tags.slice(0, 2).forEach((t) => {
        const tg = document.createElement("span");
        tg.className =
          "text-[10px] px-1 py-0.5 bg-blue-100 rounded-full text-blue-700";
        tg.textContent = t;
        tags.appendChild(tg);
      });
      btn.appendChild(tags);
    }

    row.appendChild(btn);
  });

  container.appendChild(row);
  isRenderingInlineFavs = false;
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
      } catch (err) {
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
    const query = searchInput.value.trim();

    // Always handle Enter key, regardless of autocomplete state
    if (e.key === "Enter") {
      e.preventDefault();

      // Check for search engine shortcuts first (higher priority)
      const searchEngineMatch = detectSearchEngine(query);

      if (searchEngineMatch) {
        console.log("🔍 Opening search engine:", searchEngineMatch);
        window.open(searchEngineMatch.fullUrl, "_blank");
        searchInput.value = "";
        hideAutocomplete();
        return;
      }

      // If autocomplete is open and has results
      if (autocompleteState.isOpen && autocompleteState.results.length > 0) {
        // If nothing selected but results exist, auto-select first result
        if (autocompleteState.selectedIndex === -1) {
          autocompleteState.selectedIndex = 0;
        }

        if (autocompleteState.selectedIndex >= 0) {
          selectAutocompleteSuggestion(
            autocompleteState.results[autocompleteState.selectedIndex]
          );
          return;
        }
      }

      // Fallback: If no results or autocomplete closed, try to match with apps directly
      if (query.length > 0) {
        const directMatch = allApps.find(
          (app) => app.name.toLowerCase() === query.toLowerCase()
        );

        if (directMatch) {
          console.log("✅ Direct app match found:", directMatch.name);
          window.open(directMatch.url, "_blank");
          searchInput.value = "";
          hideAutocomplete();
          return;
        }

        // Try fuzzy match
        const fuzzyMatches = allApps.filter(
          (app) =>
            app.name.toLowerCase().includes(query.toLowerCase()) ||
            (app.tags &&
              app.tags.some((tag) =>
                tag.toLowerCase().includes(query.toLowerCase())
              ))
        );

        if (fuzzyMatches.length > 0) {
          console.log("✅ Fuzzy match found:", fuzzyMatches[0].name);
          window.open(fuzzyMatches[0].url, "_blank");
          searchInput.value = "";
          hideAutocomplete();
          return;
        }

        // Last resort: use current AI mode for search
        const currentMode = aiModes[currentAIMode];
        console.log(`🔍 No match found, using ${currentMode.name} search`);

        // Build search URL based on current AI mode
        let searchUrl;
        const encodedQuery = encodeURIComponent(query);

        switch (currentAIMode) {
          case "gpt":
            searchUrl = `https://chat.openai.com/?q=${encodedQuery}`;
            break;
          case "claude":
            searchUrl = `https://claude.ai/new?q=${encodedQuery}`;
            break;
          case "gemini":
            searchUrl = `https://gemini.google.com/app?q=${encodedQuery}`;
            break;
          case "perplexity":
            searchUrl = `https://www.perplexity.ai/?q=${encodedQuery}`;
            break;
          case "google":
          default:
            searchUrl = `https://www.google.com/search?q=${encodedQuery}`;
            break;
        }

        window.open(searchUrl, "_blank");
        searchInput.value = "";
        hideAutocomplete();
      }

      return;
    }

    // Handle other keys only if autocomplete is open
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

    // ALSO filter the homepage apps grid
    filterHomePageApps(query);

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
    const query = searchInput.value.trim();

    // Always handle Enter key, regardless of dropdown state
    if (e.key === "Enter") {
      e.preventDefault();

      // Check for search engine shortcuts first (higher priority)
      const searchEngineMatch = detectSearchEngine(query);

      if (searchEngineMatch) {
        console.log("🔍 Opening search engine:", searchEngineMatch);
        window.open(searchEngineMatch.fullUrl, "_blank");
        searchInput.value = "";
        dropdown.classList.add("hidden");
        selectedIndex = -1;
        return;
      }

      // If dropdown is visible and has results
      if (!dropdown.classList.contains("hidden") && currentResults.length > 0) {
        // If nothing selected but results exist, auto-select first result
        if (selectedIndex === -1) {
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
          return;
        }
      }

      // Fallback: If no results or dropdown hidden, try to match with apps directly
      if (query.length > 0) {
        const directMatch = allApps.find(
          (app) => app.name.toLowerCase() === query.toLowerCase()
        );

        if (directMatch) {
          console.log("✅ Direct app match found:", directMatch.name);
          window.open(directMatch.url, "_blank");
          searchInput.value = "";
          dropdown.classList.add("hidden");
          return;
        }

        // Try fuzzy match
        const fuzzyMatches = allApps.filter(
          (app) =>
            app.name.toLowerCase().includes(query.toLowerCase()) ||
            (app.tags &&
              app.tags.some((tag) =>
                tag.toLowerCase().includes(query.toLowerCase())
              ))
        );

        if (fuzzyMatches.length > 0) {
          console.log("✅ Fuzzy match found:", fuzzyMatches[0].name);
          window.open(fuzzyMatches[0].url, "_blank");
          searchInput.value = "";
          dropdown.classList.add("hidden");
          return;
        }

        // Last resort: use current AI mode for search
        const currentMode = aiModes[currentAIMode];
        console.log(`🔍 No match found, using ${currentMode.name} search`);

        // Build search URL based on current AI mode
        let searchUrl;
        const encodedQuery = encodeURIComponent(query);

        switch (currentAIMode) {
          case "gpt":
            searchUrl = `https://chat.openai.com/?q=${encodedQuery}`;
            break;
          case "claude":
            searchUrl = `https://claude.ai/new?q=${encodedQuery}`;
            break;
          case "gemini":
            searchUrl = `https://gemini.google.com/app?q=${encodedQuery}`;
            break;
          case "perplexity":
            searchUrl = `https://www.perplexity.ai/?q=${encodedQuery}`;
            break;
          case "google":
          default:
            searchUrl = `https://www.google.com/search?q=${encodedQuery}`;
            break;
        }

        window.open(searchUrl, "_blank");
        searchInput.value = "";
        dropdown.classList.add("hidden");
      }

      return;
    }

    // Handle other keys only if dropdown is visible
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

      case "Escape":
        e.preventDefault();
        dropdown.classList.add("hidden");
        searchInput.blur();
        selectedIndex = -1;
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

/**
 * Setup homepage apps integration
 */
function setupHomePageApps() {
  // NOTE: Search is now handled by the main homePageSearch input in setupHomePageAutocomplete()
  // No separate search handler needed here

  // Setup add custom app button
  const addBtn = document.getElementById("homePageAddCustomApp");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      document.getElementById("addCustomApp")?.click();
    });
  }

  // Setup categories (categories are set up, but apps are rendered in loadApps())
  setupHomePageCategories(allApps);

  // Note: renderHomePageApps() is now called from loadApps() to ensure apps are loaded first
}

/**
 * Setup category filter for homepage
 */
function setupHomePageCategories(apps) {
  const categoryFilter = document.getElementById("homePageCategoryFilter");
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

  // Clear existing categories (except "Alle")
  const allBtn = categoryFilter.querySelector('[data-category="all"]');
  categoryFilter.innerHTML = "";
  if (allBtn) {
    // Ensure the All button uses the homepage class so querySelectorAll works
    if (!allBtn.classList.contains("homepage-category-btn")) {
      allBtn.classList.add("homepage-category-btn");
    }
    categoryFilter.appendChild(allBtn);
  }

  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.setAttribute("data-category", cat);
    btn.className =
      "homepage-category-btn whitespace-nowrap rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300";

    // Format category name with emoji
    const emoji = categoryEmojis[cat] || "📦";
    const displayName = cat
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    btn.textContent = `${emoji} ${displayName}`;

    btn.addEventListener("click", () => filterHomePageByCategory(cat));

    categoryFilter.appendChild(btn);
  });

  // All button handler - ensure proper class + listener
  if (allBtn) {
    allBtn.textContent = "📱 Alle apps";
    if (!allBtn.classList.contains("homepage-category-btn")) {
      allBtn.classList.add("homepage-category-btn");
    }
    // Remove previous listeners (defensive) and re-add
    const newAll = allBtn.cloneNode(true);
    newAll.addEventListener("click", () => filterHomePageByCategory("all"));
    // Replace to avoid duplicate listeners
    categoryFilter.replaceChild(newAll, allBtn);
  }

  // Robustness: event delegation so clicks always trigger the filter
  categoryFilter.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-category]");
    if (!btn) return;
    const cat = btn.getAttribute("data-category");
    if (cat) filterHomePageByCategory(cat);
  });
}

/**
 * Filter homepage apps by category
 */
function filterHomePageByCategory(category) {
  // Update active button
  document.querySelectorAll(".homepage-category-btn").forEach((btn) => {
    btn.classList.remove("active", "bg-blue-500", "text-white");
    btn.classList.add(
      "bg-gray-200",
      "text-gray-700",
      "dark:bg-gray-700",
      "dark:text-gray-300"
    );
  });

  const activeBtn = document.querySelector(
    `.homepage-category-btn[data-category="${category}"]`
  );
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
    renderHomePageApps(allApps);
  } else {
    const filtered = allApps.filter(
      (app) => (app.category || "").toString() === category
    );
    renderHomePageApps(filtered);
  }
}

/**
 * Filter homepage apps by search term
 */
function filterHomePageApps(searchTerm) {
  const appsGrid = document.getElementById("homePageAppsGrid");
  if (!appsGrid) return;

  const appItems = appsGrid.querySelectorAll(".app-item");
  const term = searchTerm.toLowerCase().trim();

  let visibleCount = 0;

  if (term === "") {
    // Show all apps
    appItems.forEach((item) => {
      item.style.display = "";
      visibleCount++;
    });
  } else {
    // Filter apps
    appItems.forEach((item) => {
      const appName = item.getAttribute("data-name")?.toLowerCase() || "";
      if (appName.includes(term)) {
        item.style.display = "";
        visibleCount++;
      } else {
        item.style.display = "none";
      }
    });
  }

  updateHomePageAppCounter(visibleCount, appItems.length);
}

/**
 * Update homepage app counter
 */
function updateHomePageAppCounter(visible, total) {
  const counter = document.getElementById("homePageAppCounter");
  if (!counter) return;

  if (total === undefined) {
    counter.textContent = `${visible} apps`;
  } else if (visible === total) {
    counter.textContent = `${total} apps`;
  } else {
    counter.textContent = `${visible} van ${total} apps`;
  }
}

// Prevent infinite rendering loops

/**
 * Render homepage apps
 */
function renderHomePageApps(apps) {
  const now = Date.now();

  // Throttle renders to prevent loops
  if (isRenderingHomePage || now - lastRenderTime < RENDER_THROTTLE_MS) {
    console.warn("⚠️ renderHomePageApps throttled, skipping...");
    return;
  }

  isRenderingHomePage = true;
  lastRenderTime = now;

  const appsGrid = document.getElementById("homePageAppsGrid");
  if (!appsGrid) {
    console.error("❌ homePageAppsGrid element not found!");
    isRenderingHomePage = false;
    return;
  }

  appsGrid.innerHTML = "";

  // Filter out pinned apps
  const unpinnedApps = apps.filter((app) => !isPinned(app.name));

  if (unpinnedApps.length === 0) {
    appsGrid.innerHTML = `
      <div class="col-span-4 py-8 text-center">
        <p class="text-sm text-gray-500 dark:text-gray-400">Geen apps in deze categorie</p>
      </div>
    `;
    isRenderingHomePage = false;
    return;
  }

  // Apply saved order for homepage apps
  const sortedApps = applySavedHomePageOrder(unpinnedApps);

  sortedApps.forEach((app) => {
    const appButton = createAppButton(app);
    appsGrid.appendChild(appButton);
  });

  updateHomePageAppCounter(sortedApps.length);

  // Initialize SortableJS for homepage grid
  initHomePageSortable();

  isRenderingHomePage = false;
}
/**
 * Render homepage pinned apps
 */
function renderHomePagePinnedApps() {
  const pinnedSection = document.getElementById("homePagePinnedSection");
  const pinnedAppsGrid = document.getElementById("homePagePinnedApps");

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
 * Render vastgepinde apps op de homepage (oude functie - nu deprecated)
 */
function renderHomePageFavApps() {
  const container = document.getElementById("homepageFavApps");
  if (!container) return;

  // Get pinned apps from allApps
  const pinnedAppsData = allApps.filter((app) => isPinned(app.name));

  if (pinnedAppsData.length === 0) {
    container.innerHTML = `
      <div class="py-8 text-center w-full">
        <p class="text-sm text-gray-500 dark:text-gray-400">Geen vastgepinde apps. Pin apps via het menu (Ctrl+M)</p>
      </div>
    `;
    return;
  }

  container.innerHTML = "";

  pinnedAppsData.forEach((app) => {
    const button = document.createElement("button");
    button.className =
      "group relative flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all duration-200";
    button.setAttribute("aria-label", `Open ${app.name}`);

    // Icon container
    const iconContainer = document.createElement("div");
    iconContainer.className = `flex h-10 w-10 items-center justify-center rounded-lg ${app.color.bg}`;

    // Try to load favicon
    const useFavicons = localStorage.getItem("useFavicons") !== "false";

    if (useFavicons && app.url) {
      try {
        const url = new URL(app.url);
        const domain = url.hostname;

        const favicon = document.createElement("img");
        favicon.className = "h-8 w-8 rounded-sm";
        favicon.alt = `${app.name} icon`;
        favicon.src = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;

        favicon.addEventListener("error", () => {
          favicon.remove();
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
      } catch (err) {
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
      }
    } else {
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

    // App name
    const nameSpan = document.createElement("span");
    nameSpan.className =
      "text-xs font-medium text-gray-700 dark:text-gray-300 text-center";
    nameSpan.textContent = app.name;

    // Hover tooltip (CSS-based to avoid flickering)
    const tooltip = document.createElement("div");
    tooltip.className =
      "absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10";
    tooltip.textContent = app.name;

    // Assemble button
    button.appendChild(iconContainer);
    button.appendChild(nameSpan);
    button.appendChild(tooltip);

    // Click handler
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      trackAppUsage(app.name);
      if (app.url) {
        window.open(app.url, "_blank");
      }
    });

    // Right-click context menu
    button.addEventListener("contextmenu", (e) => {
      showContextMenu(e, app.name);
    });

    container.appendChild(button);
  });
}

/**
 * ==========================================
 * INITIALIZATION
 * ==========================================
 */

// Close modals when clicking outside
function setupModalClosers() {
  // Helper function to close a modal
  function closeModal(modal) {
    if (modal) {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }
  }

  // Settings Modal
  const settingsModal = document.getElementById("settingsModal");
  const closeSettingsBtn = document.getElementById("closeSettings");

  if (settingsModal) {
    // Close when clicking outside
    settingsModal.addEventListener("click", (e) => {
      if (e.target === settingsModal) {
        closeModal(settingsModal);
      }
    });
  }

  // Close Settings button
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener("click", () => {
      closeModal(settingsModal);
    });
  }

  // Collections Modal
  const collectionsModal = document.getElementById("collectionsModal");
  if (collectionsModal) {
    collectionsModal.addEventListener("click", (e) => {
      if (e.target === collectionsModal) {
        closeModal(collectionsModal);
      }
    });
  }

  // Collection Form Modal
  const collectionFormModal = document.getElementById("collectionFormModal");
  if (collectionFormModal) {
    collectionFormModal.addEventListener("click", (e) => {
      if (e.target === collectionFormModal) {
        closeModal(collectionFormModal);
      }
    });
  }

  // Custom App Modal
  const customAppModal = document.getElementById("customAppModal");
  if (customAppModal) {
    customAppModal.addEventListener("click", (e) => {
      if (e.target === customAppModal) {
        closeModal(customAppModal);
      }
    });
  }

  // ESC key to close any modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const modals = [
        settingsModal,
        collectionsModal,
        collectionFormModal,
        customAppModal,
      ];
      modals.forEach((modal) => {
        if (modal && !modal.classList.contains("hidden")) {
          closeModal(modal);
        }
      });
    }
  });

  // Command Palette (handled in setupCommandPalette)
}

// Setup main button handlers
function setupMainButtons() {
  // Settings button
  const settingsBtn = document.getElementById("settingsBtn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      const modal = document.getElementById("settingsModal");
      if (modal) {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
      }
    });
  }

  // App Menu button (Waffel icon)
  const appMenuBtn = document.getElementById("appMenuBtn");
  const appMenu = document.getElementById("appMenu");
  if (appMenuBtn && appMenu) {
    appMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();

      if (appMenu.classList.contains("hidden")) {
        appMenu.classList.remove("hidden");
        appMenu.classList.add("menu-enter");
        appMenuBtn.setAttribute("aria-expanded", "true");
      } else {
        appMenu.classList.add("hidden");
        appMenu.classList.remove("menu-enter");
        appMenuBtn.setAttribute("aria-expanded", "false");
      }
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      if (!appMenu.contains(e.target) && !appMenuBtn.contains(e.target)) {
        appMenu.classList.add("hidden");
        appMenu.classList.remove("menu-enter");
        appMenuBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Collections button (Workspaces)
  const collectionsBtn = document.getElementById("collectionsBtn");
  if (collectionsBtn) {
    collectionsBtn.addEventListener("click", () => {
      const modal = document.getElementById("collectionsModal");
      if (modal) {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
        renderCollectionsList();
      }
    });
  }

  // Theme toggle
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }

  // Quick Add App FAB
  const quickAddAppFAB = document.getElementById("quickAddAppFAB");
  if (quickAddAppFAB) {
    quickAddAppFAB.addEventListener("click", () => {
      const modal = document.getElementById("customAppModal");
      if (modal) {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
        // Focus on the name input
        setTimeout(() => {
          const nameInput = document.getElementById("customAppName");
          if (nameInput) nameInput.focus();
        }, 100);
      }
    });
  }
}

// Setup form handlers
function setupFormHandlers() {
  // Custom App Form
  const customAppForm = document.getElementById("customAppForm");
  if (customAppForm) {
    customAppForm.addEventListener("submit", handleCustomAppSubmit);
  }

  // Collection Form
  const collectionForm = document.getElementById("collectionForm");
  if (collectionForm) {
    collectionForm.addEventListener("submit", handleCollectionSubmit);
  }

  // Export button
  const exportBtn = document.getElementById("exportConfig");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportConfiguration);
  }

  // Import button
  const importBtn = document.getElementById("importConfig");
  if (importBtn) {
    importBtn.addEventListener("click", importConfiguration);
  }

  // Add Custom App button
  const addCustomAppBtn = document.getElementById("addCustomApp");
  if (addCustomAppBtn) {
    addCustomAppBtn.addEventListener("click", () => {
      const modal = document.getElementById("customAppModal");
      if (modal) {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
        // Reset form for new app
        document.getElementById("customAppForm")?.reset();
        const title = modal.querySelector("h3");
        if (title) title.textContent = "Custom App Toevoegen";
      }
    });
  }

  // Create Collection button
  const createCollectionBtn = document.getElementById("createCollectionBtn");
  if (createCollectionBtn) {
    createCollectionBtn.addEventListener("click", () => {
      editingCollectionId = null;
      const formModal = document.getElementById("collectionFormModal");
      const collectionsModal = document.getElementById("collectionsModal");

      if (collectionsModal) {
        collectionsModal.classList.add("hidden");
        collectionsModal.classList.remove("flex");
      }

      if (formModal) {
        formModal.classList.remove("hidden");
        formModal.classList.add("flex");
        document.getElementById("collectionForm")?.reset();
        renderAppSelectionList();
      }
    });
  }
}

// Setup color pickers
function setupColorPickers() {
  // Custom App color picker
  const colorPickers = document.querySelectorAll(".color-picker");
  colorPickers.forEach((picker) => {
    picker.addEventListener("click", () => {
      const color = picker.getAttribute("data-color");
      if (color) {
        selectedColor = color;
        colorPickers.forEach((p) =>
          p.classList.remove("ring-4", "ring-blue-300")
        );
        picker.classList.add("ring-4", "ring-blue-300");
      }
    });
  });

  // Collection color picker
  const collectionColorPickers = document.querySelectorAll(
    ".collection-color-picker"
  );
  collectionColorPickers.forEach((picker) => {
    picker.addEventListener("click", () => {
      const color = picker.getAttribute("data-collection-color");
      if (color) {
        selectedCollectionColor = color;
        collectionColorPickers.forEach((p) => p.classList.remove("ring-4"));
        picker.classList.add("ring-4");
      }
    });
  });
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Ctrl+K or Cmd+K: Search
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      const appSearch = document.getElementById("appSearch");
      if (appSearch) {
        // First open the menu if not already open
        const appMenuBtn = document.getElementById("appMenuBtn");
        appMenuBtn?.click();
        setTimeout(() => appSearch.focus(), 100);
      }
    }

    // Ctrl+M or Cmd+M: Toggle menu
    if ((e.ctrlKey || e.metaKey) && e.key === "m") {
      e.preventDefault();
      document.getElementById("appMenuBtn")?.click();
    }

    // Ctrl+N or Cmd+N: New custom app
    if ((e.ctrlKey || e.metaKey) && e.key === "n") {
      e.preventDefault();
      document.getElementById("addCustomApp")?.click();
    }

    // Ctrl+T or Cmd+T: Toggle theme
    if ((e.ctrlKey || e.metaKey) && e.key === "t") {
      e.preventDefault();
      toggleTheme();
    }

    // Ctrl+G or Cmd+G: Toggle Workspaces
    if ((e.ctrlKey || e.metaKey) && e.key === "g") {
      e.preventDefault();
      document.getElementById("collectionsBtn")?.click();
    }

    // Ctrl+, or Cmd+,: Settings
    if ((e.ctrlKey || e.metaKey) && e.key === ",") {
      e.preventDefault();
      document.getElementById("settingsBtn")?.click();
    }

    // Ctrl+H or Cmd+H: Toggle apps visibility
    if ((e.ctrlKey || e.metaKey) && e.key === "h") {
      e.preventDefault();
      toggleAppsVisibility();
    }
  });
}

// Setup Apps Visibility Toggle
function setupAppsVisibilityToggle() {
  const toggleBtn = document.getElementById("appsVisibilityToggle");
  const eyeOpenIcon = document.getElementById("eyeOpenIcon");
  const eyeClosedIcon = document.getElementById("eyeClosedIcon");

  // Target homepage elements instead of dropdown menu
  const homePageAppsGrid = document.getElementById("homePageAppsGrid");
  const homePagePinnedSection = document.getElementById(
    "homePagePinnedSection"
  );
  const homePageCategoryFilter = document.getElementById(
    "homePageCategoryFilter"
  );

  if (!toggleBtn || !eyeOpenIcon || !eyeClosedIcon) {
    console.warn("Apps visibility toggle elements not found");
    return;
  }

  // Load saved state
  const isHidden = localStorage.getItem("appsVisibility") === "hidden";
  if (isHidden) {
    updateIconState(true);
    // Apply hidden state immediately
    hideAppsImmediately();
  }

  // Click handler
  toggleBtn.addEventListener("click", function () {
    console.log("Toggle button clicked");
    toggleAppsVisibility();
  });

  function toggleAppsVisibility() {
    console.log("toggleAppsVisibility called");
    const currentState = localStorage.getItem("appsVisibility");
    const isCurrentlyHidden = currentState === "hidden";

    console.log(
      "Current state:",
      currentState,
      "isCurrentlyHidden:",
      isCurrentlyHidden
    );

    if (isCurrentlyHidden) {
      showApps();
    } else {
      hideApps();
    }
  }

  function hideAppsImmediately() {
    // Hide immediately without animation (for initial page load)
    if (homePageAppsGrid) {
      homePageAppsGrid.style.display = "none";
    }
    if (homePagePinnedSection) {
      homePagePinnedSection.style.display = "none";
    }
    if (homePageCategoryFilter) {
      homePageCategoryFilter.parentElement.style.display = "none";
    }
  }

  function hideApps() {
    console.log("hideApps called");

    // Hide homepage sections with smooth animation
    if (homePageAppsGrid) {
      homePageAppsGrid.style.opacity = "0";
      homePageAppsGrid.style.transform = "scale(0.95)";
      setTimeout(() => {
        homePageAppsGrid.style.display = "none";
      }, 200);
    }

    if (homePagePinnedSection) {
      homePagePinnedSection.style.opacity = "0";
      homePagePinnedSection.style.transform = "scale(0.95)";
      setTimeout(() => {
        homePagePinnedSection.style.display = "none";
      }, 200);
    }

    // Hide category filter
    if (homePageCategoryFilter) {
      const filterContainer = homePageCategoryFilter.parentElement;
      filterContainer.style.opacity = "0";
      filterContainer.style.transform = "scale(0.95)";
      setTimeout(() => {
        filterContainer.style.display = "none";
      }, 200);
    }

    // Update icon state
    updateIconState(true);

    // Save state
    localStorage.setItem("appsVisibility", "hidden");

    // Show notification
    showToast("Apps verborgen (Ctrl+H om weer te tonen)");
  }

  function showApps() {
    console.log("showApps called");

    // Show homepage sections with smooth animation
    if (homePageAppsGrid) {
      homePageAppsGrid.style.display = "grid";
      setTimeout(() => {
        homePageAppsGrid.style.opacity = "1";
        homePageAppsGrid.style.transform = "scale(1)";
      }, 10);
    }

    // Only show pinned section if there are pinned apps
    if (homePagePinnedSection && pinnedApps.length > 0) {
      homePagePinnedSection.style.display = "block";
      setTimeout(() => {
        homePagePinnedSection.style.opacity = "1";
        homePagePinnedSection.style.transform = "scale(1)";
      }, 10);
    }

    // Show category filter
    if (homePageCategoryFilter) {
      const filterContainer = homePageCategoryFilter.parentElement;
      filterContainer.style.display = "block";
      setTimeout(() => {
        filterContainer.style.opacity = "1";
        filterContainer.style.transform = "scale(1)";
      }, 10);
    }

    // Update icon state
    updateIconState(false);

    // Save state
    localStorage.setItem("appsVisibility", "visible");

    // Show notification
    showToast("Apps zichtbaar");
  }

  function updateIconState(isHidden) {
    console.log("updateIconState called with isHidden:", isHidden);
    if (isHidden) {
      eyeOpenIcon.classList.add("hidden");
      eyeClosedIcon.classList.remove("hidden");
      toggleBtn.setAttribute("aria-label", "Toon apps (Ctrl+H)");
      toggleBtn.setAttribute("title", "Toon apps (Ctrl+H)");
    } else {
      eyeOpenIcon.classList.remove("hidden");
      eyeClosedIcon.classList.add("hidden");
      toggleBtn.setAttribute("aria-label", "Verberg apps (Ctrl+H)");
      toggleBtn.setAttribute("title", "Verberg apps (Ctrl+H)");
    }
  }

  // Make function globally accessible
  window.toggleAppsVisibility = toggleAppsVisibility;
}

// Initialize everything
/**
 * Initialize all feature modules
 */
function initializeFeatureModules() {
  console.log("🔧 Initializing feature modules...");

  try {
    // Check if modules are loaded
    if (typeof FuzzySearch === "undefined") {
      console.warn("Feature modules not loaded yet, using defaults");
      return;
    }

    // Get feature settings from localStorage or use defaults
    const savedFeatures = JSON.parse(
      localStorage.getItem("onefav_features") || "{}"
    );
    const features = { ...FEATURES, ...savedFeatures };

    // Initialize Fuzzy Search
    if (features.fuzzySearch) {
      fuzzySearch = new FuzzySearch({
        minScore: FEATURE_SETTINGS.fuzzySearch.minScore,
        maxResults: FEATURE_SETTINGS.fuzzySearch.maxResults,
        enabled: true,
      });
      console.log("✓ Fuzzy Search initialized");
    }

    // Initialize Analytics
    if (features.detailedAnalytics || features.smartSuggestions) {
      analytics = new AppAnalytics({
        enabled: features.detailedAnalytics,
        retentionDays: FEATURE_SETTINGS.usageStats.retentionDays,
      });
      console.log("✓ Analytics initialized");
    }

    // Initialize Recent Searches
    if (features.recentSearches) {
      recentSearches = new RecentSearches({
        maxItems: FEATURE_SETTINGS.recentSearches.maxItems,
        enabled: true,
      });
      console.log("✓ Recent Searches initialized");
    }

    // Initialize Tag Filter
    if (features.tagFiltering) {
      tagFilter = new TagFilter({
        enabled: true,
      });
      console.log("✓ Tag Filter initialized");
    }

    // Initialize UI Enhancements
    if (
      features.recentBadge ||
      features.usageCounter ||
      features.hoverEffects
    ) {
      uiEnhancements = new UIEnhancements({
        recentBadge: features.recentBadge,
        usageCounter: features.usageCounter,
        hoverEffects: features.hoverEffects,
        loadingSkeleton: features.loadingSkeleton,
      });
      console.log("✓ UI Enhancements initialized");
    }

    // Initialize Keyboard Shortcuts
    if (features.quickLaunchShortcuts) {
      keyboardShortcuts = new KeyboardShortcuts({
        modifier: FEATURE_SETTINGS.quickLaunchShortcuts.modifier,
        maxShortcuts: FEATURE_SETTINGS.quickLaunchShortcuts.maxShortcuts,
        enabled: true,
      });

      // Listen for app launch events
      document.addEventListener("shortcuts:appLaunch", (e) => {
        const { app } = e.detail;
        if (app && app.url) {
          window.open(app.url, "_blank");
          if (analytics) analytics.trackAppOpen(app);
        }
      });

      console.log("✓ Keyboard Shortcuts initialized");
    }

    // Initialize App Notes
    if (features.appNotes) {
      appNotes = new AppNotes();
      console.log("✓ App Notes initialized");
    }

    // Setup feature toggles in settings
    setupFeatureToggles();

    console.log("✅ All feature modules initialized successfully!");
  } catch (error) {
    console.error("❌ Error initializing feature modules:", error);
  }
}

/**
 * Setup feature toggle handlers
 */
function setupFeatureToggles() {
  const toggles = {
    fuzzySearchToggle: "fuzzySearch",
    tagFilteringToggle: "tagFiltering",
    recentSearchesToggle: "recentSearches",
    smartSuggestionsToggle: "smartSuggestions",
    recentBadgeToggle: "recentBadge",
    usageCounterToggle: "usageCounter",
    hoverEffectsToggle: "hoverEffects",
    mostUsedToggle: "mostUsed",
    usageStatsToggle: "usageStats",
    quickLaunchToggle: "quickLaunchShortcuts",
    appNotesToggle: "appNotes",
    trackUsageToggle: "detailedAnalytics",
    autoBackupToggle: "autoBackup",
  };

  // Load saved settings
  const savedFeatures = JSON.parse(
    localStorage.getItem("onefav_features") || "{}"
  );

  // Set toggle states
  Object.entries(toggles).forEach(([toggleId, featureKey]) => {
    const toggle = document.getElementById(toggleId);
    if (toggle) {
      const isEnabled =
        savedFeatures[featureKey] !== undefined
          ? savedFeatures[featureKey]
          : FEATURES[featureKey];
      toggle.checked = isEnabled;

      // Add change listener
      toggle.addEventListener("change", () => {
        savedFeatures[featureKey] = toggle.checked;
        localStorage.setItem("onefav_features", JSON.stringify(savedFeatures));

        // Show toast
        if (uiEnhancements) {
          uiEnhancements.showToast(
            `${featureKey} ${
              toggle.checked ? "ingeschakeld" : "uitgeschakeld"
            }`,
            "info"
          );
        }

        // Reload page to apply changes (for some features)
        if (["fuzzySearch", "quickLaunchShortcuts"].includes(featureKey)) {
          setTimeout(() => location.reload(), 1000);
        }
      });
    }
  });

  // Reset features button
  const resetBtn = document.getElementById("resetFeaturesBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (
        confirm(
          "Weet je zeker dat je alle features wilt resetten naar standaard?"
        )
      ) {
        localStorage.removeItem("onefav_features");
        if (uiEnhancements) {
          uiEnhancements.showToast(
            "Features gereset naar standaard",
            "success"
          );
        }
        setTimeout(() => location.reload(), 1000);
      }
    });
  }
}

async function initializeApp() {
  console.log("🚀 Initializing OneFav...");

  // Prevent double initialization
  if (window.oneFavInitialized) {
    console.warn("OneFav already initialized, skipping...");
    return;
  }
  window.oneFavInitialized = true;

  try {
    // Load theme first
    loadTheme();

    // Initialize feature modules
    initializeFeatureModules();

    // Load all data
    await loadApps();
    await loadCollections();

    // Load stats
    loadAppStats();
    loadPinnedApps();
    loadCustomApps();

    // Load search engines
    const response = await fetch("search_engines.json");
    if (response.ok) {
      const data = await response.json();
      searchEngines = data.engines || {};
    }

    // Setup UI
    setupModalClosers();
    setupMainButtons();
    setupFormHandlers();
    setupColorPickers();
    setupKeyboardShortcuts();
    setupAutocomplete();
    setupHomePageAutocomplete();
    setupAIModeButton();
    setupTagSuggestions();
    setupShowTagsToggle();
    setupUseFaviconsToggle();
    setupShowWorkspacesToggle();
    setupGridSizeToggle();
    setupHighlightSearchToggle();
    setupShowShortcutsToggle();
    setupShowAppsDashboardToggle();
    setupAppsDashboardMinimize();
    setupAppsDashboardDrag();
    setupContextMenu();
    setupAppsVisibilityToggle();

    // Apply grid size
    const savedSize = localStorage.getItem("gridSize") || "medium";
    applyGridSize(savedSize);

    // Render inline favs
    renderInlineFavs();
    setupShowInlineFavsToggle();

    // Setup and render homepage integrated apps
    setupHomePageApps();

    // Render apps dashboard
    renderAppsDashboard();
    setupDashboardCategoryFilter();

    // Setup category scroll helpers
    setupCategoryScrollHelpers();

    // Add pulse animation to FAB after a short delay (to draw attention)
    setTimeout(() => {
      const fab = document.getElementById("quickAddAppFAB");
      if (fab) {
        fab.classList.add("pulse");
        // Remove pulse class after animation completes
        setTimeout(() => {
          fab.classList.remove("pulse");
        }, 6000); // 3 pulses × 2s = 6s
      }
    }, 1500);

    console.log("✅ OneFav initialized successfully!");
  } catch (error) {
    console.error("❌ Error initializing OneFav:", error);

    // Reset state to prevent loops
    window.oneFavInitialized = false;
    isRenderingHomePage = false;

    // Show user-friendly error message
    const errorDiv = document.createElement("div");
    errorDiv.className =
      "fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50";
    errorDiv.innerHTML = `
      <strong>Fout:</strong> OneFav kon niet volledig laden.
      <button onclick="location.reload()" class="ml-2 bg-red-500 text-white px-2 py-1 rounded text-sm">
        Herlaad
      </button>
    `;
    document.body.appendChild(errorDiv);
  }
}

/**
 * Setup horizontal scroll helpers for category filters
 */
function setupCategoryScrollHelpers() {
  // Helper function to setup scroll for a container
  const setupScroll = (containerId, leftBtnId, rightBtnId) => {
    const container = document.getElementById(containerId);
    const leftBtn = document.getElementById(leftBtnId);
    const rightBtn = document.getElementById(rightBtnId);

    if (!container || !leftBtn || !rightBtn) return;

    // Check if scrollable
    const checkScrollable = () => {
      const isScrollable = container.scrollWidth > container.clientWidth;
      if (isScrollable) {
        leftBtn.classList.remove("hidden");
        rightBtn.classList.remove("hidden");
      } else {
        leftBtn.classList.add("hidden");
        rightBtn.classList.add("hidden");
      }
      updateScrollButtons();
    };

    // Update button visibility based on scroll position
    const updateScrollButtons = () => {
      const isAtStart = container.scrollLeft <= 5;
      const isAtEnd =
        container.scrollLeft >=
        container.scrollWidth - container.clientWidth - 5;

      leftBtn.style.opacity = isAtStart ? "0" : "";
      rightBtn.style.opacity = isAtEnd ? "0" : "";
      leftBtn.style.pointerEvents = isAtStart ? "none" : "";
      rightBtn.style.pointerEvents = isAtEnd ? "none" : "";
    };

    // Scroll amount (200px or half of container width)
    const getScrollAmount = () => Math.min(200, container.clientWidth / 2);

    // Left button click
    leftBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      container.scrollBy({ left: -getScrollAmount(), behavior: "smooth" });
    });

    // Right button click
    rightBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      container.scrollBy({ left: getScrollAmount(), behavior: "smooth" });
    });

    // Update on scroll
    container.addEventListener("scroll", updateScrollButtons);

    // Update on resize
    window.addEventListener("resize", checkScrollable);

    // Initial check
    checkScrollable();

    // Re-check after categories are loaded
    setTimeout(checkScrollable, 100);
    setTimeout(checkScrollable, 500);
  };

  // Setup for homepage category filter
  setupScroll(
    "homePageCategoryFilter",
    "scrollLeftHomeBtn",
    "scrollRightHomeBtn"
  );

  // Setup for menu category filter
  setupScroll("categoryFilter", "scrollLeftMenuBtn", "scrollRightMenuBtn");
}

// Start initialization when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  // DOM is already ready
  setTimeout(initializeApp, 10); // Small delay to ensure everything is ready
}
