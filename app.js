const DRIVE_ROOT_ID = "1nNtCyrJ0uWSMmQwcOMhr6eYDV6vmVmRn";
const CONFIG = window.GANESH_DRIVE_CONFIG || {};
const MEDIA_BATCH_SIZE = 36;
const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
const UPLOAD_FOLDER_NAME = CONFIG.uploadFolderName || "Upload";
const GOOGLE_DRIVE_UPLOAD_SCOPE = "https://www.googleapis.com/auth/drive";
const LOCAL_UPLOAD_CACHE_KEY = "ganeshUploadManifestCache";
const RESUMABLE_CHUNK_SIZE = 8 * 1024 * 1024;
const UPLOAD_RETRY_LIMIT = 3;
const UPLOAD_RETRY_BASE_DELAY = 900;
const RECENT_LIMIT = 1253;
const HOME_VIEW_KEY = "ganeshHomeView";

const state = {
  manifest: null,
  index: null,
  selectedFolderId: "all",
  homeView: readInitialHomeView(),
  query: "",
  sort: "newest",
  visibleLimit: MEDIA_BATCH_SIZE,
  currentItems: [],
  activeItemId: null,
  deferredInstallPrompt: null,
  uploadAccessToken: "",
  uploadTokenExpiresAt: 0,
  uploadClientId: "",
  uploadTokenClient: null,
  uploadTokenReject: null,
  pendingUploadFiles: [],
  uploadWakeLock: null,
  isUploading: false
};

const els = {};

const ICONS = {
  close: '<svg viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
  external: '<svg viewBox="0 0 24 24" fill="none"><path d="M15 3h6v6"/><path d="m10 14 11-11"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>',
  folders: '<svg viewBox="0 0 24 24" fill="none"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v1"/><path d="M3 9h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 15 4-4 5 5 3-3 6 6"/><circle cx="16" cy="9" r="1.5"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none"><path d="m15 18-6-6 6-6"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none"><path d="M20 12a8 8 0 0 1-14.7 4.4"/><path d="M4 12A8 8 0 0 1 18.7 7.6"/><path d="M18 3v5h-5"/><path d="M6 21v-5h5"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none"><path d="m9 18 6-6-6-6"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>',
  sort: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 4v16"/><path d="m3 8 4-4 4 4"/><path d="M17 20V4"/><path d="m21 16-4 4-4-4"/></svg>',
  archive: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16"/><path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7"/><path d="M9 11h6"/><path d="M8 3h8l2 4H6Z"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/><path d="M5 21h14"/></svg>',
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
  prewarmGoogleUpload();
  await loadData();
  setupMobileChromeAutoHide();
  setupInfiniteLoading();
}

function cacheElements() {
  [
    "syncLabel",
    "libraryCount",
    "quickNav",
    "driveAllCount",
    "driveRecentCount",
    "folderList",
    "onlineDot",
    "onlineLabel",
    "generatedLabel",
    "installButton",
    "uploadButton",
    "uploadInput",
    "uploadStatus",
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
    "homeViewSwitch",
    "mobileFolderStrip",
    "mobileHomeButton",
    "mobileFoldersButton",
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
    "downloadDriveLink",
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

  els.quickNav.addEventListener("click", (event) => {
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
    const folderButton = event.target.closest("[data-folder-id]");
    if (folderButton) {
      selectFolder(folderButton.dataset.folderId);
      return;
    }

    const button = event.target.closest("[data-item-id]");
    if (button) {
      openLightbox(button.dataset.itemId);
    }
  });

  els.homeViewSwitch.addEventListener("click", (event) => {
    const button = event.target.closest("[data-home-view]");
    if (button) {
      setHomeView(button.dataset.homeView);
    }
  });

  els.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    state.visibleLimit = MEDIA_BATCH_SIZE;
    renderHomeViewSwitch();
    renderGallery();
  });

  els.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    state.visibleLimit = MEDIA_BATCH_SIZE;
    renderGallery();
  });

  els.refreshButton.addEventListener("click", refreshLiveDrive);
  els.uploadButton.addEventListener("click", () => {
    els.uploadInput.value = "";
    els.uploadInput.click();
  });
  els.uploadInput.addEventListener("change", (event) => uploadSelectedFiles(Array.from(event.target.files || [])));
  els.uploadStatus.addEventListener("click", (event) => {
    const button = event.target.closest("[data-upload-action]");
    if (button?.dataset.uploadAction === "connect") {
      connectPendingUpload();
      return;
    }

    const driveButton = event.target.closest("[data-drive-action]");
    if (driveButton?.dataset.driveAction === "refresh") {
      connectAndRefreshDrive();
    }
  });

  els.openFoldersButton.addEventListener("click", () => {
    document.body.classList.add("nav-open");
  });

  els.mobileHomeButton.addEventListener("click", () => {
    selectFolder("all");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  els.mobileFoldersButton.addEventListener("click", () => {
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
  window.addEventListener("beforeunload", warnBeforeLeavingUpload);
  document.addEventListener("visibilitychange", () => {
    if (state.isUploading && document.visibilityState === "visible") {
      requestUploadWakeLock();
    }
  });
}

function setupMobileChromeAutoHide() {
  const scroller = els.mainView;
  if (!scroller) {
    return;
  }

  let lastScrollTop = scroller.scrollTop;
  let ticking = false;

  const updateChrome = () => {
    const currentTop = scroller.scrollTop;
    const delta = currentTop - lastScrollTop;
    const isMobile = window.matchMedia("(max-width: 860px)").matches;
    const lightboxOpen = els.lightbox && !els.lightbox.hidden;

    if (!isMobile || document.body.classList.contains("nav-open") || lightboxOpen || currentTop < 56) {
      document.body.classList.remove("mobile-chrome-hidden");
    } else if (delta > 8 && currentTop > 132) {
      document.body.classList.add("mobile-chrome-hidden");
    } else if (delta < -8) {
      document.body.classList.remove("mobile-chrome-hidden");
    }

    lastScrollTop = Math.max(currentTop, 0);
    ticking = false;
  };

  scroller.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(updateChrome);
        ticking = true;
      }
    },
    { passive: true }
  );

  window.addEventListener("resize", () => {
    if (!window.matchMedia("(max-width: 860px)").matches) {
      document.body.classList.remove("mobile-chrome-hidden");
    }
  });
}

