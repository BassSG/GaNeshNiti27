(() => {
  const params = new URLSearchParams(window.location.search);
  const clientIdFromUrl = params.get("googleClientId") || params.get("google_client_id") || "";
  const storedClientId = window.localStorage.getItem("ganeshGoogleClientId") || "";
  const googleClientId = clientIdFromUrl || storedClientId || "16121317006-jn7md7g3n8pg5gqa9nt7jmp58qh05hqh.apps.googleusercontent.com";

  if (clientIdFromUrl) {
    window.localStorage.setItem("ganeshGoogleClientId", clientIdFromUrl);
  }

  window.GANESH_DRIVE_CONFIG = {
    "rootFolderId": "1nNtCyrJ0uWSMmQwcOMhr6eYDV6vmVmRn",
    "googleApiKey": "",
    "googleClientId": googleClientId,
    "uploadFolderId": "",
    "uploadFolderName": "Upload",
    "preferLive": false,
    "pageSize": 100
  };
})();
