# JSDoc Press

**Purpose:** A minimal, clean JSDoc HTML template to use via `opts.template`.

## Setup

Add JSDoc and this template to your project:

    npm install --save-dev jsdoc
    npm install --save-dev github:bemky/jsdoc-press
    npm install --save-dev highlight.js

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

Generate docs: `npx jsdoc -c jsdoc.json`

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
      "index": "./README.md",
      "staticFiles": "./public", 
      "nav": {
        "order": ["module", "class", "namespace", "interface", "mixin", "method", "member", "typedef", "enum", "event"],
        "exclude": ["typedef", "event"]
      },
      "transformHtml": "./.jsdoc/transform-html.js",
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
  
|option|type|description|default|
|------|----|------------|-------|
|logo|String|Path to logo in output (copy it via `staticFiles`).|none|
|index|String|Path to a Markdown file to include as the landing page (`index.html`). Content is injected as-is; add your own Markdown plugin if you want HTML rendering. Falls back to repo `README.*` if not provided.|none|
|staticFiles|String,Array<String>|Path(s) to a file or directory to copy into the destination folder. Directories copy recursively and preserve structure.|none|
|nav.order|Array<String>|Order of kinds in the sidebar and index. Missing kinds are appended in the default order.|`[module, class, interface, mixin, namespace, method, member, typedef, enum, event]`|
|nav.exclude|Array<String>|Kinds to hide from the sidebar and index navigation.|none|
|footer|Boolean,String|`false` hides footer; `true` renders default; a string renders as HTML.|true|
|javascripts|Array<String>|Scripts to inject; local paths copied to `assets/scripts/`, remote URLs used as-is; rendered as `<script src="..."></script>` before `</body>`.|[]|
|stylesheets|Array<String>|Styles to inject; local paths copied to `assets/styles/`, remote URLs used as-is; rendered as `<link rel="stylesheet" />` in `head`.|[]|
|cleanOutput|Boolean|Wipes destination folder before generating new files.|true|
|showKindIcons|Boolean|Displays compact kind icons (F, C, etc.) in nav and pages.|true|
|kindLabels|Object|Map singular kind names to custom labels used across navigation, subheadings, and headers; plural/title forms are derived automatically. Alias: `renameKinds`.|none|
|templates|String|Path to directory of template overrides checked before built-in `tmpl/` (mirrors default structure).|none|
|transformHtml|String,Array<String>|Path(s) to JS module(s) that export a function `(html, ctx) => string` (or `{ transform(html, ctx) }`) applied to every generated HTML file after layout. Useful for custom highlighting or post-processing.|none|
|highlight|Boolean|Enable post-layout code block highlighting via highlight.js for all `<pre><code>` blocks.|true|

Local paths (relative or absolute filesystem paths) are copied into the docs output under `assets/scripts/` and `assets/styles/`, and the corresponding URLs are rewritten. Remote URLs are used as-is. The `staticFiles` option copies your own files/folders directly into the destination root; for example, with `"staticFiles": "./public"` a file `./public/logo.svg` will be available at `logo.svg` and can be referenced by `templates.logo: "logo.svg"`.

### Example: Rename kinds

Rename one or more kinds globally (navigation groups, subheadings, headers) by setting `templates.kindLabels` (or `templates.renameKinds`). Plural and title-cased forms are handled automatically.

```json
{
  "templates": {
    "kindLabels": {
      "tutorial": "guide"
    }
  }
}
```

This renders the Tutorials group as “Guides” in the sidebar, tutorial subheadings as “Guides”, and the tutorial header label as “Guide”.

## Demo
![Demo Index](./preview-assets/images/demo-index.png?raw=true)
![Demo Class](./preview-assets/images/demo-class.png?raw=true)
![Demo Module](./preview-assets/images/demo-module.png?raw=true)

## Development

- Example symbols live in `preview-lib/` (classes, functions, typedefs, namespace, mixin, interface, enum, events).
- Example assets live in `preview-assets`
- Generate preview using this template: `npm run preview`
- Open `preview/index.html` to see how each kind renders.