async function loadData(options = {}) {
  setStatus("Loading Drive manifest");

  let manifest = null;
  let source = "Cached manifest";
  const googleClientId = getGoogleClientId();

  if (options.forceLive && googleClientId) {
    try {
      setStatus("Signing in to refresh Drive");
      const accessToken = options.accessToken || (await getUploadAccessToken(googleClientId));
      setStatus("Reading Google Drive folders");
      manifest = await fetchAuthorizedDriveManifest(accessToken);
      source = "Live Google Drive";
    } catch (error) {
      console.warn(error);
      if (options.strictLive) {
        throw error;
      }
      setUploadStatus("Could not read live Drive yet. Using saved gallery.", true);
      source = "Cached manifest";
    }
  }

  if (!manifest && CONFIG.googleApiKey && (CONFIG.preferLive || options.forceLive)) {
    try {
      setStatus("Syncing Google Drive");
      manifest = await fetchLiveDriveManifest();
      source = "Live Google Drive";
    } catch (error) {
      console.warn(error);
      if (options.strictLive) {
        throw error;
      }
      setStatus("Using cached manifest");
      source = "Cached manifest";
    }
  }

  if (!manifest) {
    manifest = await fetchLocalManifest(options.bustCache);
  }

  state.manifest = normalizeManifest(manifest);
  if (source === "Live Google Drive") {
    persistUploadFolderSnapshot(state.manifest);
  }
  mergePersistedUploads(state.manifest);
  state.index = buildIndex(state.manifest);
  if (!isBuiltInView(state.selectedFolderId) && !state.index.folderById.has(state.selectedFolderId)) {
    state.selectedFolderId = "all";
  }
  state.visibleLimit = MEDIA_BATCH_SIZE;
  renderAll();
  setStatus(source);
}

async function refreshLiveDrive() {
  const googleClientId = getGoogleClientId();
  if (!googleClientId) {
    await loadData({ forceLive: true, bustCache: true });
    return;
  }

  if (!hasFreshUploadToken()) {
    setDriveRefreshPrompt();
    return;
  }

  await runLiveDriveRefresh(state.uploadAccessToken);
}

async function connectAndRefreshDrive() {
  const googleClientId = getGoogleClientId();
  if (!googleClientId) {
    await loadData({ forceLive: true, bustCache: true });
    return;
  }

  try {
    els.refreshButton.disabled = true;
    setUploadProgress(2, "Connecting to Google Drive", "Approve access once to scan new folders.");
    const accessToken = await getUploadAccessToken(googleClientId);
    await runLiveDriveRefresh(accessToken);
  } catch (error) {
    console.error(error);
    setDriveRefreshPrompt(uploadErrorMessage(error), true);
  } finally {
    els.refreshButton.disabled = false;
  }
}

async function runLiveDriveRefresh(accessToken) {
  try {
    els.refreshButton.disabled = true;
    setUploadProgress(5, "Refreshing Drive", "Scanning folders and media from Google Drive.");
    await loadData({ accessToken, forceLive: true, bustCache: true, strictLive: true });
    setUploadProgress(
      100,
      "Refresh complete",
      `${formatNumber(state.manifest.folders.length - 1)} folders and ${formatNumber(state.manifest.items.length)} media loaded`
    );
  } catch (error) {
    console.error(error);
    setDriveRefreshPrompt(uploadErrorMessage(error), true);
  } finally {
    els.refreshButton.disabled = false;
  }
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

  return fetchDriveManifestWithRequest(driveRequest, "google-drive-api");
}

async function fetchAuthorizedDriveManifest(accessToken) {
  return fetchDriveManifestWithRequest(
    (path, params) => driveAuthorizedRequest(path, accessToken, params),
    "google-drive-oauth"
  );
}

