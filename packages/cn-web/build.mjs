// Builds the cn-web shadcn registry (Tailwind v4 React components). Mirrors the cn-native build,
// but AUTO-DERIVES each component item's files + registryDependencies + npm deps from the source
// imports, so the ~40-item registry needs no hand-maintenance. Curated titles/descriptions are
// reused from cn-native's registry.json where a component matches (same kebab name), else defaulted.
//
//   node build.mjs                   -> flatten src/ into registry/ (flat ./<basename> imports;
//                                       @piparo CSS imports -> the copied token files), emit
//                                       registry.build.json (shadcn input, deps as absolute URLs)
//                                       + public/list.json.
//   shadcn build registry.build.json -> compile public/r/<name>.json (what pcn/shadcn add fetches).
//
// Host is REGISTRY_URL (default https://cn.piparo.tech/r/) so the registry is re-targetable; the
// source is never mutated.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs'
import { join, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const SRC = join(ROOT, 'src')
const UI = join(SRC, 'components/ui')
const OUT = join(ROOT, 'registry')
const PUB = join(ROOT, 'public')
const REG_URL = process.env.REGISTRY_URL || 'https://cn.piparo.tech/r/'

const kebab = (name) =>
  'pui-' +
  name
    .replace(/^PUI/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()

// Curated metadata reused from cn-native (same components, same names).
let nativeMeta = {}
try {
  const nat = JSON.parse(readFileSync(join(ROOT, '../cn-native/registry.json'), 'utf8'))
  nativeMeta = Object.fromEntries(nat.items.map((i) => [i.name, { title: i.title, description: i.description }]))
} catch {
  // cn-native registry.json optional
}

// Descriptions for web-only items that have no cn-native twin.
const WEB_DESC = {
  'pui-data-table': 'Sortable, paginated data table with typed column defs, loading/empty states and row actions.',
}

// npm packages that are runtime deps when imported (react-dom is a peer added implicitly by react).
const isNpm = (spec) => !spec.startsWith('.') && spec !== 'react-dom'

// All exported component files (PUIX + ThemeProvider) -> kebab item name, for resolving sibling
// `./PUIY` / `./ThemeProvider` imports to their registry deps.
const componentFiles = readdirSync(UI).filter((f) => /\.tsx$/.test(f) && !f.includes('.stories.'))
const componentNames = new Set(componentFiles.map((f) => basename(f, '.tsx')))

// Parse one component's imports -> { npm: Set, deps: Set(registry item names), localTypes: bool }.
const parse = (code) => {
  const npm = new Set()
  const deps = new Set()
  for (const m of code.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const spec = m[1]
    if (isNpm(spec)) {
      // bare package: keep scope/name (e.g. @radix-ui/react-dialog, lucide-react, react)
      npm.add(spec)
    } else if (/\/lib\/utils$/.test(spec)) {
      deps.add('pui-utils')
    } else if (/\/lib\/useDisplayScale$/.test(spec)) {
      deps.add('pui-display-scale')
    } else if (/\.types$/.test(spec)) {
      // co-located types are part of the same item
    } else {
      const b = basename(spec)
      if (componentNames.has(b)) deps.add(kebab(b))
    }
  }
  return { npm, deps }
}

const items = []

// --- lib items (hand-defined: the cn() merge + the display-scale hook) ---
items.push({
  name: 'pui-utils',
  type: 'registry:lib',
  title: 'PUI Utils',
  description: 'Token-aware className merge (cn) for PUI web components.',
  dependencies: ['clsx', 'tailwind-merge'],
  files: [{ src: join(SRC, 'lib/utils.ts'), out: 'utils.ts', target: 'components/ui/utils.ts', type: 'registry:lib' }],
})
items.push({
  name: 'pui-display-scale',
  type: 'registry:hook',
  title: 'PUI Display Scale',
  description: 'ADR 0022 web display scaling: useDisplayScale / useApplyDisplayScale drive --ui-scale.',
  dependencies: ['react'],
  files: [
    { src: join(SRC, 'lib/useDisplayScale.ts'), out: 'useDisplayScale.ts', target: 'components/ui/useDisplayScale.ts', type: 'registry:hook' },
  ],
})

// --- theme item: the Tailwind v4 entry + the copied token CSS + the shared @theme ---
items.push({
  name: 'pui-theme-css',
  type: 'registry:style',
  title: 'PUI Theme (CSS)',
  description: 'Tailwind v4 entry: token CSS vars + the shared @theme mapping + tw-animate-css.',
  dependencies: ['tailwindcss', 'tw-animate-css'],
  files: [
    { src: join(SRC, 'index.css'), out: 'index.css', target: 'app/index.css', type: 'registry:style' },
    { src: join(SRC, 'piparo-theme.css'), out: 'piparo-theme.css', target: 'app/piparo-theme.css', type: 'registry:style' },
    { src: join(SRC, 'theme.css'), out: 'theme.css', target: 'app/theme.css', type: 'registry:style' },
  ],
})

// --- component items (auto-derived) ---
for (const file of componentFiles) {
  const name = basename(file, '.tsx')
  const code = readFileSync(join(UI, file), 'utf8')
  const { npm, deps } = parse(code)
  const itemName = kebab(name)
  const files = [{ src: join(UI, file), out: file, target: `components/ui/${file}`, type: 'registry:ui' }]
  const typesFile = `${name}.types.ts`
  if (existsSync(join(UI, typesFile))) {
    files.push({ src: join(UI, typesFile), out: typesFile, target: `components/ui/${typesFile}`, type: 'registry:ui' })
    // a co-located .types may import sibling component types; not a separate registry dep
    for (const m of readFileSync(join(UI, typesFile), 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      if (isNpm(m[1])) npm.add(m[1])
    }
  }
  const meta = nativeMeta[itemName] || {
    title: name.replace(/^PUI/, 'PUI '),
    description: WEB_DESC[itemName] || `${name} component.`,
  }
  items.push({
    name: itemName,
    type: 'registry:component',
    title: meta.title,
    description: meta.description,
    registryDependencies: [...deps].sort(),
    dependencies: [...npm].sort(),
    files,
  })
}

const ownNames = new Set(items.map((i) => i.name))

// Flatten relative imports to './<basename>'; keep local token CSS imports pointed at copied files.
const flatten = (code) =>
  code
    .replace(/(from\s+['"])(\.\.?\/[^'"]+)(['"])/g, (_m, pre, spec, post) => `${pre}./${basename(spec)}${post}`)
    .replace(/(@import\s+['"])\.\/piparo-theme\.css(['"])/g, '$1./piparo-theme.css$2')
    .replace(/(@import\s+['"])\.\/theme\.css(['"])/g, '$1./theme.css$2')

mkdirSync(OUT, { recursive: true })
mkdirSync(PUB, { recursive: true })

const manifest = {
  $schema: 'https://ui.shadcn.com/schema.json',
  name: 'pui-web',
  homepage: 'https://piparo.tech',
  items: [],
}
for (const item of items) {
  for (const f of item.files) {
    writeFileSync(join(OUT, f.out), flatten(readFileSync(f.src, 'utf8')))
  }
  manifest.items.push({
    name: item.name,
    type: item.type,
    title: item.title,
    description: item.description,
    ...(item.registryDependencies?.length
      ? {
          registryDependencies: item.registryDependencies.map((d) =>
            ownNames.has(d) ? `${REG_URL}${d}.json` : d,
          ),
        }
      : {}),
    ...(item.dependencies?.length ? { dependencies: item.dependencies } : {}),
    files: item.files.map((f) => ({ path: `registry/${f.out}`, type: f.type, target: f.target })),
  })
}

writeFileSync(join(ROOT, 'registry.build.json'), JSON.stringify(manifest, null, 2) + '\n')
writeFileSync(
  join(PUB, 'list.json'),
  JSON.stringify(items.map((i) => ({ value: i.name, title: i.title, description: i.description }))),
)

console.log(
  `cn-web registry: derived ${items.length} items -> registry/, wrote registry.build.json + public/list.json (host ${REG_URL})`,
)
