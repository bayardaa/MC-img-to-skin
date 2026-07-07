# MC Image to Skin

Fast web tool that converts regular images into Minecraft skin layouts.

## Features

- Input formats: **webp, png, jpeg, jpg**
- Output formats: **32x32, 64x64, 128x128 PNG**
- **Simple mode:** one-click mapping to full skin
- **Detailed mode:** region-based mapping (head/body/arms/legs front-back-side)
- Crop area selection
- Optional image controls:
  - smoothing (blur)
  - sharpening
  - brightness/contrast/saturation
- Client-side processing (no backend required)

## Local development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages

This repo includes a Pages workflow at `.github/workflows/deploy-pages.yml`.

1. Push to `main`
2. In GitHub repo settings:
   - **Pages > Source** = GitHub Actions
3. Workflow builds and deploys automatically

If your repo is a project page (not root domain), set:

- Repository variable `VITE_BASE_PATH` to `/<repo-name>/`

## Deploy to Netlify

Set build settings:

- Build command: `npm run build`
- Publish directory: `dist`

Optional environment variable:

- `VITE_BASE_PATH=/` (default)