async function fetchDriveManifestWithRequest(driveRequest, source) {
  const rootFolderId = CONFIG.rootFolderId || DRIVE_ROOT_ID;
  const pageSize = Number(CONFIG.pageSize || 100);

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
    source,
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

async function uploadSelectedFiles(files) {
  const mediaFiles = files.filter(isSupportedUploadFile);
  if (!mediaFiles.length) {
    setUploadStatus("Choose photos or videos to upload.", true);
    return;
  }

  const googleClientId = getGoogleClientId();
  if (!googleClientId) {
    setUploadStatus("Upload needs Google connection setup. Opening Drive folder for now.", true);
    window.open(CONFIG.uploadFolderId ? driveFolderUrl(CONFIG.uploadFolderId) : driveFolderUrl(CONFIG.rootFolderId || DRIVE_ROOT_ID), "_blank", "noopener");
    return;
  }

  if (!hasFreshUploadToken()) {
    state.pendingUploadFiles = mediaFiles;
    setUploadConnectPrompt(mediaFiles.length);
    return;
  }

  await performUpload(mediaFiles, state.uploadAccessToken);
}

async function connectPendingUpload() {
  const mediaFiles = state.pendingUploadFiles.slice();
  if (!mediaFiles.length) {
    setUploadStatus("Choose photos or videos to upload.", true);
    return;
  }

  const googleClientId = getGoogleClientId();
  if (!googleClientId) {
    setUploadStatus("Upload needs Google connection setup. Opening Drive folder for now.", true);
    window.open(CONFIG.uploadFolderId ? driveFolderUrl(CONFIG.uploadFolderId) : driveFolderUrl(CONFIG.rootFolderId || DRIVE_ROOT_ID), "_blank", "noopener");
    return;
  }

  try {
    els.uploadButton.disabled = true;
    els.refreshButton.disabled = true;
    setUploadProgress(2, "Connecting to Google Drive", "Approve access once, then upload will start.");
    const accessToken = await getUploadAccessToken(googleClientId);
    state.pendingUploadFiles = [];
    await performUpload(mediaFiles, accessToken);
  } catch (error) {
    console.error(error);
    state.pendingUploadFiles = mediaFiles;
    setUploadConnectPrompt(mediaFiles.length, uploadErrorMessage(error), true);
  } finally {
    els.uploadButton.disabled = false;
    els.refreshButton.disabled = false;
  }
}

async function performUpload(mediaFiles, accessToken) {
  state.isUploading = true;
  const wakeLocked = await requestUploadWakeLock();

  try {
    els.uploadButton.disabled = true;
    els.refreshButton.disabled = true;
    const totalBytes = mediaFiles.reduce((sum, file) => sum + Math.max(file.size || 0, 1), 0);
    let processedBytes = 0;

    setUploadProgress(
      2,
      "Upload Safe Mode",
      wakeLocked ? "Screen stays awake while uploading." : "Auto retry is on. Keep this app open while uploading."
    );
    setUploadProgress(6, "Connecting to Drive", "Checking the Upload folder");
    const uploadFolder = await ensureUploadFolder(accessToken);
    ensureUploadFolderInManifest(uploadFolder);

    const uploadedItems = [];
    const failedItems = [];
    for (let index = 0; index < mediaFiles.length; index += 1) {
      const file = mediaFiles[index];
      const fileSize = Math.max(file.size || 0, 1);
      const fileLabel = `${formatNumber(index + 1)} of ${formatNumber(mediaFiles.length)} - ${file.name}`;
      try {
        setUploadProgress(uploadPercent(processedBytes, totalBytes), "Uploading safely", fileLabel);
        const uploadedFile = await uploadFileWithRetry(file, uploadFolder.id, accessToken, {
          onProgress: (loaded) => {
            setUploadProgress(
              uploadPercent(processedBytes + Math.min(loaded, fileSize), totalBytes),
              "Uploading safely",
              fileLabel
            );
          },
          onRetry: (attempt) => {
            setUploadProgress(
              uploadPercent(processedBytes, totalBytes),
              "Retrying upload",
              `${fileLabel} - retry ${formatNumber(attempt)} of ${formatNumber(UPLOAD_RETRY_LIMIT)}`
            );
          }
        });
        processedBytes += fileSize;
        setUploadProgress(uploadPercent(processedBytes, totalBytes), "Processing in Drive", fileLabel);
        uploadedItems.push(addUploadedItemToManifest(uploadedFile, uploadFolder));
      } catch (error) {
        console.error(error);
        processedBytes += fileSize;
        failedItems.push({ file, error });
      }
    }

    if (uploadedItems.length) {
      state.manifest.generatedAt = new Date().toISOString();
      state.index = buildIndex(state.manifest);
      state.selectedFolderId = uploadFolder.id;
      state.visibleLimit = MEDIA_BATCH_SIZE;
      renderAll();
      persistUploadedItems(uploadFolder, uploadedItems);
    }

    if (failedItems.length) {
      setUploadStatus(
        `${formatNumber(uploadedItems.length)} uploaded, ${formatNumber(failedItems.length)} need retry. Select failed files again when ready.`,
        true
      );
      return;
    }

    setUploadProgress(100, "Upload complete", `${formatNumber(uploadedItems.length)} file${uploadedItems.length > 1 ? "s" : ""} added to ${uploadFolder.name}`);
  } catch (error) {
    console.error(error);
    setUploadStatus(uploadErrorMessage(error), true);
  } finally {
    state.isUploading = false;
    releaseUploadWakeLock();
    els.uploadButton.disabled = false;
    els.refreshButton.disabled = false;
  }
}

function hasFreshUploadToken() {
  return Boolean(state.uploadAccessToken && Date.now() < state.uploadTokenExpiresAt - 60_000);
}

async function requestUploadWakeLock() {
  if (!("wakeLock" in navigator) || document.visibilityState !== "visible") {
    return false;
  }

  if (state.uploadWakeLock) {
    return true;
  }

  try {
    const wakeLock = await navigator.wakeLock.request("screen");
    state.uploadWakeLock = wakeLock;
    wakeLock.addEventListener("release", () => {
      if (state.uploadWakeLock === wakeLock) {
        state.uploadWakeLock = null;
      }
    });
    return true;
  } catch (error) {
    console.warn("Screen wake lock unavailable", error);
    return false;
  }
}

function releaseUploadWakeLock() {
  if (!state.uploadWakeLock) {
    return;
  }

  state.uploadWakeLock.release().catch((error) => console.warn("Wake lock release failed", error));
  state.uploadWakeLock = null;
}

function warnBeforeLeavingUpload(event) {
  if (!state.isUploading) {
    return;
  }

  event.preventDefault();
  event.returnValue = "";
}

async function getUploadAccessToken(googleClientId) {
  if (hasFreshUploadToken()) {
    return state.uploadAccessToken;
  }

  await loadGoogleIdentityServices();
  ensureUploadTokenClient(googleClientId);

  const hasGrantedAccess = window.localStorage.getItem("ganeshDriveUploadGranted") === "true";

  try {
    return await requestUploadAccessToken(hasGrantedAccess ? "" : "consent");
  } catch (error) {
    if (hasGrantedAccess) {
      return requestUploadAccessToken("consent");
    }
    throw error;
  }
}

function requestUploadAccessToken(prompt) {
  return new Promise((resolve, reject) => {
    state.uploadTokenReject = reject;
    state.uploadTokenClient.callback = (response) => {
      if (response.error) {
        state.uploadTokenReject = null;
        reject(new Error(response.error_description || response.error));
        return;
      }
      state.uploadAccessToken = response.access_token;
      state.uploadTokenExpiresAt = Date.now() + Number(response.expires_in || 3300) * 1000;
      state.uploadTokenReject = null;
      window.localStorage.setItem("ganeshDriveUploadGranted", "true");
      resolve(response.access_token);
    };
    state.uploadTokenClient.requestAccessToken({ prompt });
  });
}

function prewarmGoogleUpload() {
  const googleClientId = getGoogleClientId();
  if (!googleClientId) {
    return;
  }

  loadGoogleIdentityServices()
    .then(() => ensureUploadTokenClient(googleClientId))
    .catch((error) => console.warn("Google login prewarm failed", error));
}

function ensureUploadTokenClient(googleClientId) {
  if (state.uploadTokenClient && state.uploadClientId === googleClientId) {
    return;
  }

  state.uploadClientId = googleClientId;
  state.uploadTokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: googleClientId,
    scope: GOOGLE_DRIVE_UPLOAD_SCOPE,
    include_granted_scopes: true,
    callback: () => {},
    error_callback: (error) => {
      if (state.uploadTokenReject) {
        state.uploadTokenReject(new Error(error.message || error.type || "Google login was cancelled."));
        state.uploadTokenReject = null;
      }
    }
  });
}

function getGoogleClientId() {
  const clientId = String(CONFIG.googleClientId || "").trim();
  if (!clientId || clientId.includes("YOUR_GOOGLE_OAUTH_CLIENT_ID")) {
    return "";
  }
  return clientId;
}

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Unable to load Google login.")), { once: true });
      window.setTimeout(() => {
        if (window.google?.accounts?.oauth2) {
          resolve();
        } else {
          reject(new Error("Google login is still loading. Please try again."));
        }
      }, 7000);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Google login."));
    document.head.appendChild(script);
  });
}

async function ensureUploadFolder(accessToken) {
  const rootFolderId = CONFIG.rootFolderId || DRIVE_ROOT_ID;
  const configuredFolderId = CONFIG.uploadFolderId || window.localStorage.getItem("ganeshUploadFolderId");

  if (configuredFolderId) {
    try {
      const folder = await driveAuthorizedRequest(`files/${configuredFolderId}`, accessToken, {
        fields: "id,name,mimeType,createdTime,modifiedTime,webViewLink"
      });
      if (folder.mimeType === DRIVE_FOLDER_MIME) {
        return normalizeUploadFolder(folder);
      }
    } catch (error) {
      console.warn("Stored upload folder could not be used", error);
    }
  }

  const folder = await findUploadFolder(rootFolderId, accessToken) || (await createUploadFolder(rootFolderId, accessToken));
  window.localStorage.setItem("ganeshUploadFolderId", folder.id);
  return normalizeUploadFolder(folder);
}

