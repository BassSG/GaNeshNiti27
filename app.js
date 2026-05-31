const DRIVE_ROOT_ID = "1nNtCyrJ0uWSMmQwcOMhr6eYDV6vmVmRn";
const CONFIG = window.GANESH_DRIVE_CONFIG || {};
const MEDIA_BATCH_SIZE = 36;

const state = {
  manifest: null,
  index: null,
  selectedFolderId: "all",
  query: "",
  sort: "newest",
  visibleLimit: MEDIA_BATCH_SIZE,
  currentItems: [],
  activeItemId: null,
  deferredInstallPrompt: null
};

const els = {};

const ICONS = {
  close: '<svg viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
  external: '<svg viewBox="0 0 24 24" fill="none"><path d="M15 3h6v6"/><path d="m10 14 11-11"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>',
  folders: '<svg viewBox="0 0 24 24" fill="none"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v1"/><path d="M3 9h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 15 4-4 5 5 3-3 6 6"/><circle cx="16" cy="9" r="1.5"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none"><path d="m15 18-6-6 6-6"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none"><path d="M20 12a8 8 0 0 1-14.7 4.4"/><path d="M4 12A8 8 0 0 1 18.7 7.6"/><path d="M18 3v5h-5"/><path d="M6 21v-5h5"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none"><path d="m9 18 6-6-6-6"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  sort: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 4v16"/><path d="m3 8 4-4 4 4"/><path d="M17 20V4"/><path d="m21 16-4 4-4-4"/></svg>',
  video: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3Z"/></svg>'
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit"
});

const shortDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  hydrateIcons();
  bindEvents();
  updateConnectionState();
  registerServiceWorker();
  hydrateInstallPrompt();
  await loadData();
  setupInfiniteLoading();
}

function cacheElements() {
  [
    "syncLabel",
    "libraryCount",
    "folderList",
    "onlineDot",
    "onlineLabel",
    "generatedLabel",
    "installButton",
    "openFoldersButton",
    "scrim",
    "breadcrumb",
    "contextTitle",
    "searchInput",
    "sortSelect",
    "refreshButton",
    "mainView",
    "statMedia",
    "statFolders",
    "statLatest",
    "mobileFolderStrip",
    "folderCards",
    "resultCount",
    "resultTitle",
    "resultNote",
    "galleryGrid",
    "emptyState",
    "loadSentinel",
    "lightbox",
    "lightboxFolder",
    "lightboxTitle",
    "openDriveLink",
    "closeLightboxButton",
    "lightboxStage",
    "previousButton",
    "nextButton",
    "lightboxMeta"
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function hydrateIcons() {
  document.querySelectorAll("[data-icon]").forEach((node) => {
    const name = node.getAttribute("data-icon");
    node.innerHTML = ICONS[name] || "";
  });
}

function bindEvents() {
  els.folderList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-folder-id]");
    if (button) {
      selectFolder(button.dataset.folderId);
    }
  });

  els.mobileFolderStrip.addEventListener("click", (event) => {
    const button = event.target.closest("[data-folder-id]");
    if (button) {
      selectFolder(button.dataset.folderId);
    }
  });

  els.folderCards.addEventListener("click", (event) => {
    const button = event.target.closest("[data-folder-id]");
    if (button) {
      selectFolder(button.dataset.folderId);
    }
  });

  els.galleryGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-item-id]");
    if (button) {
      openLightbox(button.dataset.itemId);
    }
  });

  els.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    state.visibleLimit = MEDIA_BATCH_SIZE;
    renderGallery();
  });

  els.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    state.visibleLimit = MEDIA_BATCH_SIZE;
    renderGallery();
  });

  els.refreshButton.addEventListener("click", () => loadData({ forceLive: true, bustCache: true }));

  els.openFoldersButton.addEventListener("click", () => {
    document.body.classList.add("nav-open");
  });

  els.scrim.addEventListener("click", () => {
    document.body.classList.remove("nav-open");
  });

  els.closeLightboxButton.addEventListener("click", closeLightbox);
  els.lightbox.addEventListener("click", (event) => {
    if (event.target.dataset.action === "close") {
      closeLightbox();
    }
  });
  els.previousButton.addEventListener("click", () => stepLightbox(-1));
  els.nextButton.addEventListener("click", () => stepLightbox(1));

  window.addEventListener("keydown", (event) => {
    if (els.lightbox.hidden) {
      return;
    }

    if (event.key === "Escape") {
      closeLightbox();
    }

    if (event.key === "ArrowLeft") {
      stepLightbox(-1);
    }

    if (event.key === "ArrowRight") {
      stepLightbox(1);
    }
  });

  window.addEventListener("online", updateConnectionState);
  window.addEventListener("offline", updateConnectionState);
}

