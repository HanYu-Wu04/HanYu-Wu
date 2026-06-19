# HanYu Wu Portfolio

Interactive portfolio site built with React, Vite, Three.js, Motion, Tailwind CSS, and an Express API server. The homepage uses a WebGL fluid-distortion portrait reveal, scroll-driven sections, a project gallery, and a contact/footer section.

## Features

- WebGL portrait reveal using custom Three.js shaders.
- Scroll-driven signature, manifesto, gallery, and contact transitions.
- Responsive desktop and mobile layouts.
- Project gallery with photo, web, and mobile-app presentation styles.
- Resume download link from `public/HanYu_Wu_Resume.pdf`.
- Express endpoint for GitHub contribution data at `/api/github-contributions`.

## Tech Stack

- React 19 for the UI.
- Vite 6 for frontend bundling and dev middleware.
- TypeScript for type checking.
- Tailwind CSS 4 for utility styling.
- Three.js for WebGL rendering and shader effects.
- Motion for scroll transforms and animation.
- Lucide React for icons.
- Express for the local/API server.
- Cheerio and Lodash for GitHub contribution scraping/formatting.
- esbuild for bundling the server in production.

## Project Structure

```text
.
├── public/                     # Static assets, images, video, resume PDF
├── src/
│   ├── App.tsx                 # App shell
│   ├── main.tsx                # React entrypoint
│   ├── index.css               # Tailwind import, fonts, global utilities
│   ├── shaders.ts              # Fluid and display fragment shaders
│   └── components/
│       ├── FluidDistortion.tsx # Main portfolio experience
│       ├── LoadingOverlay.tsx  # Initial loading transition
│       ├── LandoText.tsx       # Animated text helper
│       ├── MenuOverlay.tsx     # Navigation overlay
│       └── Stroke.tsx          # SVG signature stroke
├── server.ts                   # Express server and Vite middleware
├── vite.config.ts              # Vite config
├── package.json                # Scripts and dependencies
└── .env.example                # Example environment variables
```

## Requirements

- Node.js 20 or newer.
- npm.

The project includes `package-lock.json`, so use `npm install` for reproducible dependency installs.

## Environment Variables

Copy the example file if you need local environment values:

```bash
cp .env.example .env
```

Available variables:

- `GEMINI_API_KEY`: Kept from the original AI Studio scaffold. The current portfolio UI does not require it for the main page.
- `APP_URL`: Optional hosted app URL for deployments that need a self-reference.
- `PORT`: Optional server port. Defaults to `3000`.

## Run Locally

Install dependencies:

```bash
npm install
```

Run the full app with the Express API server and Vite middleware:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

If port `3000` is already in use, provide another port:

```bash
PORT=3001 npm run dev
```

Run only the Vite frontend:

```bash
npm run dev:client
```

## Scripts

- `npm run dev`: Start the Express server with Vite middleware.
- `npm run dev:server`: Same as `npm run dev`.
- `npm run dev:client`: Start Vite without the Express API server.
- `npm run lint`: Run TypeScript type checking with `tsc --noEmit`.
- `npm run build`: Build the frontend with Vite and bundle `server.ts` with esbuild.
- `npm run start`: Run the production server from `dist/server.cjs`.
- `npm run clean`: Remove generated build output.

## Production Build

Build the app:

```bash
npm run build
```

Start the built server:

```bash
npm run start
```

The production server serves static files from `dist/` and falls back to `dist/index.html` for the single-page app.

## API

### `GET /api/test`

Health check endpoint.

### `GET /api/github-contributions?username=<github-user>`

Fetches GitHub contribution data by scraping GitHub's contribution calendar.

Optional query params:

- `format=nested`: Returns contribution data grouped by year/month/day.

Example:

```bash
curl "http://localhost:3000/api/github-contributions?username=HanYu-Wu04"
```

## Asset Notes

The main visual experience depends on assets in `public/`, including:

- `snow.mp4`: Background snow video.
- `base.png`: Base portrait image.
- `top.png`: Ice/reveal portrait image.
- `left.png` and `right.png`: Contact section artwork.
- Project images such as `calpoly.jpg`, `sparkliai.png`, `hack4impact.png`, `campusirl.png`, and `grad.jpg`.
- `HanYu_Wu_Resume.pdf`: Resume download target.

Keep these paths stable unless you also update `src/components/FluidDistortion.tsx`.

## Development Notes

- Most scroll timing and responsive behavior lives in `src/components/FluidDistortion.tsx`.
- WebGL shader behavior lives in `src/shaders.ts`.
- The page uses CSS utility classes heavily, so many layout changes are inline Tailwind class updates.
- Mobile behavior is handled through the `isMobileViewport` state in `FluidDistortion.tsx`.

## Verification

Before committing changes, run:

```bash
npm run lint
npm run build
```

The current build may warn that some chunks are larger than 500 kB. That warning is expected for this app's current Three.js/React bundle and does not fail the build.