async function findUploadFolder(rootFolderId, accessToken) {
  const query = [
    `mimeType = '${DRIVE_FOLDER_MIME}'`,
    `name = '${escapeDriveQuery(UPLOAD_FOLDER_NAME)}'`,
    `'${rootFolderId}' in parents`,
    "trashed = false"
  ].join(" and ");
  const payload = await driveAuthorizedRequest("files", accessToken, {
    q: query,
    pageSize: "1",
    fields: "files(id,name,mimeType,createdTime,modifiedTime,webViewLink)"
  });
  return payload.files?.[0] ? normalizeUploadFolder(payload.files[0]) : null;
}

async function createUploadFolder(rootFolderId, accessToken) {
  const response = await fetch("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name,mimeType,createdTime,modifiedTime,webViewLink", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: UPLOAD_FOLDER_NAME,
      mimeType: DRIVE_FOLDER_MIME,
      parents: [rootFolderId]
    })
  });

  if (!response.ok) {
    throw new Error(`Unable to create Upload folder: ${response.status}`);
  }
  return normalizeUploadFolder(await response.json());
}

async function uploadFileWithRetry(file, folderId, accessToken, handlers = {}) {
  let lastError = null;

  for (let attempt = 1; attempt <= UPLOAD_RETRY_LIMIT; attempt += 1) {
    try {
      return await uploadFileToDrive(file, folderId, accessToken, handlers);
    } catch (error) {
      lastError = error;
      if (attempt >= UPLOAD_RETRY_LIMIT) {
        break;
      }
      handlers.onRetry?.(attempt + 1, error);
      await delay(UPLOAD_RETRY_BASE_DELAY * attempt);
    }
  }

  throw lastError || new Error(`Unable to upload ${file.name}`);
}

async function uploadFileToDrive(file, folderId, accessToken, handlers = {}) {
  const metadata = {
    name: file.name,
    mimeType: file.type || mimeFromFileName(file.name),
    parents: [folderId]
  };

  const sessionUrl = await createResumableUploadSession(file, metadata, accessToken);
  return uploadResumableFile(file, sessionUrl, accessToken, handlers);
}

async function createResumableUploadSession(file, metadata, accessToken) {
  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,mimeType,createdTime,modifiedTime,webViewLink,webContentLink,imageMediaMetadata,videoMediaMetadata",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": metadata.mimeType,
        "X-Upload-Content-Length": String(file.size || 0)
      },
      body: JSON.stringify(metadata)
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Unable to start upload ${file.name}: ${response.status} ${detail}`);
  }

  const sessionUrl = response.headers.get("Location");
  if (!sessionUrl) {
    throw new Error("Google Drive did not return an upload session.");
  }
  return sessionUrl;
}

async function uploadResumableFile(file, sessionUrl, accessToken, handlers = {}) {
  const totalBytes = Math.max(file.size || 0, 1);
  let cursor = 0;

  while (cursor < totalBytes) {
    const start = cursor;
    const end = Math.min(start + RESUMABLE_CHUNK_SIZE - 1, totalBytes - 1);
    const chunk = file.slice(start, end + 1, file.type || mimeFromFileName(file.name));
    const result = await uploadResumableChunkWithRetry({
      accessToken,
      chunk,
      end,
      file,
      handlers,
      sessionUrl,
      start,
      totalBytes
    });

    if (result.done) {
      handlers.onProgress?.(totalBytes);
      return result.file;
    }

    cursor = Math.max(result.nextByte || end + 1, start + 1);
    handlers.onProgress?.(Math.min(cursor, totalBytes));
  }

  const finalStatus = await queryResumableUploadStatus(sessionUrl, totalBytes, accessToken);
  if (finalStatus.done) {
    handlers.onProgress?.(totalBytes);
    return finalStatus.file;
  }

  throw new Error(`Upload did not finish: ${file.name}`);
}

async function uploadResumableChunkWithRetry({ accessToken, chunk, end, file, handlers, sessionUrl, start, totalBytes }) {
  let lastError = null;

  for (let attempt = 1; attempt <= UPLOAD_RETRY_LIMIT; attempt += 1) {
    try {
      return await sendResumableChunk({
        accessToken,
        chunk,
        end,
        file,
        onProgress: (loaded) => handlers.onProgress?.(start + loaded),
        sessionUrl,
        start,
        totalBytes
      });
    } catch (error) {
      lastError = error;
      const status = await queryResumableUploadStatus(sessionUrl, totalBytes, accessToken).catch(() => null);
      if (status?.done) {
        return status;
      }
      if (status?.nextByte > start) {
        return { done: false, nextByte: status.nextByte };
      }
      if (attempt >= UPLOAD_RETRY_LIMIT) {
        break;
      }
      handlers.onRetry?.(attempt + 1, error);
      await delay(UPLOAD_RETRY_BASE_DELAY * attempt);
    }
  }

  throw lastError || new Error(`Unable to upload ${file.name}`);
}

function sendResumableChunk({ accessToken, chunk, end, file, onProgress, sessionUrl, start, totalBytes }) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", sessionUrl);
    request.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    request.setRequestHeader("Content-Type", file.type || mimeFromFileName(file.name));
    request.setRequestHeader("Content-Range", `bytes ${start}-${end}/${totalBytes}`);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.min(event.loaded, chunk.size));
      }
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(chunk.size);
        resolve({ done: true, file: JSON.parse(request.responseText) });
        return;
      }
      if (request.status === 308) {
        resolve({
          done: false,
          nextByte: nextByteFromRange(request.getResponseHeader("Range"), end + 1)
        });
        return;
      }
      reject(new Error(`Unable to upload ${file.name}: ${request.status} ${request.responseText}`));
    };

    request.onerror = () => reject(new Error(`Network error while uploading ${file.name}`));
    request.onabort = () => reject(new Error(`Upload cancelled: ${file.name}`));
    request.send(chunk);
  });
}

function queryResumableUploadStatus(sessionUrl, totalBytes, accessToken) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", sessionUrl);
    request.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    request.setRequestHeader("Content-Range", `bytes */${totalBytes}`);

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve({ done: true, file: JSON.parse(request.responseText) });
        return;
      }
      if (request.status === 308) {
        resolve({
          done: false,
          nextByte: nextByteFromRange(request.getResponseHeader("Range"), 0)
        });
        return;
      }
      reject(new Error(`Unable to resume upload: ${request.status} ${request.responseText}`));
    };

    request.onerror = () => reject(new Error("Network error while checking upload resume status."));
    request.send();
  });
}

function nextByteFromRange(rangeHeader, fallback) {
  const match = String(rangeHeader || "").match(/bytes=0-(\d+)/i);
  return match ? Number(match[1]) + 1 : fallback;
}

async function driveAuthorizedRequest(path, accessToken, params = {}) {
  const queryParams = {
    supportsAllDrives: "true",
    ...params
  };

  if (path === "files") {
    queryParams.includeItemsFromAllDrives = "true";
  }

  const query = new URLSearchParams(queryParams);
  const response = await fetch(`https://www.googleapis.com/drive/v3/${path}?${query}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!response.ok) {
    throw new Error(`Google Drive request failed: ${response.status}`);
  }
  return response.json();
}

