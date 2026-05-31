import { writeFile } from "node:fs/promises";

const DEFAULT_GOOGLE_CLIENT_ID = "16121317006-jn7md7g3n8pg5gqa9nt7jmp58qh05hqh.apps.googleusercontent.com";

const config = {
  rootFolderId: process.env.DRIVE_FOLDER_ID || "1nNtCyrJ0uWSMmQwcOMhr6eYDV6vmVmRn",
  googleApiKey: process.env.GOOGLE_API_KEY || "",
  googleClientId: process.env.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID,
  uploadFolderId: process.env.GOOGLE_UPLOAD_FOLDER_ID || "",
  uploadFolderName: process.env.GOOGLE_UPLOAD_FOLDER_NAME || "Upload",
  preferLive: process.env.PREFER_LIVE_DRIVE === "true",
  pageSize: Number(process.env.DRIVE_PAGE_SIZE || 100)
};

const body = `(() => {
  const params = new URLSearchParams(window.location.search);
  const clientIdFromUrl = params.get("googleClientId") || params.get("google_client_id") || "";
  const storedClientId = window.localStorage.getItem("ganeshGoogleClientId") || "";
  const googleClientId = clientIdFromUrl || storedClientId || ${JSON.stringify(config.googleClientId)};

  if (clientIdFromUrl) {
    window.localStorage.setItem("ganeshGoogleClientId", clientIdFromUrl);
  }

  window.GANESH_DRIVE_CONFIG = ${JSON.stringify({ ...config, googleClientId: "__GOOGLE_CLIENT_ID__" }, null, 2)
    .replace('"__GOOGLE_CLIENT_ID__"', "googleClientId")
    .replace(/\n/g, "\n  ")};
})();
`;

await writeFile("drive-config.js", body, "utf8");
console.log(`Wrote drive-config.js for ${config.rootFolderId}`);
