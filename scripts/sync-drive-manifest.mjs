import { createSign } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const ROOT_FOLDER_ID = process.env.DRIVE_FOLDER_ID || "1nNtCyrJ0uWSMmQwcOMhr6eYDV6vmVmRn";
const OUTPUT_PATH = process.env.DRIVE_MANIFEST_PATH || "public/drive-manifest.json";
const PAGE_SIZE = process.env.DRIVE_PAGE_SIZE || "1000";
const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";

const auth = await resolveAuth();

if (!auth) {
  throw new Error("Set GOOGLE_API_KEY or GOOGLE_SERVICE_ACCOUNT_JSON to sync Google Drive.");
}

const root = await getFile(ROOT_FOLDER_ID);
const folders = [];
const items = [];

await walk(ROOT_FOLDER_ID, [root.name || "Google Drive"]);

folders.sort((a, b) => a.path.localeCompare(b.path, "th"));
items.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());

const manifest = {
  version: 1,
  source: auth.type === "service-account" ? "google-drive-service-account" : "google-drive-api-key",
  generatedAt: new Date().toISOString(),
  root: {
    id: root.id,
    name: root.name || "Google Drive",
    url: root.webViewLink || `https://drive.google.com/drive/folders/${root.id}`
  },
  folders,
  items
};

await writeFile(OUTPUT_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Synced ${items.length} media items across ${folders.length} folders.`);

async function walk(folderId, pathSegments) {
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
      await walk(file.id, childPath);
    } else if (isSupportedMedia(file.mimeType)) {
      items.push(fileToItem(file, folderId, pathSegments));
    }
  }
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

function isSupportedMedia(mimeType = "") {
  return mimeType.startsWith("image/") || mimeType.startsWith("video/");
}

function driveThumbnailUrl(fileId, width) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${width}`;
}

function drivePreviewUrl(fileId) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
}

function base64Url(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return buffer.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