function normalizeUploadFolder(folder) {
  return {
    id: folder.id,
    name: folder.name || UPLOAD_FOLDER_NAME,
    parentId: CONFIG.rootFolderId || DRIVE_ROOT_ID,
    path: `${state.manifest?.root?.name || "Google Drive"} / ${folder.name || UPLOAD_FOLDER_NAME}`,
    createdTime: folder.createdTime || new Date().toISOString(),
    modifiedTime: folder.modifiedTime || folder.createdTime || new Date().toISOString(),
    url: folder.webViewLink || driveFolderUrl(folder.id),
    embedUrl: driveEmbeddedFolderUrl(folder.id)
  };
}

function ensureUploadFolderInManifest(folder) {
  const existing = state.manifest.folders.find((candidate) => candidate.id === folder.id);
  if (existing) {
    Object.assign(existing, folder);
    return existing;
  }

  state.manifest.folders.push(folder);
  return folder;
}

function addUploadedItemToManifest(file, folder) {
  const item = fileToItem(file, folder.id, [state.manifest.root.name, folder.name]);
  const existingIndex = state.manifest.items.findIndex((candidate) => candidate.id === item.id);
  if (existingIndex >= 0) {
    state.manifest.items[existingIndex] = item;
  } else {
    state.manifest.items.unshift(item);
  }
  return item;
}

function readLocalUploadCache() {
  try {
    const rawCache = window.localStorage.getItem(LOCAL_UPLOAD_CACHE_KEY);
    if (!rawCache) {
      return { folders: [], items: [] };
    }
    const cache = JSON.parse(rawCache);
    return {
      folders: Array.isArray(cache.folders) ? cache.folders : [],
      items: Array.isArray(cache.items) ? cache.items : []
    };
  } catch (error) {
    console.warn("Upload cache could not be read", error);
    return { folders: [], items: [] };
  }
}

function writeLocalUploadCache(cache) {
  try {
    window.localStorage.setItem(
      LOCAL_UPLOAD_CACHE_KEY,
      JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        folders: cache.folders || [],
        items: cache.items || []
      })
    );
  } catch (error) {
    console.warn("Upload cache could not be saved", error);
  }
}

function persistUploadedItems(folder, items) {
  const cache = readLocalUploadCache();
  upsertById(cache.folders, folder);
  items.forEach((item) => upsertById(cache.items, item));
  writeLocalUploadCache(cache);
}

function persistUploadFolderSnapshot(manifest) {
  const uploadFolder =
    manifest.folders.find((folder) => folder.name === UPLOAD_FOLDER_NAME && folder.parentId === manifest.root.id) ||
    manifest.folders.find((folder) => folder.name === UPLOAD_FOLDER_NAME);

  if (!uploadFolder) {
    return;
  }

  const folderIds = new Set([uploadFolder.id]);
  let changed = true;
  while (changed) {
    changed = false;
    manifest.folders.forEach((folder) => {
      if (!folderIds.has(folder.id) && folderIds.has(folder.parentId)) {
        folderIds.add(folder.id);
        changed = true;
      }
    });
  }

  writeLocalUploadCache({
    folders: manifest.folders.filter((folder) => folderIds.has(folder.id) && !folder.isRoot),
    items: manifest.items.filter((item) => folderIds.has(item.folderId))
  });
}

function mergePersistedUploads(manifest) {
  const cache = readLocalUploadCache();
  cache.folders.forEach((folder) => {
    if (folder?.id && !manifest.folders.some((candidate) => candidate.id === folder.id)) {
      manifest.folders.push(folder);
    }
  });
  cache.items.forEach((item) => {
    if (item?.id && !manifest.items.some((candidate) => candidate.id === item.id)) {
      manifest.items.unshift(item);
    }
  });
}

function upsertById(collection, value) {
  if (!value?.id) {
    return;
  }
  const index = collection.findIndex((candidate) => candidate.id === value.id);
  if (index >= 0) {
    collection[index] = value;
  } else {
    collection.push(value);
  }
}

