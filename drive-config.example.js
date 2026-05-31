(() => {
  const params = new URLSearchParams(window.location.search);
  const clientIdFromUrl = params.get("googleClientId") || params.get("google_client_id") || "";
  const storedClientId = window.localStorage.getItem("ganeshGoogleClientId") || "";
  const googleClientId = clientIdFromUrl || storedClientId || "YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com";

  if (clientIdFromUrl) {
    window.localStorage.setItem("ganeshGoogleClientId", clientIdFromUrl);
  }

  window.GANESH_DRIVE_CONFIG = {
    rootFolderId: "1nNtCyrJ0uWSMmQwcOMhr6eYDV6vmVmRn",
    googleApiKey: "YOUR_PUBLIC_GOOGLE_DRIVE_API_KEY",
    googleClientId,
    uploadFolderId: "",
    uploadFolderName: "Upload",
    preferLive: true,
    pageSize: 100
  };
})();
