import { createSign } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const ROOT_FOLDER_ID = process.env.DRIVE_FOLDER_ID || "1nNtCyrJ0uWSMmQwcOMhr6eYDV6vmVmRn";
const OUTPUT_PATH = process.env.DRIVE_MANIFEST_PATH || "public/drive-manifest.json";
const PAGE_SIZE = process.env.DRIVE_PAGE_SIZE || "1000";
const ROOT_FOLDER_NAME = process.env.DRIVE_ROOT_NAME || "GaNeshGallary Drive";
const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";

const auth = await resolveAuth();
const folders = [];
const items = [];
let root;
let source;

if (auth) {
  root = await getFile(ROOT_FOLDER_ID);
  source = auth.type === "service-account" ? "google-drive-service-account" : "google-drive-api-key";
  await walkApi(ROOT_FOLDER_ID, [root.name || ROOT_FOLDER_NAME]);
} else {
  root = {
    id: ROOT_FOLDER_ID,
    name: ROOT_FOLDER_NAME,
    webViewLink: driveFolderUrl(ROOT_FOLDER_ID)
  };
  source = "google-drive-public-embedded";
  await walkPublic(ROOT_FOLDER_ID, [root.name]);
}

folders.sort((a, b) => a.path.localeCompare(b.path, "th"));
items.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());

const manifest = {
  version: 1,
  source,
  generatedAt: new Date().toISOString(),
  root: {
    id: root.id,
    name: root.name || ROOT_FOLDER_NAME,
    url: root.webViewLink || `https://drive.google.com/drive/folders/${root.id}`
  },
  folders,
  items
};

const serializedManifest =
  process.env.DRIVE_MANIFEST_PRETTY === "true" ? JSON.stringify(manifest, null, 2) : JSON.stringify(manifest);
await writeFile(OUTPUT_PATH, `${serializedManifest}\n`, "utf8");
console.log(`Synced ${items.length} media items across ${folders.length} folders.`);

async function walkApi(folderId, pathSegments) {
  const children = await listChildren(folderId);

  for (const file of children) {
    if (file.mimeType === DRIVE_FOLDER_MIME) {
      const childPath = [...pathSegments, file.name];
      folders.push({
        id: file.id,
        name: file.name,
        parentId: folderId,
        path: childPath.join(" / "),
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime
      });
      await walkApi(file.id, childPath);
    } else if (isSupportedMedia(file.mimeType)) {
      items.push(fileToItem(file, folderId, pathSegments));
    }
  }
}

async function walkPublic(folderId, pathSegments) {
  const children = await listPublicChildren(folderId);

  for (const folder of children.filter((entry) => entry.kind === "folder")) {
    const childPath = [...pathSegments, folder.name];
    const folderTime = folder.modifiedTime || new Date().toISOString();
    folders.push({
      id: folder.id,
      name: folder.name,
      parentId: folderId,
      path: childPath.join(" / "),
      createdTime: folderTime,
      modifiedTime: folderTime,
      url: driveFolderUrl(folder.id)
    });
    await walkPublic(folder.id, childPath);
  }

  for (const file of children.filter((entry) => entry.kind === "file")) {
    if (isSupportedMedia(file.mimeType)) {
      items.push(publicEntryToItem(file, folderId, pathSegments));
    }
  }
}

async function listPublicChildren(folderId) {
  const response = await fetch(driveEmbeddedFolderUrl(folderId), {
    headers: {
      "User-Agent": "GaNeshGallary manifest sync"
    }
  });

  if (!response.ok) {
    throw new Error(`Google Drive public folder failed (${response.status}) for ${folderId}: ${await response.text()}`);
  }

  return parseEmbeddedFolder(await response.text());
}

function parseEmbeddedFolder(html) {
  const entries = [];
  const entryPattern =
    /<a href="https:\/\/drive\.google\.com\/(?:file\/d\/([^/]+)\/view\?usp=drive_web|drive\/folders\/([^"?]+)(?:\?usp=drive_web)?)" target="_blank">([\s\S]*?)<\/a>[\s\S]*?<div class="flip-entry-last-modified"><div>(.*?)<\/div><\/div>/g;

  for (const match of html.matchAll(entryPattern)) {
    const [, fileId, folderId, body, modifiedText] = match;
    const title = textFromHtml(body.match(/<div class="flip-entry-title">([\s\S]*?)<\/div>/)?.[1] || "");
    const mimeType = folderId ? DRIVE_FOLDER_MIME : mimeFromEmbeddedEntry(body, title);
    entries.push({
      id: fileId || folderId,
      kind: fileId ? "file" : "folder",
      name: title || "Untitled",
      mimeType,
      modifiedTime: parseEmbeddedDate(textFromHtml(modifiedText))
    });
  }

  return entries;
}