async function loadData(options = {}) {
  setStatus("Loading Drive manifest");

  let manifest = await fetchLocalManifest(options.bustCache);
  let source = "Cached manifest";

  if (CONFIG.googleApiKey && (CONFIG.preferLive || options.forceLive)) {
    try {
      setStatus("Syncing Google Drive");
      manifest = await fetchLiveDriveManifest();
      source = "Live Google Drive";
    } catch (error) {
      console.warn(error);
      setStatus("Using cached manifest");
      source = "Cached manifest";
    }
  }

  state.manifest = normalizeManifest(manifest);
  state.index = buildIndex(state.manifest);
  if (state.selectedFolderId !== "all" && !state.index.folderById.has(state.selectedFolderId)) {
    state.selectedFolderId = "all";
  }
  state.visibleLimit = MEDIA_BATCH_SIZE;
  renderAll();
  setStatus(source);
}

async function fetchLocalManifest(bustCache = false) {
  const url = `public/drive-manifest.json${bustCache ? `?t=${Date.now()}` : ""}`;
  const response = await fetch(url, { cache: bustCache ? "no-store" : "default" });
  if (!response.ok) {
    throw new Error(`Unable to load manifest: ${response.status}`);
  }
  return response.json();
}

async function fetchLiveDriveManifest() {
  const rootFolderId = CONFIG.rootFolderId || DRIVE_ROOT_ID;
  const pageSize = Number(CONFIG.pageSize || 100);
  const apiKey = CONFIG.googleApiKey;

  async function driveRequest(path, params = {}) {
    const query = new URLSearchParams({
      key: apiKey,
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
      ...params
    });
    const response = await fetch(`https://www.googleapis.com/drive/v3/${path}?${query}`);
    if (!response.ok) {
      throw new Error(`Google Drive API failed: ${response.status}`);
    }
    return response.json();
  }

  async function getFolder(folderId) {
    return driveRequest(`files/${folderId}`, {
      fields: "id,name,mimeType,createdTime,modifiedTime,webViewLink"
    });
  }

  async function listChildren(folderId) {
    const files = [];
    let pageToken = "";
    do {
      const payload = await driveRequest("files", {
        pageSize: String(pageSize),
        pageToken,
        orderBy: "folder,modifiedTime desc",
        q: `'${folderId}' in parents and trashed = false`,
        fields:
          "nextPageToken,files(id,name,mimeType,createdTime,modifiedTime,webViewLink,webContentLink,thumbnailLink,imageMediaMetadata,videoMediaMetadata)"
      });
      files.push(...(payload.files || []));
      pageToken = payload.nextPageToken || "";
    } while (pageToken);
    return files;
  }

  const root = await getFolder(rootFolderId);
  const folders = [];
  const items = [];

  async function walk(folderId, pathSegments) {
    const children = await listChildren(folderId);
    const folderChildren = children.filter((file) => file.mimeType === "application/vnd.google-apps.folder");
    const mediaChildren = children.filter((file) => isSupportedMedia(file.mimeType));

    mediaChildren.forEach((file) => {
      items.push(fileToItem(file, folderId, pathSegments));
    });

    for (const folder of folderChildren) {
      const childPath = [...pathSegments, folder.name];
      folders.push({
        id: folder.id,
        name: folder.name,
        parentId: folderId,
        path: childPath.join(" / "),
        createdTime: folder.createdTime,
        modifiedTime: folder.modifiedTime
      });
      await walk(folder.id, childPath);
    }
  }

  await walk(rootFolderId, [root.name || "Google Drive"]);

  return {
    version: 1,
    source: "google-drive-api",
    generatedAt: new Date().toISOString(),
    root: {
      id: root.id,
      name: root.name || "Google Drive",
      url: root.webViewLink || `https://drive.google.com/drive/folders/${root.id}`
    },
    folders,
    items
  };
}

