import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile("public/drive-manifest.json", "utf8"));
const errors = [];

if (!manifest.root?.id) {
  errors.push("Missing root.id");
}

if (!Array.isArray(manifest.folders)) {
  errors.push("folders must be an array");
}

if (!Array.isArray(manifest.items)) {
  errors.push("items must be an array");
}

const folderIds = new Set([manifest.root?.id, ...(manifest.folders || []).map((folder) => folder.id)]);
const itemIds = new Set();

for (const folder of manifest.folders || []) {
  if (!folder.id || !folder.name) {
    errors.push(`Invalid folder: ${JSON.stringify(folder)}`);
  }
  if (folder.parentId && !folderIds.has(folder.parentId)) {
    errors.push(`Folder "${folder.name}" references missing parent "${folder.parentId}"`);
  }
}

for (const item of manifest.items || []) {
  if (!item.id || !item.name || !item.folderId) {
    errors.push(`Invalid item: ${JSON.stringify(item)}`);
  }
  if (itemIds.has(item.id)) {
    errors.push(`Duplicate item id "${item.id}"`);
  }
  if (!folderIds.has(item.folderId)) {
    errors.push(`Item "${item.name}" references missing folder "${item.folderId}"`);
  }
  itemIds.add(item.id);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Manifest OK: ${manifest.items.length} media items, ${manifest.folders.length} folders.`);