async function listChildren(folderId) {
  const files = [];
  let pageToken = "";

  do {
    const payload = await driveRequest("files", {
      pageSize: PAGE_SIZE,
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

async function getFile(fileId) {
  return driveRequest(`files/${fileId}`, {
    fields: "id,name,mimeType,createdTime,modifiedTime,webViewLink"
  });
}

async function driveRequest(path, params = {}) {
  const query = new URLSearchParams({
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    ...params
  });

  const headers = {};
  if (auth.type === "api-key") {
    query.set("key", auth.apiKey);
  } else {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/${path}?${query}`, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Drive API failed (${response.status}): ${body}`);
  }
  return response.json();
}

async function resolveAuth() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_FILE) {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || (await readFile(process.env.GOOGLE_SERVICE_ACCOUNT_FILE, "utf8"));
    const serviceAccount = JSON.parse(raw);
    return {
      type: "service-account",
      accessToken: await getServiceAccountToken(serviceAccount)
    };
  }

  if (process.env.GOOGLE_API_KEY) {
    return {
      type: "api-key",
      apiKey: process.env.GOOGLE_API_KEY
    };
  }

  return null;
}

async function getServiceAccountToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600
    })
  );
  const unsigned = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const signature = signer.sign(serviceAccount.private_key);
  const assertion = `${unsigned}.${base64Url(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });

  if (!response.ok) {
    throw new Error(`Unable to obtain Google access token: ${await response.text()}`);
  }

  const token = await response.json();
  return token.access_token;
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

function publicEntryToItem(file, folderId, pathSegments) {
  const type = file.mimeType.startsWith("video/") ? "video" : "image";
  const capturedTime = inferMediaTime(file.name, file.modifiedTime);
  return {
    id: file.id,
    name: file.name,
    type,
    mimeType: file.mimeType,
    folderId,
    folderPath: pathSegments.join(" / "),
    createdTime: capturedTime,
    modifiedTime: capturedTime,
    previewUrl: drivePreviewUrl(file.id),
    viewUrl: `https://drive.google.com/file/d/${file.id}/view`
  };
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

function driveFolderUrl(folderId) {
  return `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`;
}

function driveEmbeddedFolderUrl(folderId) {
  return `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}#grid`;
}

function mimeFromEmbeddedEntry(body, fileName) {
  const iconMime = body.match(/drive-thirdparty\.googleusercontent\.com\/16\/type\/([^"?]+)/)?.[1];
  if (iconMime) {
    return decodeURIComponent(iconMime);
  }

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

function inferMediaTime(fileName, fallbackTime) {
  const base = fileName.replace(/\.[^.]+$/, "");
  const ymdTime = base.match(/(20\d{2})(\d{2})(\d{2})[_-]?(\d{2})(\d{2})(\d{2})/);
  if (ymdTime) {
    return localIso(ymdTime[1], ymdTime[2], ymdTime[3], ymdTime[4], ymdTime[5], ymdTime[6]) || fallbackTime;
  }

  const dashedTime = base.match(/(20\d{2})[-_](\d{2})[-_](\d{2})[-_]?(\d{2})(\d{2})(\d{2})/);
  if (dashedTime) {
    return localIso(dashedTime[1], dashedTime[2], dashedTime[3], dashedTime[4], dashedTime[5], dashedTime[6]) || fallbackTime;
  }

  const epochMs = base.match(/(?:^|[^\d])(\d{13})(?:[^\d]|$)/);
  if (epochMs) {
    const time = Number(epochMs[1]);
    const lowerBound = new Date("2000-01-01T00:00:00Z").getTime();
    const upperBound = new Date("2050-01-01T00:00:00Z").getTime();
    if (time >= lowerBound && time <= upperBound) {
      return new Date(time).toISOString();
    }
  }

  const shortDate = base.match(/(?:^|[_\-\s])(\d{2})(\d{2})(\d{2})(?:$|[_\-\s])/);
  if (shortDate) {
    const year = Number(shortDate[1]);
    const month = Number(shortDate[2]);
    const day = Number(shortDate[3]);
    if (year >= 20 && year <= 40 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return localIso(2000 + year, month, day, 12, 0, 0) || fallbackTime;
    }
  }

  return fallbackTime || new Date(0).toISOString();
}

function parseEmbeddedDate(value) {
  const dateParts = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!dateParts) {
    return null;
  }

  const month = Number(dateParts[1]);
  const day = Number(dateParts[2]);
  const year = Number(dateParts[3].length === 2 ? `20${dateParts[3]}` : dateParts[3]);
  return localIso(year, month, day, 12, 0, 0);
}

function localIso(year, month, day, hour, minute, second) {
  const iso = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}+07:00`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function textFromHtml(value) {
  return decodeHtml(value.replace(/<[^>]+>/g, "").trim());
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)));
}

function base64Url(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return buffer.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