function normalizeManifest(manifest) {
  const root = manifest.root || {
    id: CONFIG.rootFolderId || DRIVE_ROOT_ID,
    name: "Google Drive",
    url: `https://drive.google.com/drive/folders/${CONFIG.rootFolderId || DRIVE_ROOT_ID}`
  };

  const folders = [
    {
      id: root.id,
      name: root.name,
      parentId: null,
      path: root.name,
      createdTime: manifest.generatedAt,
      modifiedTime: manifest.generatedAt,
      isRoot: true
    },
    ...(manifest.folders || [])
      .filter((folder) => folder.id !== root.id)
      .map((folder) => ({
        id: folder.id,
        name: folder.name || folder.title || "Untitled folder",
        parentId: folder.parentId || root.id,
        path: folder.path || folder.name || folder.title || "Untitled folder",
        createdTime: folder.createdTime || folder.created_time || manifest.generatedAt,
        modifiedTime: folder.modifiedTime || folder.modified_time || folder.createdTime || manifest.generatedAt
      }))
  ];

  const items = (manifest.items || []).filter((item) => item.id).map((item) => {
    const mimeType = item.mimeType || item.mime_type || "image/jpeg";
    const type = item.type || (mimeType.startsWith("video/") ? "video" : "image");
    const name = item.name || item.title || "Untitled media";
    return {
      id: item.id,
      name,
      type,
      mimeType,
      folderId: item.folderId || item.parentId || root.id,
      folderPath: item.folderPath || item.path || "",
      createdTime: item.createdTime || item.created_time || item.modifiedTime || item.modified_time || manifest.generatedAt,
      modifiedTime: item.modifiedTime || item.modified_time || item.createdTime || item.created_time || manifest.generatedAt,
      thumbnailUrl: item.thumbnailUrl || item.thumbnailLink || driveThumbnailUrl(item.id, 1000),
      fullUrl: item.fullUrl || (type === "video" ? drivePreviewUrl(item.id) : driveThumbnailUrl(item.id, 2400)),
      previewUrl: item.previewUrl || drivePreviewUrl(item.id),
      viewUrl: item.viewUrl || item.webViewLink || `https://drive.google.com/file/d/${item.id}/view`,
      width: item.width || item.imageMediaMetadata?.width || item.videoMediaMetadata?.width || null,
      height: item.height || item.imageMediaMetadata?.height || item.videoMediaMetadata?.height || null
    };
  });

  return {
    version: manifest.version || 1,
    source: manifest.source || "static",
    generatedAt: manifest.generatedAt || new Date().toISOString(),
    root,
    folders,
    items
  };
}

function fileToItem(file, folderId, pathSegments) {
  const type = file.mimeType.startsWith("video/") ? "video" : "image";
  return {
    id: file.id,
    name: file.name,
    type,
    mimeType: file.mimeType,
    folderId,
    folderPath: pathSegments.join(" / "),
    createdTime: file.createdTime,
    modifiedTime: file.imageMediaMetadata?.time || file.modifiedTime || file.createdTime,
    thumbnailUrl: driveThumbnailUrl(file.id, type === "video" ? 900 : 1000),
    fullUrl: type === "video" ? drivePreviewUrl(file.id) : driveThumbnailUrl(file.id, 2400),
    previewUrl: drivePreviewUrl(file.id),
    viewUrl: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
    width: file.imageMediaMetadata?.width || file.videoMediaMetadata?.width || null,
    height: file.imageMediaMetadata?.height || file.videoMediaMetadata?.height || null
  };
}

