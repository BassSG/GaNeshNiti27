# GaNeshGallary

GaNeshGallary is a premium installable gallery PWA for browsing media from a Google Drive folder. It is designed to run as a static GitHub Pages site while keeping the gallery fast with a generated Drive manifest, lazy thumbnails, incremental rendering, and an app-like lightbox.

## Scope

- Static PWA that can be installed on desktop and mobile.
- Folder-based browsing that mirrors the Google Drive folder tree.
- Image and video support.
- Upload photos and videos to a Google Drive folder named `Upload` when Google OAuth is configured.
- Download button in the media lightbox.
- Date and time sorting, search, responsive layouts, and lazy loading.
- GitHub Actions deployment to GitHub Pages.
- Optional scheduled Google Drive manifest sync.

## Local Run

```bash
npm.cmd run generate:icons
npm.cmd run check
npm.cmd run start
```

Open `http://localhost:4173`.

## Google Drive Sync

The app ships with `public/drive-manifest.json` so the site opens immediately. The scheduled workflow can sync public Drive folders without secrets by reading Google Drive's embedded folder view.

If the folder is later made private, configure one of these repository secrets:

- `GOOGLE_API_KEY`: works when the Drive folder and media are publicly readable or shared in a way the API key can read.
- `GOOGLE_SERVICE_ACCOUNT_JSON`: recommended for controlled access. Share the Drive root folder with the service account email, then store the full service account JSON as this secret.

The scheduled workflow `.github/workflows/sync-drive.yml` runs every 30 minutes and updates `public/drive-manifest.json` when Drive changes.

For live browser-side sync, copy `drive-config.example.js` to `drive-config.js`, add a restricted public Drive API key, and set `preferLive: true`.

## Google Drive Upload

The upload button uses Google OAuth in the browser. Add a Web OAuth Client ID to `drive-config.js`, set `GOOGLE_CLIENT_ID` for the Pages workflow, or open the site once with `?googleClientId=YOUR_CLIENT_ID.apps.googleusercontent.com` to save it in that browser:

```js
googleClientId: "YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com"
```

Authorized JavaScript origins should include:

```text
https://basssg.github.io
http://localhost:4173
```

When the user chooses files, the app signs in with Google, finds or creates a folder named `Upload` inside the Drive root folder, uploads the selected photos/videos there, and immediately shows them in the app. Uploaded media is cached locally so the `Upload` folder remains visible after a browser refresh. The app refresh button also uses the same Google login to read the live Drive folder tree, including newly created folders. If no Google Client ID is configured, the button opens the Drive folder as a fallback because Google Drive write access requires OAuth.

## Deployment

The workflow `.github/workflows/pages.yml` deploys the static app to GitHub Pages on every push to `main`. The expected Pages URL is:

```text
https://basssg.github.io/GaNeshGallary/
```

## Verification

Run before publishing:

```bash
npm.cmd run generate:icons
npm.cmd run check
npm.cmd run start
```

Then verify:

- Desktop gallery loads without layout shift.
- Mobile layout opens the folder drawer and gallery remains usable.
- Search and sort update the grid.
- Folder selection shows only the chosen folder and its descendants.
- Lightbox opens images and Drive video previews.
- Upload button signs in, creates/uses `Upload`, and adds uploaded media to the visible gallery.
- Lightbox download button opens the Drive download URL for the selected media.
- Browser install prompt is available when served from HTTPS or localhost.
