# StitchPad Web

Privacy-first offline cross-stitch companion for `.saga` and `.dize` files. Parsing, rendering, marking, and progress storage happen locally in the browser.

## Run

```sh
npm install
npm run dev
```

Open the displayed local URL. Production build and preview:

```sh
npm run build
npm run preview
```

## Install on iPad

Serve `dist/` over HTTPS, open the site in Safari, choose **Share → Add to Home Screen**, launch it once online, and then use it offline. The app shell is cached; pattern files remain in Files and are selected explicitly.

## Verification and diagnostics

```sh
npm test
npm run lint
npm run inspect:saga
npm run inspect:dize
npm run compare
```

The real fixtures remain at repository root and are used by integration tests. Format/security details live in [`docs/`](docs/). The app does not redistribute the SAGA archive's proprietary symbol font.