function buildIndex(manifest) {
  const folderById = new Map();
  const childrenByParent = new Map();
  const itemsByFolder = new Map();
  const descendantsCache = new Map();

  manifest.folders.forEach((folder) => {
    folderById.set(folder.id, folder);
    if (!childrenByParent.has(folder.parentId)) {
      childrenByParent.set(folder.parentId, []);
    }
    childrenByParent.get(folder.parentId).push(folder);
  });

  childrenByParent.forEach((children) => {
    children.sort((a, b) => a.name.localeCompare(b.name, "th"));
  });

  manifest.items.forEach((item) => {
    if (!itemsByFolder.has(item.folderId)) {
      itemsByFolder.set(item.folderId, []);
    }
    itemsByFolder.get(item.folderId).push(item);
  });

  function descendants(folderId) {
    if (descendantsCache.has(folderId)) {
      return descendantsCache.get(folderId);
    }

    const set = new Set([folderId]);
    (childrenByParent.get(folderId) || []).forEach((child) => {
      descendants(child.id).forEach((id) => set.add(id));
    });
    descendantsCache.set(folderId, set);
    return set;
  }

  function itemCount(folderId) {
    let count = 0;
    descendants(folderId).forEach((id) => {
      count += (itemsByFolder.get(id) || []).length;
    });
    return count;
  }

  function latestItem(folderId) {
    const folderIds = descendants(folderId);
    return manifest.items
      .filter((item) => folderIds.has(item.folderId))
      .sort((a, b) => getTime(b.modifiedTime) - getTime(a.modifiedTime))[0];
  }

  return {
    folderById,
    childrenByParent,
    itemsByFolder,
    descendants,
    itemCount,
    latestItem
  };
}

function renderAll() {
  renderNavigation();
  renderStats();
  renderContext();
  renderMobileStrip();
  renderFolderCards();
  renderGallery();
}

function renderNavigation() {
  const rootId = state.manifest.root.id;
  const totalItems = state.manifest.items.length;
  els.libraryCount.textContent = `${formatNumber(totalItems)} items`;

  const nodes = [
    folderButtonHtml({
      id: "all",
      name: "All Media",
      count: totalItems,
      depth: 0,
      active: state.selectedFolderId === "all"
    }),
    ...renderFolderTree(rootId, 0)
  ];

  els.folderList.innerHTML = nodes.join("");
  hydrateIconsIn(els.folderList);
}

function renderFolderTree(parentId, depth) {
  return (state.index.childrenByParent.get(parentId) || []).flatMap((folder) => [
    folderButtonHtml({
      id: folder.id,
      name: folder.name,
      count: state.index.itemCount(folder.id),
      depth,
      active: state.selectedFolderId === folder.id
    }),
    ...renderFolderTree(folder.id, depth + 1)
  ]);
}

function folderButtonHtml({ id, name, count, depth, active }) {
  return `
    <button class="folder-item ${active ? "is-active" : ""}" type="button" data-folder-id="${escapeAttr(id)}" style="--depth: ${depth}">
      <span data-icon="folders"></span>
      <span data-role="name">${escapeHtml(name)}</span>
      <small>${formatNumber(count)}</small>
    </button>
  `;
}

function renderStats() {
  const items = state.manifest.items;
  const latest = items.slice().sort((a, b) => getTime(b.modifiedTime) - getTime(a.modifiedTime))[0];
  els.statMedia.textContent = formatNumber(items.length);
  els.statFolders.textContent = formatNumber(Math.max(state.manifest.folders.length - 1, 0));
  els.statLatest.textContent = latest ? formatShortDate(latest.modifiedTime) : "-";
  els.generatedLabel.textContent = `Updated ${formatDateTime(state.manifest.generatedAt)}`;
}