function normalizeManifest(manifest) {
  const rawRoot = manifest.root || {};
  const rootId = rawRoot.id || CONFIG.rootFolderId || DRIVE_ROOT_ID;
  const root = {
    id: rootId,
    name: rawRoot.name || "Google Drive",
    url: rawRoot.url || rawRoot.webViewLink || driveFolderUrl(rootId),
    embedUrl: rawRoot.embedUrl || driveEmbeddedFolderUrl(rootId)
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
        modifiedTime: folder.modifiedTime || folder.modified_time || folder.createdTime || manifest.generatedAt,
        url: folder.url || folder.webViewLink || driveFolderUrl(folder.id),
        embedUrl: folder.embedUrl || driveEmbeddedFolderUrl(folder.id)
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
      thumbnailFallbackUrl: item.thumbnailFallbackUrl || driveGoogleusercontentUrl(item.id, 1000),
      fullUrl: item.fullUrl || (type === "video" ? drivePreviewUrl(item.id) : driveThumbnailUrl(item.id, 2400)),
      fullFallbackUrl: item.fullFallbackUrl || (type === "video" ? drivePreviewUrl(item.id) : driveGoogleusercontentUrl(item.id, 2400)),
      previewUrl: item.previewUrl || drivePreviewUrl(item.id),
      viewUrl: item.viewUrl || item.webViewLink || `https://drive.google.com/file/d/${item.id}/view`,
      downloadUrl: item.downloadUrl || item.webContentLink || driveDownloadUrl(item.id),
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
    thumbnailFallbackUrl: driveGoogleusercontentUrl(file.id, type === "video" ? 900 : 1000),
    fullUrl: type === "video" ? drivePreviewUrl(file.id) : driveThumbnailUrl(file.id, 2400),
    fullFallbackUrl: type === "video" ? drivePreviewUrl(file.id) : driveGoogleusercontentUrl(file.id, 2400),
    previewUrl: drivePreviewUrl(file.id),
    viewUrl: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
    downloadUrl: file.webContentLink || driveDownloadUrl(file.id),
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
  renderHomeViewSwitch();
  renderFolderCards();
  renderGallery();
}

function renderNavigation() {
  const rootId = state.manifest.root.id;
  const totalItems = state.manifest.items.length;
  els.libraryCount.textContent = `${formatNumber(totalItems)} items`;

  const nodes = [
    ...renderFolderTree(rootId, 0)
  ];

  els.folderList.innerHTML = nodes.join("");
  hydrateIconsIn(els.folderList);
  els.quickNav.querySelectorAll("[data-folder-id]").forEach((button) => {
    button.classList.toggle("is-active", state.selectedFolderId === button.dataset.folderId);
  });
  els.mobileHomeButton.classList.toggle("is-active", state.selectedFolderId === "all");
  els.mobileFoldersButton.classList.toggle("is-active", isFolderView());
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
  els.driveAllCount.textContent = formatNumber(items.length);
  els.driveRecentCount.textContent = formatNumber(Math.min(items.length, RECENT_LIMIT));
  els.generatedLabel.textContent = `Updated ${formatDateTime(state.manifest.generatedAt)}`;
}

function renderContext() {
  const selected = getSelectedFolder();
  const title = state.selectedFolderId === "recent" ? "Recent" : selected ? selected.name : "All Media";
  const path = state.selectedFolderId === "recent" ? "Recent media" : selected && selected.id !== state.manifest.root.id ? selected.path : "All Media";
  els.contextTitle.textContent = title;
  els.breadcrumb.textContent = path;
}

function renderMobileStrip() {
  const rootId = state.manifest.root.id;
  const topFolders = state.index.childrenByParent.get(rootId) || [];
  const buttons = [
    quickFolderButton("all", "All", state.selectedFolderId === "all"),
    quickFolderButton("recent", "Recent", state.selectedFolderId === "recent"),
    ...topFolders.map((folder) => quickFolderButton(folder.id, folder.name, state.selectedFolderId === folder.id))
  ];
  els.mobileFolderStrip.innerHTML = buttons.join("");
}

function quickFolderButton(id, name, active) {
  return `<button class="${active ? "is-active" : ""}" type="button" data-folder-id="${escapeAttr(id)}">${escapeHtml(name)}</button>`;
}

function renderHomeViewSwitch() {
  const shouldShow = state.selectedFolderId === "all" && !state.query;
  els.homeViewSwitch.hidden = !shouldShow;
  if (!shouldShow) {
    return;
  }

  els.homeViewSwitch.querySelectorAll("[data-home-view]").forEach((button) => {
    button.classList.toggle("is-active", state.homeView === button.dataset.homeView);
  });
}

function renderFolderCards() {
  const selectedId = isBuiltInView(state.selectedFolderId) ? state.manifest.root.id : state.selectedFolderId;
  const children = state.index.childrenByParent.get(selectedId) || [];

  els.folderCards.innerHTML = children
    .map((folder) => {
      const cover = state.index.latestItem(folder.id);
      const count = state.index.itemCount(folder.id);
      return `
        <button class="folder-card" type="button" data-folder-id="${escapeAttr(folder.id)}">
          <span class="folder-card-preview ${cover ? "is-loading" : ""}">
            ${
              cover
                ? `<img src="${escapeAttr(cover.thumbnailUrl)}" data-fallback-src="${escapeAttr(cover.thumbnailFallbackUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />`
                : ""
            }
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
  if (isAlbumHomeView()) {
    renderAlbumGrid();
    return;
  }

  const items = getFilteredItems();
  state.currentItems = items;
  const visible = items.slice(0, state.visibleLimit);

  els.resultCount.textContent = `${formatNumber(items.length)} results`;
  els.resultTitle.textContent = galleryTitle();
  els.resultTitle.dataset.sortLabel = "| Sorted by Date taken";
  els.resultNote.textContent = galleryResultNote(items);

  els.galleryGrid.classList.remove("is-album-grid");
  els.galleryGrid.innerHTML = visible.map(mediaCardHtml).join("");
  hydrateIconsIn(els.galleryGrid);
  wireImageFallbacks(els.galleryGrid);
  renderEmptyState(items);
}

function renderAlbumGrid() {
  const albums = getHomeAlbums();
  state.currentItems = [];

  els.resultCount.textContent = `${formatNumber(albums.length)} albums`;
  els.resultTitle.textContent = "Albums";
  delete els.resultTitle.dataset.sortLabel;
  els.resultNote.textContent = `${formatNumber(state.manifest.items.length)} photos and videos | ${albumSortLabel()}`;
  els.galleryGrid.classList.add("is-album-grid");
  els.galleryGrid.innerHTML = albums.map(albumCardHtml).join("");
  hydrateIconsIn(els.galleryGrid);
  wireImageFallbacks(els.galleryGrid);
  renderEmptyState(albums);
}

function getHomeAlbums() {
  const rootId = state.manifest.root.id;
  const folders = state.index.childrenByParent.get(rootId) || [];
  const albums = folders
    .map((folder) => {
      const covers = albumCoverItems(folder.id);
      return {
        folder,
        count: state.index.itemCount(folder.id),
        covers,
        latestTime: getTime(covers[0]?.modifiedTime || folder.modifiedTime)
      };
    });

  return sortAlbums(albums, state.sort);
}

function sortAlbums(albums, sortMode) {
  return albums.slice().sort((a, b) => {
    if (sortMode === "oldest") {
      return a.latestTime - b.latestTime;
    }
    if (sortMode === "name") {
      return a.folder.name.localeCompare(b.folder.name, "th");
    }
    return b.latestTime - a.latestTime;
  });
}

function albumCoverItems(folderId) {
  const folderIds = state.index.descendants(folderId);
  return state.manifest.items
    .filter((item) => folderIds.has(item.folderId))
    .sort((a, b) => getTime(b.modifiedTime) - getTime(a.modifiedTime))
    .slice(0, 3);
}

function albumCardHtml(album) {
  const { folder, count, covers, latestTime } = album;
  const coverSlots = [0, 1, 2].map((slot) => {
    const item = covers[slot];
    if (!item) {
      return `
        <span class="album-cover-cell is-empty">
          <span data-icon="image"></span>
        </span>
      `;
    }
    return `
      <span class="album-cover-cell is-loading ${slot === 0 ? "is-primary" : ""}">
        <img src="${escapeAttr(item.thumbnailUrl)}" data-fallback-src="${escapeAttr(item.thumbnailFallbackUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
      </span>
    `;
  });

  return `
    <button class="album-card" type="button" data-folder-id="${escapeAttr(folder.id)}" aria-label="Open ${escapeAttr(folder.name)} album">
      <span class="album-cover" aria-hidden="true">
        ${coverSlots.join("")}
      </span>
      <span class="album-meta">
        <span class="album-kicker"><span data-icon="folders"></span>${formatNumber(count)} media</span>
        <strong>${escapeHtml(folder.name)}</strong>
        <small>${latestTime ? `Latest ${formatShortDate(latestTime)}` : "Album"}</small>
      </span>
    </button>
  `;
}

function albumSortLabel() {
  if (state.sort === "oldest") {
    return "Albums sorted oldest first";
  }
  if (state.sort === "name") {
    return "Albums sorted by name";
  }
  return "Albums sorted by latest activity";
}

function renderEmptyState(items) {
  if (items.length > 0) {
    els.emptyState.hidden = true;
    els.emptyState.classList.remove("has-drive-frame");
    return;
  }

  const selectedFolder = getSelectedFolder();
  const folder = selectedFolder || state.manifest.root;
  const canShowDriveFrame = !state.query && folder?.id;

  els.emptyState.hidden = false;
  els.emptyState.classList.toggle("has-drive-frame", canShowDriveFrame);
  els.emptyState.innerHTML = `
    <span data-icon="${canShowDriveFrame ? "folders" : "image"}"></span>
    <strong>${canShowDriveFrame ? "Open the live Drive folder" : "No media found"}</strong>
    <p>${canShowDriveFrame ? "This folder may have new files that are not in the local index yet." : "Try another folder or search term."}</p>
    ${
      canShowDriveFrame
        ? `<a class="primary-action empty-drive-link" href="${escapeAttr(folder.url || driveFolderUrl(folder.id))}" target="_blank" rel="noreferrer">
            <span data-icon="external"></span>
            <span>Open in Drive</span>
          </a>
          <iframe class="drive-folder-frame" src="${escapeAttr(folder.embedUrl || driveEmbeddedFolderUrl(folder.id))}" title="${escapeAttr(folder.name || "Google Drive folder")}" loading="lazy"></iframe>`
        : ""
    }
  `;
  hydrateIconsIn(els.emptyState);
}

function getFilteredItems() {
  if (state.selectedFolderId === "recent") {
    const recentItems = sortItems(state.manifest.items, "newest").slice(0, RECENT_LIMIT);
    return state.query ? recentItems.filter((item) => itemMatchesQuery(item, state.query)) : recentItems;
  }

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

    return itemMatchesQuery(item, query);
  });

  if (shouldUseMixedHomeFeed()) {
    return mixHomeItems(items);
  }

  return sortItems(items, state.sort);
}

