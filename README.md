# JSDoc Press

**Purpose:** A minimal, clean JSDoc HTML template to use via `opts.template`.

## Setup

Add JSDoc and this template to your project:
  - `npm install --save-dev jsdoc`
  - `npm install --save-dev github:bemky/jsdoc-press`

In your `jsdoc.json`:
  ```json
  {
    "source": { "include": ["src"] },
    "opts": {
      "destination": "./docs",
      "recurse": true,
      "template": "node_modules/jsdoc-template-boilerplate"
    }
  }
  ```

- Generate docs: `npx jsdoc -c jsdoc.json`

## Template Anatomy

- `publish.js`: Entry point called by JSDoc; renders pages using views in `tmpl/`.
- `tmpl/layout.tmpl`: Base HTML layout; wraps page content and navigation.
- `tmpl/container.tmpl`: Renders the index listing by kind (classes, functions, etc.).
- `tmpl/doc.tmpl`: Renders a single symbol page (description, params, returns, examples, properties).
- `static/style.css`: Simple, dark, readable styling copied to the output folder.

## Notes

- This template intentionally keeps logic minimal and predictable.
- Uses JSDoc’s built-in templating (`jsdoc/template`)—no extra runtime deps.
- Link slugs are generated from `longname` and made unique within a build.

Want extras (search, source links, custom header/footer, partials per-kind)? I can extend this template structure without changing how consumers configure it.

## Template Settings

Inject custom JavaScript and CSS on every page via `templates.javascripts` and `templates.stylesheets` in your `jsdoc.json`:
  ```json
  {
    "opts": { "template": "node_modules/jsdoc-template-boilerplate" },
    "templates": {
      "cleanOutput": true,
      "javascripts": [
        "https://unpkg.com/lite-youtube-embed/src/lite-yt-embed.js",
        "./scripts/custom.js"
      ],
      "stylesheets": [
        "https://unpkg.com/some-theme/theme.css",
        "./styles/custom.css"
      ],
      "templates": "./my-custom-templates",
      "showKindIcons": true,
      "footer": true
    }
  }
  ```
 - Scripts render as `<script src="..."></script>` near the end of `body`.
 - Styles render as `<link rel="stylesheet" href="..." />` in `head`.
 - `cleanOutput` (default true): when enabled, the template wipes the destination folder before generating new files.
 - `showKindIcons` (default true): when enabled, kinds render as compact icons (e.g., `F` for function, `C` for class) in the sidebar and on symbol pages.
 - `footer` (boolean|string, default true):
   - `true`: renders the default footer text.
   - `false`: hides the footer entirely.
   - `"<html>..."` string: renders the provided string as HTML in the footer.

 - `templates` (string, optional): Path to a directory containing template overrides. When set, the renderer first checks this folder for a requested partial before falling back to the built-in `tmpl/`.
   - Mirrors the default structure (for example: `doc/summary.tmpl`, `layout.tmpl`, `navitem.tmpl`).
   - Relative paths resolve against your JSDoc working directory (env.pwd / process.cwd()); absolute paths are supported.
   - All standard helpers are available inside overrides (e.g., `kindLabel`, `htmlsafe`, `highlight`, `linkTo`, `find`, `findAll`).

Local paths (relative or absolute filesystem paths) are copied into the docs output under `assets/scripts/` and `assets/styles/`, and the corresponding URLs are rewritten. Remote URLs are used as-is.

## Development

- Example symbols live in `preview-lib/` (classes, functions, typedefs, namespace, mixin, interface, enum, events).
- Example assets live in `preview-assets`
- Generate preview using this template: `npm run preview`
- Open `preview/index.html` to see how each kind renders.