function renderContext() {
  const selected = getSelectedFolder();
  const title = selected ? selected.name : "All Media";
  const path = selected && selected.id !== state.manifest.root.id ? selected.path : "All Media";
  els.contextTitle.textContent = title;
  els.breadcrumb.textContent = path;
}

function renderMobileStrip() {
  const rootId = state.manifest.root.id;
  const topFolders = state.index.childrenByParent.get(rootId) || [];
  const buttons = [
    quickFolderButton("all", "All", state.selectedFolderId === "all"),
    ...topFolders.map((folder) => quickFolderButton(folder.id, folder.name, state.selectedFolderId === folder.id))
  ];
  els.mobileFolderStrip.innerHTML = buttons.join("");
}

function quickFolderButton(id, name, active) {
  return `<button class="${active ? "is-active" : ""}" type="button" data-folder-id="${escapeAttr(id)}">${escapeHtml(name)}</button>`;
}

function renderFolderCards() {
  const selectedId = state.selectedFolderId === "all" ? state.manifest.root.id : state.selectedFolderId;
  const children = state.index.childrenByParent.get(selectedId) || [];

  els.folderCards.innerHTML = children
    .map((folder) => {
      const cover = state.index.latestItem(folder.id);
      const count = state.index.itemCount(folder.id);
      return `
        <button class="folder-card" type="button" data-folder-id="${escapeAttr(folder.id)}">
          <span class="folder-card-preview ${cover ? "is-loading" : ""}">
            ${cover ? `<img src="${escapeAttr(cover.thumbnailUrl)}" alt="" loading="lazy" decoding="async" />` : ""}
          </span>
          <span>
            <span>${formatNumber(count)} media</span>
            <strong>${escapeHtml(folder.name)}</strong>
            <p>${escapeHtml(folder.path)}</p>
          </span>
        </button>
      `;
    })
    .join("");
  wireImageFallbacks(els.folderCards);
}

function renderGallery() {
  const items = getFilteredItems();
  state.currentItems = items;
  const visible = items.slice(0, state.visibleLimit);

  els.resultCount.textContent = `${formatNumber(items.length)} results`;
  els.resultTitle.textContent = state.selectedFolderId === "all" ? "Full library" : getSelectedFolder()?.name || "Gallery";
  els.resultNote.textContent = resultNote(items);

  els.galleryGrid.innerHTML = visible.map(mediaCardHtml).join("");
  hydrateIconsIn(els.galleryGrid);
  wireImageFallbacks(els.galleryGrid);
  els.emptyState.hidden = items.length > 0;
}

function getFilteredItems() {
  const selectedFolderIds =
    state.selectedFolderId === "all"
      ? new Set(state.manifest.folders.map((folder) => folder.id))
      : state.index.descendants(state.selectedFolderId);

  const query = state.query;
  const items = state.manifest.items.filter((item) => {
    if (!selectedFolderIds.has(item.folderId)) {
      return false;
    }

    if (!query) {
      return true;
    }

    const folder = state.index.folderById.get(item.folderId);
    return `${item.name} ${folder?.name || ""} ${folder?.path || ""}`.toLowerCase().includes(query);
  });

  return sortItems(items, state.sort);
}

function sortItems(items, sortMode) {
  return items.slice().sort((a, b) => {
    if (sortMode === "oldest") {
      return getTime(a.modifiedTime) - getTime(b.modifiedTime);
    }

    if (sortMode === "name") {
      return a.name.localeCompare(b.name, "th");
    }

    return getTime(b.modifiedTime) - getTime(a.modifiedTime);
  });
}