function itemMatchesQuery(item, query) {
  const folder = state.index.folderById.get(item.folderId);
  return `${item.name} ${folder?.name || ""} ${folder?.path || ""}`.toLowerCase().includes(query);
}

function shouldUseMixedHomeFeed() {
  return state.selectedFolderId === "all" && !state.query && state.sort === "newest";
}

function mixHomeItems(items) {
  const groups = new Map();
  sortItems(items, "newest").forEach((item) => {
    if (!groups.has(item.folderId)) {
      groups.set(item.folderId, []);
    }
    groups.get(item.folderId).push(item);
  });

  const folderGroups = [...groups.entries()].sort(([, aItems], [, bItems]) => {
    const latestDelta = getTime(bItems[0]?.modifiedTime) - getTime(aItems[0]?.modifiedTime);
    if (latestDelta) {
      return latestDelta;
    }
    const aFolder = state.index.folderById.get(aItems[0]?.folderId);
    const bFolder = state.index.folderById.get(bItems[0]?.folderId);
    return (aFolder?.name || "").localeCompare(bFolder?.name || "", "th");
  });

  const mixed = [];
  let depth = 0;
  let added = true;
  while (added) {
    added = false;
    folderGroups.forEach(([, groupItems]) => {
      if (groupItems[depth]) {
        mixed.push(groupItems[depth]);
        added = true;
      }
    });
    depth += 1;
  }
  return mixed;
}

function galleryTitle() {
  if (state.selectedFolderId === "all") {
    return "Full library";
  }
  if (state.selectedFolderId === "recent") {
    return "Recent";
  }
  return getSelectedFolder()?.name || "Gallery";
}

