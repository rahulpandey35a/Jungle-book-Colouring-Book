# Jungle Colouring Book — iPad PWA

A local, offline colouring app for your jungle-book pages. Built for iPad:
tools sit in a side panel so the drawing area stays large, and it supports
finger, Apple Pencil, and mouse input.

## 1. Pages

This build ships with all 40 jungle-book pages already in the `images`
folder, named in order:

```
images/page-001.png
images/page-002.png
...
images/page-040.png
```

`TOTAL_PAGES` in `app.js` is set to `40` to match. If you ever add or
remove pages, update that number.

## 2. Run it

Since you're deploying via GitHub, this part is easy — GitHub Pages serves
everything over `https://`, which is exactly what service workers need
(the `file://` protocol won't work for offline caching).

1. Push this folder to a GitHub repo (public or private both work).
2. In the repo: **Settings → Pages → Deploy from a branch** → pick `main`
   (or `master`) and `/ (root)` → **Save**.
3. GitHub gives you a URL like:
   ```
   https://<your-username>.github.io/<repo-name>/
   ```
4. Open that URL in Safari on the iPad.

Whenever you tweak the app, just commit and push — GitHub Pages redeploys
automatically in about a minute.

## 3. Install as an app

Once it's loading in Safari:
1. Tap the **Share** button.
2. Tap **Add to Home Screen**.
3. Launch it from the home screen icon — it now runs full-screen, works
   offline, and remembers each coloured page (saved in the browser's local
   storage on that iPad).

## Notes

- Tap a page in the gallery to open it, pick a colour, and tap **Fill** to
  bucket-fill a region, or switch to **Brush** for freehand colouring.
- **Save** stores progress; a checkmark appears on finished pages in the
  gallery.
- **Reset** clears just the open page back to blank line art.
- Everything is stored locally in Safari's storage on that iPad — there's
  no server or account involved, so progress won't sync across devices.