function mediaCardHtml(item, index) {
  const shapeClass = mediaShapeClass(item, index);
  const typeIcon = item.type === "video" ? "video" : "image";
  return `
    <article class="media-card ${shapeClass}">
      <button class="media-button is-loading" type="button" data-item-id="${escapeAttr(item.id)}" aria-label="${escapeAttr(item.name)}">
        <img src="${escapeAttr(item.thumbnailUrl)}" alt="${escapeAttr(item.name)}" loading="lazy" decoding="async" />
        <span class="media-fallback" aria-hidden="true">
          <span data-icon="${typeIcon}"></span>
          <strong>Drive preview</strong>
        </span>
        <span class="media-overlay">
          <span class="media-name">${escapeHtml(item.name)}</span>
          <span class="media-type"><span data-icon="${typeIcon}"></span>${item.type === "video" ? "Video" : "Photo"}</span>
        </span>
      </button>
    </article>
  `;
}

function mediaShapeClass(item, index) {
  if (item.width && item.height) {
    const ratio = item.width / item.height;
    if (ratio > 1.45) {
      return "is-wide";
    }
    if (ratio < 0.78) {
      return "is-tall";
    }
  }

  const seed = hashString(item.id || String(index)) % 9;
  if (seed === 0 || seed === 5) {
    return "is-wide";
  }
  if (seed === 3) {
    return "is-tall";
  }
  return "";
}

function resultNote(items) {
  if (!items.length) {
    return "No matching media in this view.";
  }

  const first = items[0];
  const folder = state.index.folderById.get(first.folderId);
  return `${state.sort === "oldest" ? "Oldest" : state.sort === "name" ? "Name order" : "Newest"} first. Latest visible item from ${folder?.name || "Drive"}.`;
}

function selectFolder(folderId) {
  state.selectedFolderId = folderId;
  state.visibleLimit = MEDIA_BATCH_SIZE;
  document.body.classList.remove("nav-open");
  renderAll();
  els.mainView?.scrollTo?.({ top: 0, behavior: "smooth" });
}

function getSelectedFolder() {
  if (state.selectedFolderId === "all") {
    return null;
  }
  return state.index.folderById.get(state.selectedFolderId);
}

function openLightbox(itemId) {
  state.activeItemId = itemId;
  renderLightbox();
  els.lightbox.hidden = false;
  document.body.style.overflow = "hidden";
}

function renderLightbox() {
  const item = state.currentItems.find((candidate) => candidate.id === state.activeItemId) || state.manifest.items.find((candidate) => candidate.id === state.activeItemId);
  if (!item) {
    return;
  }

  const folder = state.index.folderById.get(item.folderId);
  const index = state.currentItems.findIndex((candidate) => candidate.id === item.id);

  els.lightboxFolder.textContent = folder?.path || "Google Drive";
  els.lightboxTitle.textContent = item.name;
  els.lightboxMeta.textContent = `${formatDateTime(item.modifiedTime)} | ${item.type === "video" ? "Video" : "Photo"}`;
  els.openDriveLink.href = item.viewUrl;
  els.previousButton.disabled = index <= 0;
  els.nextButton.disabled = index === -1 || index >= state.currentItems.length - 1;

  els.lightboxStage.innerHTML = "";
  if (item.type === "video") {
    const iframe = document.createElement("iframe");
    iframe.src = item.previewUrl;
    iframe.title = item.name;
    iframe.allow = "autoplay; encrypted-media; picture-in-picture";
    iframe.allowFullscreen = true;
    els.lightboxStage.appendChild(iframe);
  } else {
    const image = document.createElement("img");
    image.src = item.fullUrl;
    image.alt = item.name;
    image.decoding = "async";
    image.loading = "eager";
    image.onerror = () => {
      image.onerror = null;
      image.src = item.thumbnailUrl;
    };
    els.lightboxStage.appendChild(image);
    fitLightboxImage(image);
    const fallbackTimer = window.setTimeout(() => {
      if (!image.complete || !image.naturalWidth) {
        renderDrivePreviewFrame(item);
      }
    }, 4500);
    image.onload = () => window.clearTimeout(fallbackTimer);
  }
}

