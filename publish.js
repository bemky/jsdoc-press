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

function singularize (str) {
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
    // Read cleaning option (default: true) and wipe output directory if enabled
    const cleanOutput = (env && env.conf && env.conf.templates && typeof env.conf.templates.cleanOutput === 'boolean')
    ? !!env.conf.templates.cleanOutput
    : true;
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
    const showKindIcons = (env && env.conf && env.conf.templates && typeof env.conf.templates.showKindIcons === 'boolean')
        ? !!env.conf.templates.showKindIcons
        : true;

    const views = Object.assign(new template.Template(path.join(__dirname, 'tmpl')), {
        pluralize: pluralize,
        titleize: titleize,
        kindLabel: kindLabel,
        find: function(spec) { return this.findAll(spec).at(0) },
        htmlsafe: helper.htmlsafe,
        findAll: spec => helper.find(data, spec),
        conf: (env && env.conf) ? env.conf : {},
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
        const customDirRaw = this && this.conf && this.conf.templates && typeof this.conf.templates.templates === 'string'
        ? this.conf.templates.templates
        : null;
        if (customDirRaw) {
            const overrideBase = path.isAbsolute(customDirRaw)
            ? customDirRaw
            : path.resolve(env.pwd || process.cwd(), customDirRaw);
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
        const targetBase = path.join(outdir, 'assets', subdir);
        if (!list || !list.length) return results;
        fs.mkPath(targetBase);
        for (const entry of list) {
            if (isUrl(entry)) { results.push(entry); continue; }
            try {
                const abs = path.isAbsolute(entry) ? entry : path.resolve(env.pwd || process.cwd(), entry);
                if (nfs.existsSync(abs)) {
                    const dest = path.join(targetBase, path.basename(abs));
                    nfs.copyFileSync(abs, dest);
                    results.push(path.toUrl ? path.toUrl(path.join('assets', subdir, path.basename(abs))) : path.join('assets', subdir, path.basename(abs)));
                } else {
                    results.push(entry);
                }
            } catch {
                results.push(entry);
            }
        }
        return results;
    }

    // Read template settings from jsdoc.json -> templates.{javascripts,stylesheets}
    const jsRaw = Array.isArray(env && env.conf && env.conf.templates && env.conf.templates.javascripts)
    ? env.conf.templates.javascripts.filter((s) => typeof s === 'string')
    : [];
    const cssRaw = Array.isArray(env && env.conf && env.conf.templates && env.conf.templates.stylesheets)
    ? env.conf.templates.stylesheets.filter((s) => typeof s === 'string')
    : [];
    const jsIncludes = stageAssets(jsRaw, 'scripts');
    const cssIncludes = stageAssets(cssRaw, 'styles');

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
    const kindOrder = ['module', 'class', 'interface', 'mixin', 'namespace', 'method', 'member', 'typedef', 'enum', 'event'];
    const orderIndex = new Map(kindOrder.map((k, i) => [k, i]));

    const nodeByLongname = new Map();
    // Expose a simple view helper to link to a doc by longname
    // Accepts a string longname and returns the computed href (or empty string if unknown)
    views.linkTo = function linkTo(longname) {
        if (!longname) return '';
        const node = nodeByLongname.get(longname);
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
        target.members[bucket].push(item);
    }
    for (const d of docs) {
        const node = nodeByLongname.get(d.longname);
        const parent = d.memberofLongname ? nodeByLongname.get(d.memberofLongname) : null;
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
    for (const d of docs) {
        const n = nodeByLongname.get(d.longname);
        if (!n) continue;
        const parent = n.memberof || (n.memberofLongname ? nodeByLongname.get(n.memberofLongname) : null);
        const isModuleParent = !!(parent && parent.kind === 'module') || (typeof n.memberofLongname === 'string' && n.memberofLongname.indexOf('module:') === 0);
        if (isModuleParent) pushKind(n.kind, n);
    }
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

    // Render index content (flat by-kind listing) separate from sidebar
    const order = ['module', 'class', 'interface', 'mixin', 'namespace', 'method', 'member', 'typedef', 'enum', 'event'];
    const byKind = Object.fromEntries(order.map((k) => [k, []]));
    for (const d of docs) (byKind[d.kind] || (byKind[d.kind] = [])).push(d);
    const containerNav = order
    .filter((k) => (byKind[k] || []).length)
    .map((k) => ({ kind: k, items: (byKind[k] || []).map((d) => ({ name: d.name || d.longname, href: fileFor(d) })) }));

    const indexHtml = views.render('container.tmpl', { title: 'Documentation', nav: containerNav });
    fs.writeFileSync(path.join(outdir, 'index.html'), applyLayout(indexHtml, 'Documentation', navGroups, null), 'utf8');

    // Render a page per doclet
    for (const d of docs) {
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
    }

    console.log('[template] Wrote', 1 + docs.length, 'files to', outdir);
};
