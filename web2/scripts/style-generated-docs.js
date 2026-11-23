const fs = require('node:fs');
const path = require('node:path');

const publicPath = path.join(__dirname, '../public');
const docsPath = path.join(publicPath, 'docs');
const themeMarker = '\n/* --- PHYSLIB CUSTOM THEME --- */\n';
const faviconLinks = '<link rel="icon" type="image/svg+xml" href="/icon.svg?v=mono" media="(prefers-color-scheme: light)"/>' +
  '<link rel="icon" type="image/svg+xml" href="/physlib-icon-dark.svg?v=mono" media="(prefers-color-scheme: dark)"/>';

function styleGeneratedDocs() {
  const stylePath = path.join(docsPath, 'style.css');
  const baseStyle = fs.readFileSync(stylePath, 'utf8').split(themeMarker)[0];
  const theme = ['blue-palette.css', 'physlib-theme.css', 'docs-theme.css']
    .map((file) => fs.readFileSync(path.join(publicPath, file), 'utf8'))
    .join('\n');
  fs.writeFileSync(stylePath, baseStyle + themeMarker + theme);

  const expandNavPath = path.join(docsPath, 'expand-nav.js');
  if (fs.existsSync(expandNavPath)) {
    const expandNav = fs.readFileSync(expandNavPath, 'utf8');
    const updated = expandNav
      .replace(/a\.style\.fontWeight = 'bold';\s*a\.style\.color = 'inherit';/,
        'a.setAttribute("aria-current", "page");')
      .replace(/^\s*\/\/ center the link we were looking for and stop\s*\n\s*a\.scrollIntoView\([^\n]*\);\n/m, '\n');
    if (updated !== expandNav) fs.writeFileSync(expandNavPath, updated);
  }

  for (const file of fs.readdirSync(docsPath, { recursive: true })) {
    if (path.extname(file) !== '.html') continue;
    const isIndex = file === 'index.html';
    const filePath = path.join(docsPath, file);
    const html = fs.readFileSync(filePath, 'utf8');
    const withFavicon = html.replace(/<link rel="icon" href="[^"]*favicon\.svg"\s*\/?>/, faviconLinks);
    if (file === 'navbar.html') {
      const updatedNav = withFavicon
        .replace(/<details class="docs-general"><summary>General documentation<\/summary>([\s\S]*?)<\/details>/,
          '<h3>General documentation</h3>$1')
        .replace('<h3>General documentation</h3>', '<h3>General</h3>')
        .replace('<a href="./">index</a>', '<a href="/docs/index.html">Index</a>')
        .replace('>foundational types</a>', '>Foundational Types</a>')
        .replace('>tactics</a>', '>Tactics</a>')
        .replace(/<summary>([^<]+?) \((<a\b[^>]*>)file<\/a>\)<\/summary>/g, '<summary>$2$1</a></summary>')
        .replace(/<script\b[^>]*src="\.\/nav\.js"[^>]*><\/script>/, '');
      const withAccordion = updatedNav.includes('src="/docs-sidebar.js"')
        ? updatedNav
        : updatedNav.replace('</head>', '<script type="module" src="/docs-sidebar.js"></script></head>');
      if (withAccordion !== html) fs.writeFileSync(filePath, withAccordion);
      continue;
    }
    const toolsHeader = isIndex ? '<header class="docs-tools" data-docs-index>' : '<header class="docs-tools">';
    let indexSearch;
    const updated = withFavicon.replace('<nav class="internal_nav"><p><a href="#top">return to top</a></p>', '<nav class="internal_nav">')
      .replace(/<header\b[^>]*>[\s\S]*?<\/header>/, (header) => {
      const tools = header
        .replace(/^<header\b[^>]*>/, toolsHeader)
        .replace(/<h2\b[^>]*>/, '<h2>')
        .replace(/<h2><span class="name">Index<\/span><\/h2>/, (heading) => isIndex ? '<h2>Documentation</h2>' : heading)
        .replace('<label for="nav_toggle"></label>', '<label for="nav_toggle" aria-label="Browse modules"></label>')
        .replace(/<span(?: class="docs-home-wrap")?><a\b[^>]*>[\s\S]*?<\/a>(?:<span class="docs-section">Documentation<\/span>)?<\/span>(?=<\/h1>)/i, '')
        .replace(/name="q" autocomplete="off"(?: aria-label="Search declarations" placeholder="Search declarations")*/, 'name="q" autocomplete="off" aria-label="Search declarations" placeholder="Search declarations"');
      if (!isIndex) return tools;
      return tools.replace(/<form\b[^>]*\bid="search_form"[^>]*>[\s\S]*?<\/form>/, (form) => {
        indexSearch = form;
        return '';
      });
    });
    const withSiteHeader = updated.includes('class="docs-tools"') && !updated.includes('class="docs-site-header"')
      ? updated.replace(toolsHeader, (header) => `<iframe class="docs-site-header" src="/docs-header" title="Physlib navigation"></iframe>${header}`)
      : updated;
    const pageWithSearch = isIndex
      ? withSiteHeader.replace(/<main\b[^>]*>[\s\S]*?<\/main>/, (main) => {
          const formPattern = /<form\b[^>]*\bid="search_form"[^>]*>[\s\S]*?<\/form>/;
          const form = indexSearch ?? main.match(formPattern)?.[0];
          if (!form) return main;
          const search = form
            .replace('action="https://google.com/search"', 'action="./search.html"')
            .replace(/<input[^>]*name="sitesearch"[^>]*\/>/, '')
            .replace('<button>Google site search</button>', '')
            .replace(/>Search(?: <span aria-hidden="true">[↵→]<\/span>)?<\/button>/,
              '>Search</button>');
          return main.replace(formPattern, '').replace('</p>', (version) => version + search);
        })
      : withSiteHeader;
    const moduleTitle = pageWithSearch.match(/<header class="docs-tools"><h1>[\s\S]*?<\/h1><h2>([\s\S]*?)<\/h2>/)?.[1];
    const emptyModule = /<main>(?:<h1>[\s\S]*?<\/h1>)?\s*<\/main>/;
    let pageWithTitle = pageWithSearch;
    if (moduleTitle && pageWithSearch.includes('class="internal_nav"') && emptyModule.test(pageWithSearch)) {
      const imports = /<details><summary>Imports<\/summary>(<ul>[\s\S]*?<\/ul>)<\/details>/;
      const importsList = pageWithSearch.match(imports)?.[1];
      const source = pageWithSearch.match(/<p class="gh_nav_link">(<a\b[^>]*>source<\/a>)<\/p>/)?.[1];
      const sourceLink = source ? `<p>${source.replace('>source<', '>View Lean source<')}</p>` : '';
      const importsSection = importsList ? `<section><h2>Imports</h2>${importsList}</section>` : '';
      pageWithTitle = pageWithSearch
        .replace(emptyModule, () => `<main><h1>${moduleTitle}</h1>${sourceLink}${importsSection}</main>`);
    }
    const pageWithSidebar = pageWithTitle.includes('class="docs-sidebar-column"')
      ? pageWithTitle
      : pageWithTitle.replace(/<nav class="nav"><iframe\b[^>]*class="navframe"[^>]*><\/iframe><\/nav>/,
          (sidebar) => `<aside class="docs-sidebar-column">${sidebar}</aside>`);
    const result = pageWithSidebar.includes('class="docs-site-header"') && !pageWithSidebar.includes('class="docs-site-footer"')
      ? pageWithSidebar.replace('</body>', '<iframe class="docs-site-footer" src="/docs-header" title="Physlib footer" loading="lazy"></iframe></body>')
      : pageWithSidebar;
    if (result !== html) fs.writeFileSync(filePath, result);
  }
}

if (require.main === module) styleGeneratedDocs();

module.exports = { styleGeneratedDocs };