function renderDrivePreviewFrame(item) {
  els.lightboxStage.innerHTML = "";
  const iframe = document.createElement("iframe");
  iframe.src = item.previewUrl;
  iframe.title = item.name;
  iframe.allow = "autoplay; encrypted-media; picture-in-picture";
  iframe.allowFullscreen = true;
  els.lightboxStage.appendChild(iframe);
}

function fitLightboxImage(image) {
  window.requestAnimationFrame(() => {
    const stageRect = els.lightboxStage.getBoundingClientRect();
    image.style.maxWidth = `${Math.max(240, stageRect.width)}px`;
    image.style.maxHeight = `${Math.max(240, stageRect.height)}px`;
  });
}

function stepLightbox(delta) {
  const index = state.currentItems.findIndex((item) => item.id === state.activeItemId);
  const nextItem = state.currentItems[index + delta];
  if (!nextItem) {
    return;
  }
  state.activeItemId = nextItem.id;
  renderLightbox();
}

function closeLightbox() {
  els.lightbox.hidden = true;
  state.activeItemId = null;
  els.lightboxStage.innerHTML = "";
  document.body.style.overflow = "";
}

function setupInfiniteLoading() {
  const observer = new IntersectionObserver(
    (entries) => {
      const [entry] = entries;
      if (!entry.isIntersecting || state.visibleLimit >= state.currentItems.length) {
        return;
      }
      state.visibleLimit += MEDIA_BATCH_SIZE;
      renderGallery();
    },
    { root: els.mainView || null, rootMargin: "800px" }
  );
  observer.observe(els.loadSentinel);
}

function setStatus(message) {
  els.syncLabel.textContent = message;
}

function updateConnectionState() {
  const online = navigator.onLine;
  els.onlineDot.classList.toggle("is-offline", !online);
  els.onlineLabel.textContent = online ? "Online" : "Offline";
}

function hydrateInstallPrompt() {
  els.installButton.addEventListener("click", async () => {
    if (!state.deferredInstallPrompt) {
      setStatus("Install from browser menu");
      return;
    }

    state.deferredInstallPrompt.prompt();
    await state.deferredInstallPrompt.userChoice;
    state.deferredInstallPrompt = null;
    els.installButton.disabled = true;
    els.installButton.querySelector("span:last-child").textContent = "Install Ready";
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    els.installButton.disabled = false;
    els.installButton.querySelector("span:last-child").textContent = "Install App";
  });

  window.addEventListener("appinstalled", () => {
    state.deferredInstallPrompt = null;
    els.installButton.disabled = true;
    els.installButton.querySelector("span:last-child").textContent = "Installed";
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  }
}

function hydrateIconsIn(root) {
  root.querySelectorAll("[data-icon]").forEach((node) => {
    const name = node.getAttribute("data-icon");
    node.innerHTML = ICONS[name] || "";
  });
}

function wireImageFallbacks(root) {
  root.querySelectorAll("img").forEach((image) => {
    const host = image.closest(".media-button, .folder-card-preview");
    if (!host) {
      return;
    }

    const markLoaded = () => {
      host.classList.remove("is-loading", "is-broken");
    };
    const markBroken = () => {
      host.classList.remove("is-loading");
      host.classList.add("is-broken");
    };

    if (image.complete && image.naturalWidth > 0) {
      markLoaded();
      return;
    }

    image.addEventListener("load", markLoaded, { once: true });
    image.addEventListener("error", markBroken, { once: true });
    window.setTimeout(() => {
      if (!image.complete || !image.naturalWidth) {
        markBroken();
      }
    }, 6500);
  });
}

function isSupportedMedia(mimeType = "") {
  return mimeType.startsWith("image/") || mimeType.startsWith("video/");
}

function driveThumbnailUrl(fileId, width) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${width}`;
}

function drivePreviewUrl(fileId) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
}

function getTime(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }
  return dateTimeFormatter.format(new Date(value));
}

function formatShortDate(value) {
  if (!value) {
    return "-";
  }
  return shortDateFormatter.format(new Date(value));
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
