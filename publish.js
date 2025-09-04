// Minimal JSDoc template publisher
// Generates an index page and per-symbol pages using tmpl views.

/* eslint-disable no-console */

const path = require('jsdoc/path');
const fs = require('jsdoc/fs');
const template = require('jsdoc/template');
const env = require('jsdoc/env');
const nfs = require('fs');
const helper = require("jsdoc/util/templateHelper")
const hljs = require('highlight.js')
const markdown = require('jsdoc/util/markdown');
const markdownParser = markdown.getParser();

function singularize (str) {
    const map = {
        modules: 'module'
    }
    if (map[str]) return map[str]
    return str.replace(/(?<!s)e?s$/, '')
}

function pluralize (str) {
    switch (str.at(-1)) {
        case 'y': str = str.replace(/y$/, 'ies'); break;
        case 's': str += 'e';
        default: str += 's'
    }
    return str
}

function titleize (str) {
    return str.replace("_", " ").replace(/\b('?[a-z])/g, (m) => m.toUpperCase())
}

function kindLabel(kind, options={}) {
    const map = {
        member: 'property',
        instance_member: 'instance_property',
        static_member: 'static_property'
    };
    const k = String(singularize(kind) || '').toLowerCase();
    let result = map[k] || k
    if (!!options.plural) result = pluralize(result)
    if (!!options.title) result = titleize(result)
    return result
}

/**
* JSDoc entry point.
* @param {import('taffydb').TaffyDB} data
* @param {{destination: string}} opts
*/
exports.publish = function publish(data, opts) {
    const outdir = path.normalize(opts.destination || './docs');
    const tconf = env?.conf?.templates || {};
    // Read cleaning option (default: true) and wipe output directory if enabled
    const cleanOutput = (typeof tconf.cleanOutput === 'boolean') ? !!tconf.cleanOutput : true;
    try {
        if (cleanOutput && nfs.existsSync(outdir)) {
            // Remove all contents inside outdir (equivalent to `${outdir}/**/*`), but keep the directory itself
            for (const entry of nfs.readdirSync(outdir)) {
                const target = path.join(outdir, entry);
                nfs.rmSync(target, { recursive: true, force: true });
            }
        }
    } catch (e) {
        console.warn('[template] failed to clean output directory:', e.message);
    }
    fs.mkPath(outdir);

    // Load view engine from ./tmpl
    // Template options
    const showKindIcons = (typeof tconf.showKindIcons === 'boolean') ? !!tconf.showKindIcons : true;

    const views = Object.assign(new template.Template(path.join(__dirname, 'tmpl')), {
        pluralize: pluralize,
        titleize: titleize,
        kindLabel: kindLabel,
        find: function(spec) { return this.findAll(spec).at(0) },
        htmlsafe: helper.htmlsafe,
        findAll: spec => helper.find(data, spec),
        conf: (env?.conf) ? env.conf : {},
        showKindIcons,
        kindIcon: function(kind) {
            const map = {
                // core kinds
                'function': 'F',
                'method': 'F',
                'member': 'P',
                'class': 'C',
                'interface': 'I',
                'mixin': 'X',
                'namespace': 'N',
                'typedef': 'T',
                'enum': 'U',
                'event': 'E',
                'module': 'M'
            };
            const k = String(kind || '').toLowerCase();
            if (map[k]) return map[k];
            // fallback: first letter uppercase
            return (k[0] || '?').toUpperCase();
        },
        // Syntax highlight helper: render HTML with highlight.js
        highlight: function(code, lang, options={}) {
            try {
                if (lang && hljs.getLanguage(lang)) {
                    const html = hljs.highlight(code ?? '', { language: lang, ignoreIllegals: true }).value;
                    return `<pre class="${options['class'] || ""}"><code class="hljs language-${lang}">${html}</code></pre>`;
                }
                if (!lang && typeof code === 'string' && code.length) {
                    const res = hljs.highlightAuto(code);
                    const detected = res.language || 'plaintext';
                    return `<pre class="${options['class'] || ""}"><code class="hljs language-${detected}">${res.value}</code></pre>`;
                }
            } catch (_) {}
            const safe = helper.htmlsafe(String(code ?? ''));
            return `<pre class="${options['class'] || ""}"><code class="hljs">${safe}</code></pre>`;
        }
    });
    const partialWas = views.partial
    views.partial = function (template, options) {
        // If configured, check a custom templates directory for an override first
        const customDirRaw = (typeof this?.conf?.templates?.templates === 'string')
        ? this.conf.templates.templates
        : null;
        if (customDirRaw) {
            const overrideBase = path.isAbsolute(customDirRaw)
            ? customDirRaw
            : path.resolve(env?.pwd || process.cwd(), customDirRaw);
            const overridePath = path.join(overrideBase, template);
            if (fs.existsSync(overridePath)) {
                template = overrideBase
            }
        }
        let result = partialWas.call(this, template, options)
        result = String(result).split(/(?=\<\/?code)/).map(p => {
            if (p.startsWith("<code")) {
                return p
            } else {
                return p.replaceAll(/\>\s+\<(?!\/code)/gm, '><')
            }
        }).join("")
        return result
    }

    // Helpers to resolve and optionally copy provided asset paths into the output folder
    function isUrl(s) { return typeof s === 'string' && /^(?:[a-z]+:)?\/\//i.test(s); }
    function stageAssets(list, subdir) {
        const results = [];
        const targetBase = path.join(outdir, subdir);
        if (!list || !list.length) return results;
        fs.mkPath(targetBase);
        for (const entry of list) {
            if (isUrl(entry)) { results.push(entry); continue; }
            try {
                const abs = path.isAbsolute(entry) ? entry : path.resolve(env?.pwd || process.cwd(), entry);
                if (nfs.existsSync(abs)) {
                    const dest = path.join(targetBase, path.basename(abs));
                    nfs.copyFileSync(abs, dest);
                    results.push(path.toUrl ? path.toUrl(path.join(subdir, path.basename(abs))) : path.join(subdir, path.basename(abs)));
                } else {
                    results.push(entry);
                }
            } catch {
                results.push(entry);
            }
        }
        return results;
    }

    // Note: index Markdown is injected as-is; add your own client-side markdown plugin if desired.

    // Read template settings from jsdoc.json -> templates.{javascripts,stylesheets}
    const jsRaw = Array.isArray(tconf.javascripts)
    ? tconf.javascripts.filter((s) => typeof s === 'string')
    : [];
    const cssRaw = Array.isArray(tconf.stylesheets)
    ? tconf.stylesheets.filter((s) => typeof s === 'string')
    : [];
    const jsIncludes = stageAssets(jsRaw, 'javascripts');
    const cssIncludes = stageAssets(cssRaw, 'stylesheets');

    function applyLayout(content, pageTitle, navGroups, activeHref) {
        return views.render('layout.tmpl', {
            content,
            title: pageTitle || 'Documentation',
            navGroups,
            activeHref,
            javascripts: jsIncludes,
            stylesheets: cssIncludes,
        });
    }

    // Copy static assets if present (recursive copy)
    const staticDir = path.join(__dirname, 'static');
    try {
        if (fs.existsSync(staticDir)) {
            const files = fs.ls(staticDir, 99);
            files.forEach((absPath) => {
                const rel = absPath.replace(path.join(staticDir, path.sep), '');
                const destDir = fs.toDir(path.join(outdir, rel));
                fs.mkPath(destDir);
                fs.copyFileSync(absPath, destDir);
            });
        }
    } catch (e) {
        console.warn('[template] failed to copy static assets:', e.message);
    }

    // Copy user-provided static files/directories if configured via templates.staticFiles
    try {
        const rawStatic = tconf.staticFiles;
        const list = Array.isArray(rawStatic) ? rawStatic : (typeof rawStatic === 'string' ? [rawStatic] : []);
        for (const entry of list) {
            if (typeof entry !== 'string' || !entry) continue;
            const src = path.isAbsolute(entry) ? entry : path.resolve(env?.pwd || process.cwd(), entry);
            if (!nfs.existsSync(src)) { console.warn('[template] staticFiles missing:', entry); continue; }
            const stat = nfs.statSync(src);
            if (stat.isDirectory()) {
                const files = fs.ls(src, 99);
                files.forEach((absPath) => {
                    const rel = absPath.replace(path.join(src, path.sep), '');
                    const destDir = fs.toDir(path.join(outdir, rel));
                    fs.mkPath(destDir);
                    fs.copyFileSync(absPath, destDir);
                });
            } else if (stat.isFile()) {
                const destDir = fs.toDir(path.join(outdir, path.basename(src)));
                fs.mkPath(destDir);
                fs.copyFileSync(src, destDir);
            }
        }
    } catch (e) {
        console.warn('[template] failed to copy templates.staticFiles assets:', e.message);
    }

    // Prepare data
    const docs = data().get().filter((d) => !d.undocumented && d.longname && d.kind);

    // Simple filename map to make stable, unique URLs
    const filenameMap = new Map();
    const taken = new Set();
    function toSlug(name) {
        return String(name)
        .replace(/[\s]/g, '-')
        .replace(/[^A-Za-z0-9_.-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
    }
    function ensureUnique(base) {
        let candidate = base; let i = 2;
        while (taken.has(candidate)) candidate = `${base}-${i++}`;
        taken.add(candidate); return candidate;
    }
    function fileFor(doc) {
        if (filenameMap.has(doc.longname)) return filenameMap.get(doc.longname);
        const base = toSlug(doc.longname || doc.name || doc.kind);
        const filename = ensureUnique(`${base}.html`);
        filenameMap.set(doc.longname, filename);
        return filename;
    }

    // Build hierarchical structure by memberof; attach children buckets on parent nodes
    const defaultKindOrder = ['module', 'class', 'interface', 'mixin', 'namespace', 'method', 'member', 'typedef', 'enum', 'event'];
    const userKindOrder = Array.isArray(tconf?.nav?.order)
        ? tconf.nav.order.filter(k => typeof k === 'string').map(s => String(s).toLowerCase())
        : null;
    const excludeKinds = new Set(
        Array.isArray(tconf?.nav?.exclude)
            ? tconf.nav.exclude
                .filter(k => typeof k === 'string')
                .map(s => String(s).toLowerCase())
                .map(s => singularize(s))
            : []
    );
    const kindOrder = (() => {
        if (!userKindOrder || !userKindOrder.length) return defaultKindOrder.slice();
        const seen = new Set();
        const merged = [];
        for (const k of userKindOrder) { if (!seen.has(k)) { merged.push(k); seen.add(k); } }
        for (const k of defaultKindOrder) { if (!seen.has(k)) { merged.push(k); seen.add(k); } }
        return merged.filter(k => !excludeKinds.has(k));
    })();
    const orderIndex = new Map(kindOrder.map((k, i) => [k, i]));

    const nodeByLongname = new Map();
    // Resolve a reference to a node by exact longname, or by common aliases like 'module:<name>' or simple name
    function resolveNode(ref) {
        if (!ref) return null;
        let node = nodeByLongname.get(ref);
        if (node) return node;
        const s = String(ref);
        if (!s.includes(':')) {
            node = nodeByLongname.get(`module:${s}`);
            if (node) return node;
        }
        // Fallback: resolve by simple name with preference order
        const candidates = [];
        for (const v of nodeByLongname.values()) {
            if (v && v.name === s) candidates.push(v);
        }
        if (candidates.length === 1) return candidates[0];
        if (candidates.length > 1) {
            const pref = new Map(['module','namespace','class','mixin','interface','typedef','enum','event','function','method','member']
                .map((k,i)=>[k,i]));
            candidates.sort((a,b)=>{
                const ia = pref.has(a.kind) ? pref.get(a.kind) : 999;
                const ib = pref.has(b.kind) ? pref.get(b.kind) : 999;
                if (ia !== ib) return ia - ib;
                return String(a.longname || a.name).localeCompare(String(b.longname || b.name));
            });
            return candidates[0];
        }
        return null;
    }

    // Expose a simple view helper to link to a doc by longname or name
    // Accepts a string and returns the computed href (or empty string if unknown)
    views.linkTo = function linkTo(longname) {
        if (!longname) return '';
        const node = resolveNode(longname);
        return (node && node.href) ? node.href : '';
    };
    function consolidateParams(params) {
        if (!Array.isArray(params)) return params;
        const rootsByName = new Map();
        const result = [];
        // First, add all non-dotted params preserving order
        for (const p of params) {
            if (!p || typeof p.name !== 'string' || p.name.indexOf('.') === -1) {
                result.push(p);
                if (p && p.name) rootsByName.set(p.name, p);
            }
        }
        // Then, merge dotted params into their root's properties
        for (const p of params) {
            if (!p || typeof p.name !== 'string') continue;
            const parts = p.name.split('.');
            if (parts.length <= 1) continue;
            const rootName = parts[0];
            let root = rootsByName.get(rootName);
            if (!root) {
                root = { name: rootName, type: { names: ['Object'] } };
                rootsByName.set(rootName, root);
                result.push(root);
            }
            if (!root.properties) root.properties = [];
            let current = root;
            for (let i = 1; i < parts.length; i++) {
                const part = parts[i];
                let list = current.properties || (current.properties = []);
                let prop = list.find(x => x && x.name === part);
                if (!prop) {
                    prop = { name: part };
                    list.push(prop);
                }
                if (i === parts.length - 1) {
                    if (p.type) prop.type = p.type;
                    if (p.description) prop.description = p.description;
                    if (typeof p.optional === 'boolean') prop.optional = p.optional;
                    if (Object.prototype.hasOwnProperty.call(p, 'defaultvalue')) prop.defaultvalue = p.defaultvalue;
                } else {
                    if (!prop.properties) prop.properties = [];
                }
                current = prop;
            }
        }
        return result.filter(Boolean);
    }
    function makeNode(d) {
        // Augment the original doclet with template-specific fields and href
        d.href = fileFor(d);
        // Preserve original memberof string for later resolution
        d.memberofLongname = d.memberof || null;
        // Replace memberof with an object reference (assigned later)
        d.memberof = null;
        // Unified members object: keys are buckets ('methods', 'classes', ...)
        d.members = {};
        // Stable anchor id used when summarized on a parent page
        try {
            d.anchor = 'symbol-' + toSlug(d.longname || d.name || d.kind || '');
        } catch (_) {
            d.anchor = 'symbol-' + String(d.longname || d.name || d.kind || '');
        }
        // Bucket key this doc appears under on its parent page (set in addToBucket)
        d.sectionKey = null;
        // Consolidate dotted params (e.g., options.location) into parent param properties
        if (Array.isArray(d.params)) {
            d.params = consolidateParams(d.params);
        }
        return d;
    }
    for (const d of docs) nodeByLongname.set(d.longname, makeNode(d));

    const roots = [];
    function addToBucket(target, key, item) {
        let bucket = String(key).toLowerCase();
        if (target && target.kind === 'class') {
            if (bucket === 'member' || bucket === 'members') {
                bucket = (item && item.scope === 'static') ? 'static_members' : 'instance_members';
            } else if (bucket === 'method' || bucket === 'methods' || bucket === 'function' || bucket === 'functions') {
                bucket = (item && item.scope === 'static') ? 'static_methods' : 'instance_methods';
            }
        }
        if (!target.members[bucket]) target.members[bucket] = [];
        // record the section bucket used for this child
        item.sectionKey = bucket;
        target.members[bucket].push(item);
    }
    for (const d of docs) {
        const node = nodeByLongname.get(d.longname);
        let parent = d.memberofLongname ? nodeByLongname.get(d.memberofLongname) : null;
        if (!parent && d.memberofLongname) parent = resolveNode(d.memberofLongname);
        
        if (parent) {
            // Set inverse memberof reference
            node.memberof = parent;
            addToBucket(parent, pluralize(d.kind), node)
        } else {
            roots.push(node);
        }
    }

    function sortNodes(list) {
        list.sort((a, b) => {
            const ka = orderIndex.has(a.kind) ? orderIndex.get(a.kind) : 999;
            const kb = orderIndex.has(b.kind) ? orderIndex.get(b.kind) : 999;
            if (ka !== kb) return ka - kb;
            return String(a.name).localeCompare(String(b.name));
        });
        return list;
    }
    sortNodes(roots);
    function sortBuckets(node) {
        if (!node || !node.members || typeof node.members !== 'object') return;
        Object.keys(node.members).forEach((k) => {
            const arr = node.members[k];
            if (Array.isArray(arr)) {
                sortNodes(arr);
                arr.forEach(sortBuckets);
            }
        });
    }
    roots.forEach(sortBuckets);

    // Build sidebar nav data: group by kind.
    // Include roots and also promote direct children of modules into top-level groups.
    const rootsByKind = new Map();
    const pushKind = (k, node) => {
        const arr = rootsByKind.get(k) || [];
        arr.push(node);
        rootsByKind.set(k, arr);
    };
    for (const r of roots) pushKind(r.kind, r);
    const navGroups = [];
    for (const k of kindOrder) {
        const items = rootsByKind.get(k) || [];
        const seen = new Set();
        const unique = items.filter((it) => {
            if (!it || seen.has(it.longname)) return false;
            seen.add(it.longname);
            return true;
        });
        if (unique.length) navGroups.push({ kind: k, items: sortNodes(unique) });
    }

    // Doclets are already augmented in-place via makeNode; no further attachment required.

    // Update hrefs for members/methods/events to point to parent page anchors when applicable
    for (const d of docs) {
        if (!d) continue;
        const kind = String(d.kind || '').toLowerCase();
        if (['member', 'method', 'event', 'function'].includes(kind) && (d.memberof || d.memberofLongname)) {
            const parent = d.memberof || (d.memberofLongname ? nodeByLongname.get(d.memberofLongname) : null);
            if (parent && parent.href) {
                d.href = `${parent.href}#${d.anchor}`;
            } else {
                d.href = fileFor(d);
            }
        } else {
            d.href = fileFor(d);
        }
    }

    // Render index content (flat by-kind listing) separate from sidebar
    const order = kindOrder;
    const byKind = Object.fromEntries(order.map((k) => [k, []]));
    for (const d of docs) (byKind[d.kind] || (byKind[d.kind] = [])).push(d);
    const containerNav = order
    .filter((k) => (byKind[k] || []).length)
    .map((k) => ({ kind: k, items: (byKind[k] || []).map((d) => ({ name: d.name || d.longname, href: d.href })) }));

    // Prefer a user-provided index markdown file, then README.*, else the container listing
    let indexTitle = 'Documentation';
    let indexContentHtml = null;
    try {
        const idxRaw = (typeof tconf.index === 'string') ? tconf.index : null;
        const cwd = env?.pwd || process.cwd();
        const tryPaths = [];
        if (idxRaw) tryPaths.push(path.isAbsolute(idxRaw) ? idxRaw : path.resolve(cwd, idxRaw));
        tryPaths.push(
            path.resolve(cwd, 'README.md'),
            path.resolve(cwd, 'Readme.md'),
            path.resolve(cwd, 'readme.md'),
            path.resolve(cwd, 'README.markdown')
        );
        for (const pth of tryPaths) {
            if (pth && nfs.existsSync(pth) && nfs.statSync(pth).isFile()) {
                const md = nfs.readFileSync(pth, 'utf8');
                // Title from first heading if present
                const m = /^(?:\s|\uFEFF)*(#{1,6})\s+(.+)$/m.exec(md);
                if (m) indexTitle = String(m[2]).trim();
                // Inject markdown content as-is (no conversion)
                indexContentHtml = md;
                break;
            }
        }
    } catch (_) {}
    let writeCount = 0;
    if (!indexContentHtml) {
        const indexHtml = views.render('index.tmpl', { title: 'Documentation', nav: containerNav });
        fs.writeFileSync(path.join(outdir, 'index.html'), applyLayout(indexHtml, indexTitle, navGroups, null), 'utf8');
        writeCount++;
    } else {
        const rendered = markdownParser(indexContentHtml);
        fs.writeFileSync(path.join(outdir, 'index.html'), applyLayout(rendered, indexTitle, navGroups, null), 'utf8');
        writeCount++;
    }

    // Render a page per doclet (skip child members/methods/events that link to parent anchors)
    for (const d of docs) {
        const kindLower = String(d.kind || '').toLowerCase();
        const hasParent = !!(d.memberof || (d.memberofLongname && nodeByLongname.get(d.memberofLongname)));
        if (['member', 'method', 'event', 'function'].includes(d.kind) && hasParent) {
            // This symbol renders within its parent's page; skip standalone page
            continue;
        }
        const classKinds = [
            { title: 'Instance Members', key: 'instance_members' },
            { title: 'Static Members', key: 'static_members' },
            { title: 'Instance Methods', key: 'instance_methods' },
            { title: 'Static Methods', key: 'static_methods' }
        ];
        const baseKinds = [
            { title: 'Members', key: 'members' },
            { title: 'Methods', key: 'methods' }
        ];
        const commonKinds = [
            { title: 'Classes', key: 'classes' },
            { title: 'Interfaces', key: 'interfaces' },
            { title: 'Mixins', key: 'mixins' },
            { title: 'Namespaces', key: 'namespaces' },
            { title: 'Type Definitions', key: 'typedefs' },
            { title: 'Events', key: 'events' },
            { title: 'Enums', key: 'enums' }
        ];
        const kinds = (d.kind === 'class' ? classKinds : baseKinds).concat(commonKinds);

        const html = views.render('doc.tmpl', { doc: d, kinds });
        const out = path.join(outdir, fileFor(d));
        fs.writeFileSync(out, applyLayout(html, d.longname || d.name, navGroups, d.href), 'utf8');
        writeCount++;
    }

    console.log('[template] Wrote', writeCount, 'files to', outdir);
};
