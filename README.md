# GaNeshPicture27

GaNeshPicture27 is a premium installable gallery PWA for browsing media from a Google Drive folder. It is designed to run as a static GitHub Pages site while keeping the gallery fast with a generated Drive manifest, lazy thumbnails, incremental rendering, and an app-like lightbox.

## Scope

- Static PWA that can be installed on desktop and mobile.
- Folder-based browsing that mirrors the Google Drive folder tree.
- Image and video support.
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

The app ships with `public/drive-manifest.json` so the site opens immediately. For automatic updates when files are added to Google Drive, configure one of these repository secrets:

- `GOOGLE_API_KEY`: works when the Drive folder and media are publicly readable or shared in a way the API key can read.
- `GOOGLE_SERVICE_ACCOUNT_JSON`: recommended for controlled access. Share the Drive root folder with the service account email, then store the full service account JSON as this secret.

The scheduled workflow `.github/workflows/sync-drive.yml` runs every 30 minutes and updates `public/drive-manifest.json` when Drive changes.

For live browser-side sync, copy `drive-config.example.js` to `drive-config.js`, add a restricted public Drive API key, and set `preferLive: true`.

## Deployment

The workflow `.github/workflows/pages.yml` deploys the static app to GitHub Pages on every push to `main`. The expected Pages URL is:

```text
https://basssg.github.io/GaNeshPicture27/
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
- Browser install prompt is available when served from HTTPS or localhost.