function galleryResultNote(items) {
  if (state.selectedFolderId === "recent") {
    return `${formatNumber(items.length)} latest items | Sorted by date taken`;
  }
  if (shouldUseMixedHomeFeed()) {
    return `${formatNumber(items.length)} items | Mixed from all folders`;
  }
  return `${formatNumber(items.length)} items | Sorted by ${state.sort === "oldest" ? "oldest date" : state.sort === "name" ? "name" : "date taken"}`;
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
  const typeLabel = item.type === "video" ? "Video" : "Photo";
  const fallbackLabel = item.type === "video" ? "Play video" : "Drive preview";
  return `
    <article class="media-card ${shapeClass} ${item.type === "video" ? "is-video" : ""}">
      <button class="media-button is-loading" type="button" data-item-id="${escapeAttr(item.id)}" aria-label="${escapeAttr(item.name)}">
        <img src="${escapeAttr(item.thumbnailUrl)}" data-fallback-src="${escapeAttr(item.thumbnailFallbackUrl)}" alt="${escapeAttr(item.name)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
        <span class="media-fallback" aria-hidden="true">
          <span data-icon="${typeIcon}"></span>
          <strong>${fallbackLabel}</strong>
        </span>
        <span class="media-overlay">
          <span class="media-name">${escapeHtml(item.name)}</span>
          <span class="media-type"><span data-icon="${typeIcon}"></span>${typeLabel}</span>
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
  document.body.classList.remove("mobile-chrome-hidden");
  renderAll();
  els.mainView?.scrollTo?.({ top: 0, behavior: "smooth" });
}

function setHomeView(homeView) {
  if (!["albums", "photos"].includes(homeView)) {
    return;
  }

  state.homeView = homeView;
  state.visibleLimit = MEDIA_BATCH_SIZE;
  try {
    window.localStorage.setItem(HOME_VIEW_KEY, homeView);
  } catch (error) {
    console.warn("Home view preference could not be saved", error);
  }
  renderHomeViewSwitch();
  renderGallery();
}

function readInitialHomeView() {
  try {
    const saved = window.localStorage.getItem(HOME_VIEW_KEY);
    return saved === "photos" ? "photos" : "albums";
  } catch {
    return "albums";
  }
}

function isAlbumHomeView() {
  return state.selectedFolderId === "all" && !state.query && state.homeView === "albums";
}

function isBuiltInView(folderId) {
  return folderId === "all" || folderId === "recent";
}

function isFolderView() {
  return !isBuiltInView(state.selectedFolderId);
}

function getSelectedFolder() {
  if (isBuiltInView(state.selectedFolderId)) {
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
  els.downloadDriveLink.href = item.downloadUrl || driveDownloadUrl(item.id);
  els.downloadDriveLink.setAttribute("download", item.name);
  els.downloadDriveLink.setAttribute("aria-label", `Download ${item.name}`);
  els.previousButton.disabled = index <= 0;
  els.nextButton.disabled = index === -1 || index >= state.currentItems.length - 1;

  els.lightboxStage.innerHTML = "";
  if (item.type === "video") {
    renderDrivePreviewFrame(item, "Open video in Drive");
  } else {
    const image = document.createElement("img");
    image.src = item.fullUrl;
    image.alt = item.name;
    image.referrerPolicy = "no-referrer";
    image.decoding = "async";
    image.loading = "eager";
    image.onerror = () => {
      const nextUrl = image.src === item.fullUrl ? item.fullFallbackUrl : item.thumbnailUrl;
      if (nextUrl && image.src !== nextUrl) {
        image.src = nextUrl;
        return;
      }
      image.onerror = null;
      image.src = item.thumbnailFallbackUrl || item.thumbnailUrl;
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

function renderDrivePreviewFrame(item, fallbackText = "Open in Google Drive") {
  els.lightboxStage.innerHTML = "";
  const shell = document.createElement("div");
  shell.className = "drive-preview-shell";
  const iframe = document.createElement("iframe");
  iframe.src = item.previewUrl;
  iframe.title = item.name;
  iframe.allow = "autoplay; fullscreen; encrypted-media; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "no-referrer";
  const link = document.createElement("a");
  link.href = item.viewUrl;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.className = "drive-preview-link";
  link.textContent = fallbackText;
  shell.append(iframe, link);
  els.lightboxStage.appendChild(shell);
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

function setUploadConnectPrompt(fileCount, detail = "", isError = false) {
  if (!els.uploadStatus) {
    return;
  }

  const fileLabel = `${formatNumber(fileCount)} file${fileCount > 1 ? "s" : ""} ready`;
  const detailText = detail || `${fileLabel}. Tap Connect Drive once to start uploading.`;
  els.uploadStatus.hidden = false;
  els.uploadStatus.classList.toggle("is-error", isError);
  els.uploadStatus.innerHTML = `
    <span class="upload-status-row">
      <strong>Connect Google Drive</strong>
      <small>${isError ? "Try again" : "Required"}</small>
    </span>
    <small class="upload-status-detail">${escapeHtml(detailText)}</small>
    <button class="upload-connect-button" type="button" data-upload-action="connect">Connect Drive</button>
  `;
}

function setDriveRefreshPrompt(detail = "", isError = false) {
  if (!els.uploadStatus) {
    return;
  }

  const detailText = detail || "Connect Google Drive once to scan new folders and photos now.";
  els.uploadStatus.hidden = false;
  els.uploadStatus.classList.toggle("is-error", isError);
  els.uploadStatus.innerHTML = `
    <span class="upload-status-row">
      <strong>Refresh Google Drive</strong>
      <small>${isError ? "Try again" : "Live scan"}</small>
    </span>
    <small class="upload-status-detail">${escapeHtml(detailText)}</small>
    <button class="upload-connect-button" type="button" data-drive-action="refresh">Connect Drive & Refresh</button>
  `;
}

function setUploadProgress(percent, title, detail = "") {
  setUploadStatus(title, false, { detail, percent });
}

function uploadPercent(loadedBytes, totalBytes) {
  if (!totalBytes) {
    return 0;
  }
  return Math.min(99, Math.max(0, Math.round((loadedBytes / totalBytes) * 100)));
}

function setUploadStatus(message, isError = false, progress = null) {
  if (!els.uploadStatus) {
    return;
  }

  els.uploadStatus.hidden = !message;
  els.uploadStatus.classList.toggle("is-error", isError);

  if (!message) {
    els.uploadStatus.textContent = "";
    return;
  }

  if (progress && Number.isFinite(progress.percent)) {
    const percent = Math.min(100, Math.max(0, Math.round(progress.percent)));
    const detailMarkup = progress.detail
      ? `<small class="upload-status-detail">${escapeHtml(progress.detail)}</small>`
      : "";
    els.uploadStatus.innerHTML = `
      <span class="upload-status-row">
        <strong>${escapeHtml(message)}</strong>
        <small>${percent}%</small>
      </span>
      <span class="upload-progress" aria-hidden="true" style="--progress: ${percent}%"><span></span></span>
      ${detailMarkup}
    `;
    return;
  }

  els.uploadStatus.textContent = message;
}

function uploadErrorMessage(error) {
  const message = String(error?.message || error || "").trim();
  if (/popup|failed_to_open|open popup/i.test(message)) {
    return "Google sign-in popup was blocked. Tap Connect Drive again and allow pop-ups for this site.";
  }
  if (/cancel|closed|denied|access_denied/i.test(message)) {
    return "Google sign-in was cancelled. Tap Connect Drive when you are ready.";
  }
  return message || "Upload failed. Please try again.";
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
    const host = image.closest(".media-button, .folder-card-preview, .album-cover-cell");
    if (!host) {
      return;
    }

    const markLoaded = () => {
      host.classList.remove("is-loading", "is-broken");
    };
    const tryFallback = () => {
      const fallbackSrc = image.dataset.fallbackSrc;
      if (!fallbackSrc || image.dataset.fallbackTried === "true" || image.src === fallbackSrc) {
        return false;
      }
      image.dataset.fallbackTried = "true";
      image.src = fallbackSrc;
      return true;
    };
    const markBroken = () => {
      host.classList.remove("is-loading");
      host.classList.add("is-broken");
    };

    if (image.complete && image.naturalWidth > 0) {
      markLoaded();
      return;
    }

    image.addEventListener("load", markLoaded);
    image.addEventListener("error", () => {
      if (!tryFallback()) {
        markBroken();
      }
    });
    window.setTimeout(() => {
      if (!image.complete || !image.naturalWidth) {
        if (!tryFallback()) {
          markBroken();
        }
      }
    }, 6500);
  });
}

function isSupportedMedia(mimeType = "") {
  return mimeType.startsWith("image/") || mimeType.startsWith("video/");
}

function isSupportedUploadFile(file) {
  return isSupportedMedia(file.type) || /\.(jpe?g|png|gif|webp|heic|heif|mp4|mov|m4v|webm|3gp)$/i.test(file.name);
}

function mimeFromFileName(fileName) {
  const extension = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "";
  const mimeByExtension = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
    mp4: "video/mp4",
    mov: "video/quicktime",
    m4v: "video/mp4",
    webm: "video/webm",
    "3gp": "video/3gpp"
  };
  return mimeByExtension[extension] || "application/octet-stream";
}

function driveThumbnailUrl(fileId, width) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${width}`;
}

function driveGoogleusercontentUrl(fileId, width) {
  return `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}=w${width}`;
}

function drivePreviewUrl(fileId) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
}

function driveFolderUrl(folderId) {
  return `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`;
}

function driveEmbeddedFolderUrl(folderId) {
  return `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}#grid`;
}

function driveDownloadUrl(fileId) {
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}

function escapeDriveQuery(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
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

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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
