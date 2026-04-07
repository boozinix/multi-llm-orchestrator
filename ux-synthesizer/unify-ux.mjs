#!/usr/bin/env node
/**
 * Multi-project UX Synthesizer — compares Figma / Stitch Desktop / Stitch Mobile, writes analysis,
 * then merges into Unified/<project>/.
 *
 * Layout (config.workspaceRoot):
 *   Figma/<project>/pages/*.tsx
 *   Figma/<project>/mapping.json   (optional; falls back to ux-synthesizer/mapping.json defaults)
 *   StitchDesktop/<project>/...    (e.g. <slug>/code.html)
 *   StitchMobile/<project>/...     (e.g. <slug>/code.html)
 *   Unified/<project>/             (output + Vite app)
 *
 * Usage:
 *   node ux-synthesizer/unify-ux.mjs
 *   node ux-synthesizer/unify-ux.mjs --project rewardstracker
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function resolveFromScript(rel) {
  return path.resolve(__dirname, rel);
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function loadConfig() {
  const configPath = resolveFromScript('config.json');
  const base = await readJson(configPath);
  const defaultsPath = resolveFromScript('mapping.json');
  try {
    base.defaultMapping = await readJson(defaultsPath);
    if (base.defaultMapping._comment) delete base.defaultMapping._comment;
  } catch {
    base.defaultMapping = {};
  }
  return base;
}

async function getApiKey(config) {
  const tryFiles = (config.envFiles || ['.env.local', '../.env.local']).map((f) =>
    path.isAbsolute(f) ? f : resolveFromScript(f)
  );
  for (const envFile of tryFiles) {
    try {
      const text = await fs.readFile(envFile, 'utf8');
      const match = text.match(/^\s*OPENAI_API_KEY\s*=\s*(.+)\s*$/m);
      if (match) return match[1].trim().replace(/^["']|["']$/g, '');
    } catch {
      /* continue */
    }
  }
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY.trim();
  return null;
}

function workspaceRoot(config) {
  return resolveFromScript(config.workspaceRoot || '../UX-Workspace');
}

function projectPaths(config, project) {
  const root = workspaceRoot(config);
  const figmaPages = path.join(root, config.figmaSubdir || 'Figma', project, config.figmaPagesSubpath || 'pages');
  const figmaProject = path.join(root, config.figmaSubdir || 'Figma', project);
  const stitchDesktopDir = path.join(root, config.stitchDesktopSubdir || 'StitchDesktop', project);
  const stitchMobileDir = path.join(root, config.stitchMobileSubdir || 'StitchMobile', project);
  const outputDir = path.join(root, config.unifiedSubdir || 'Unified', project);
  return { root, figmaPages, figmaProject, stitchDesktopDir, stitchMobileDir, outputDir };
}

async function listProjects(config) {
  const root = workspaceRoot(config);
  const figmaRoot = path.join(root, config.figmaSubdir || 'Figma');
  if (!(await pathExists(figmaRoot))) return [];
  const entries = await fs.readdir(figmaRoot, { withFileTypes: true });
  const names = [];
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith('.')) continue;
    const pages = path.join(figmaRoot, e.name, config.figmaPagesSubpath || 'pages');
    if (await pathExists(pages)) names.push(e.name);
  }
  return names.sort();
}

async function loadProjectMapping(figmaProject, defaultMapping) {
  const mp = path.join(figmaProject, 'mapping.json');
  if (await pathExists(mp)) {
    const m = await readJson(mp);
    if (m._comment) delete m._comment;
    return m;
  }
  return { ...defaultMapping };
}

async function collectFilesRecursive(dir, matchExt) {
  const out = [];
  if (!(await pathExists(dir))) return out;
  async function walk(current, rel) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const p = path.join(current, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) await walk(p, r);
      else if (matchExt.some((ext) => e.name.endsWith(ext))) {
        const content = await fs.readFile(p, 'utf8');
        out.push({ rel: r, content });
      }
    }
  }
  await walk(dir, '');
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
}

function bundleLabeled(files, label) {
  if (!files.length) return `(no ${label} files found)\n`;
  return files.map((f) => `=== ${label}: ${f.rel} ===\n${f.content}\n`).join('\n');
}

function truncateBundle(text, maxChars) {
  if (text.length <= maxChars) return { text, truncated: false };
  return {
    text: text.slice(0, maxChars) + `\n\n[... truncated ${text.length - maxChars} characters ...]\n`,
    truncated: true,
  };
}

function resolveMappedHtml(mappedRootDir, mappingValue) {
  if (mappingValue == null) return null;
  if (typeof mappingValue !== 'string') return null;
  const trimmed = mappingValue.trim();
  if (!trimmed) return null;
  if (trimmed.endsWith('.html') || trimmed.includes('/')) {
    return path.join(mappedRootDir, trimmed);
  }
  return path.join(mappedRootDir, trimmed, 'code.html');
}

async function readCodeSafe(codePath) {
  if (!codePath) return '';
  try {
    return await fs.readFile(codePath, 'utf8');
  } catch {
    return '';
  }
}

function stripCodeFences(text) {
  let s = text.trim();
  s = s.replace(/^```(?:tsx|typescript|ts|jsx|javascript|js|md|markdown)?\s*/i, '');
  s = s.replace(/\s*```\s*$/i, '');
  return s.trim();
}

async function openaiChat({ apiKey, model, messages, temperature }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, temperature }),
  });
  const data = await response.json();
  if (!response.ok) {
    const msg = data?.error?.message || response.statusText;
    throw new Error(`OpenAI API error: ${msg}`);
  }
  if (data.error) throw new Error(data.error.message || String(data.error));
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty completion from OpenAI');
  return content;
}

async function runFullComparison({
  apiKey,
  model,
  temperature,
  project,
  figmaBundle,
  stitchDesktopBundle,
  stitchMobileBundle,
  maxChars,
}) {
  const raw =
    `PROJECT: ${project}\n\n` +
    `--- FIGMA SOURCES (React/TS pages) ---\n${figmaBundle}\n\n` +
    `--- STITCH DESKTOP SOURCES (HTML/CSS exports) ---\n${stitchDesktopBundle}\n\n` +
    `--- STITCH MOBILE SOURCES (HTML/CSS exports) ---\n${stitchMobileBundle}\n`;
  const budgets = [
    maxChars,
    Math.floor(maxChars * 0.75),
    Math.floor(maxChars * 0.5),
    Math.floor(maxChars * 0.35),
  ]
    .filter((n, i, arr) => n > 12000 && arr.indexOf(n) === i)
    .sort((a, b) => b - a);

  let lastErr = null;
  for (const budget of budgets) {
    const { text: corpus, truncated } = truncateBundle(raw, budget);
  const userPrompt = `You are a principal product designer and staff UX engineer for "The Sovereign Ledger". The blocks above are multiple implementations of the same product (${project}) from different tools.

Produce a thorough Markdown document with:

1. **Executive summary** — 6–10 bullets.
2. **Source inventory** — what each toolchain appears to cover (screens, flows, components).
3. **Comparative strengths & weaknesses**
   - Figma export: pros / cons
   - Stitch desktop: pros / cons
   - Stitch mobile: pros / cons (if empty, say "not provided")
4. **Alignment** — where implementations agree vs diverge (IA, patterns, naming).
5. **Detailed pros and cons** — usability, visual hierarchy, density, affordances, motion, copy, accessibility risks.
6. **Risks of naive merging** — what would break or feel inconsistent.
7. **Prioritized recommendations** — what to keep from each source and in what order.
8. **Synthesis brief for codegen** — a numbered list of 12–20 MUST-FOLLOW rules for a single merged React+Tailwind codebase (layout shell, typography scale, color usage, spacing, component patterns, empty/loading/error states).

DESIGN PRIORITY CONTRACT (must be explicit in your recommendations):
- Aesthetics: Figma wins (Emerald/Slate-900, rounded-3xl, Manrope tone).
- Desktop layout (md and up): Stitch Desktop wins (fixed sidebar + dense dashboard).
- Mobile layout (below md): Stitch Mobile wins (bottom tab nav + dark net-worth card style).

${truncated ? 'Note: input was truncated due to size; call out any uncertainty.\n' : ''}
Be specific and reference concrete patterns you see in the code. Output Markdown only.`;

    try {
      return await openaiChat({
        apiKey,
        model,
        temperature,
        messages: [
          {
            role: 'system',
            content:
              'You write clear, actionable UX engineering documents in Markdown. Be honest about gaps. No filler.',
          },
          { role: 'user', content: userPrompt + '\n\n--- FULL CORPUS ---\n' + corpus },
        ],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Retry only for token/size/rate limit style failures.
      if (/request too large|tokens per min|rate limit|context length|too many tokens/i.test(msg)) {
        console.warn(`Analysis call hit size/rate limit at budget=${budget}, retrying with smaller input...`);
        lastErr = err;
        continue;
      }
      throw err;
    }
  }

  if (lastErr) throw lastErr;
  throw new Error('Unable to run full comparison: no valid budget available');
}

async function synthesizeUX({
  apiKey,
  model,
  temperature,
  figmaCode,
  stitchDesktopCode,
  stitchMobileCode,
  pageName,
  styleReference = null,
  analysisExcerpt = '',
  projectLabel = '',
}) {
  const mode = styleReference ? 'Refinement (Figma-only → universal style)' : 'Synthesis (Figma + Stitch)';
  console.log(`\n→ ${mode}: ${pageName}`);

  const branding = projectLabel
    ? `PROJECT: ${projectLabel}\n- Honor the product context implied by the analysis and sources; use a cohesive dashboard/product shell when appropriate.`
    : `- Use a cohesive product shell when sources imply a dashboard layout.`;

  const prompt = `You are a senior UX engineer for The Sovereign Ledger. You merge implementations of the SAME screen into one high-quality React + TypeScript component using Tailwind CSS.

GOAL
- Preserve Figma/React logic: hooks, state, handlers, props, data shapes, and component structure where sensible.
- Borrow layout, hierarchy, microcopy, and polish from Stitch HTML/CSS where it improves UX.
- Obey the PRIOR ANALYSIS synthesis brief below (when present).

${branding}

RULES
- TypeScript + React function components only.
- Tailwind utility classes only (no inline style except rare dynamic values).
- Do not leave TODOs. If data is unknown, use plausible mock constants inside the file.
- Export exactly ONE default React component. Name the function to match the filename stem (e.g. Dashboard.tsx -> export default function Dashboard).
- No markdown — only code.

DESIGN HIERARCHY (strict)
- Figma wins for aesthetics: emerald/slate visual language, premium spacing, rounded-3xl feel, high polish.
- Stitch Desktop wins for md-and-larger layout: fixed sidebar shell and efficient data density.
- Stitch Mobile wins for below-md layout/interaction: bottom tab behavior and dark hero-card composition.
- Keep one adaptive component using responsive classes rather than separate duplicated components.

--- PAGE NAME ---
${pageName}

--- PRIOR ANALYSIS (synthesis brief — follow strictly) ---
${analysisExcerpt || '(none — rely on sources below)'}

--- FIGMA (React/TS) ---
${figmaCode}

${stitchDesktopCode ? `--- STITCH DESKTOP (HTML/CSS) ---\n${stitchDesktopCode}\n` : '--- STITCH DESKTOP ---\n(not provided for this page)\n'}

${stitchMobileCode ? `--- STITCH MOBILE (HTML/CSS) ---\n${stitchMobileCode}\n` : '--- STITCH MOBILE ---\n(not provided for this page)\n'}

${
  styleReference
    ? `--- STYLE REFERENCE (match spacing, typography rhythm, chrome; keep THIS page’s content) ---\n${styleReference}\n`
    : ''
}`;

  const code = await openaiChat({
    apiKey,
    model,
    temperature,
    messages: [
      {
        role: 'system',
        content:
          'You return ONLY valid TypeScript/React (.tsx) source code. Use a single `export default function Name` matching the page name. No markdown fences, no commentary.',
      },
      { role: 'user', content: prompt },
    ],
  });

  return stripCodeFences(code);
}

function toCmpName(fileBase) {
  return fileBase.replace(/\.tsx$/i, '');
}

async function writeReport(outputDir, report) {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, 'synthesis-report.json'), JSON.stringify(report, null, 2), 'utf8');
}

async function writeScaffold({ outputDir, pageFiles, projectTitle }) {
  const src = path.join(outputDir, 'src');
  const safeTitle = String(projectTitle || 'Combined UX').replace(/</g, '');

  const names = pageFiles.map((f) => toCmpName(f));
  const imports = names.map((n) => `import ${n} from './pages/${n}';`).join('\n');

  const packageJson = {
    name: `unified-ux-${String(projectTitle || 'app')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')}`,
    private: true,
    version: '0.0.1',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: {
      react: '^18.3.1',
      'react-dom': '^18.3.1',
      'react-router-dom': '^6.28.0',
      'lucide-react': '^0.469.0',
      'sonner': '^1.7.2',
      '@radix-ui/react-slot': '^1.1.0',
      '@radix-ui/react-select': '^2.1.4',
      '@radix-ui/react-switch': '^1.1.2',
      '@radix-ui/react-label': '^2.1.0',
      '@radix-ui/react-checkbox': '^1.1.2',
      '@radix-ui/react-separator': '^1.1.0',
      'class-variance-authority': '^0.7.1',
      clsx: '^2.1.1',
      'tailwind-merge': '^2.5.4'
    },
    devDependencies: {
      '@types/react': '^18.3.12',
      '@types/react-dom': '^18.3.1',
      '@vitejs/plugin-react': '^4.3.4',
      autoprefixer: '^10.4.20',
      postcss: '^8.4.49',
      tailwindcss: '^3.4.15',
      typescript: '^5.7.2',
      vite: '^5.4.11',
    },
  };

  await fs.writeFile(path.join(outputDir, 'package.json'), JSON.stringify(packageJson, null, 2), 'utf8');

  await fs.writeFile(
    path.join(outputDir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          useDefineForClassFields: true,
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'Bundler',
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx',
          strict: true,
        },
        include: ['src'],
      },
      null,
      2
    ),
    'utf8'
  );

  await fs.writeFile(
    path.join(outputDir, 'vite.config.ts'),
    `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n});\n`,
    'utf8'
  );

  await fs.writeFile(
    path.join(outputDir, 'tailwind.config.js'),
    `/** @type {import('tailwindcss').Config} */\nexport default {\n  content: ['./index.html', './src/**/*.{ts,tsx}'],\n  theme: { extend: {} },\n  plugins: [],\n};\n`,
    'utf8'
  );

  await fs.writeFile(
    path.join(outputDir, 'postcss.config.js'),
    `export default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n};\n`,
    'utf8'
  );

  await fs.writeFile(
    path.join(outputDir, 'index.html'),
    `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <link rel="preconnect" href="https://fonts.googleapis.com" />\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n    <link\n      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"\n      rel="stylesheet"\n    />\n    <title>${safeTitle}</title>\n  </head>\n  <body class="min-h-screen bg-slate-950 text-slate-100">\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n`,
    'utf8'
  );

  await fs.writeFile(
    path.join(src, 'main.tsx'),
    `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport { BrowserRouter } from 'react-router-dom';\nimport './index.css';\nimport { App } from './App';\n\nReactDOM.createRoot(document.getElementById('root')!).render(\n  <React.StrictMode>\n    <BrowserRouter>\n      <App />\n    </BrowserRouter>\n  </React.StrictMode>\n);\n`,
    'utf8'
  );

  await fs.writeFile(
    path.join(src, 'index.css'),
    `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n:root {\n  color-scheme: light;\n  --surface: #f8fafc;\n}\n\nbody {\n  margin: 0;\n  font-family: \"Inter\", ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, Arial, sans-serif;\n  background: var(--surface);\n  color: #0f172a;\n}\n\n/* Design-token compatibility used by generated pages */\n.bg-primary { background-color: #1d4ed8; }\n.bg-primary\\/10 { background-color: rgba(29, 78, 216, 0.1); }\n.bg-primary-container { background-color: #dbeafe; }\n.bg-primary-dim { background-color: #1e3a8a; }\n.bg-secondary-container { background-color: #ccfbf1; }\n.bg-tertiary-container { background-color: #ede9fe; }\n.bg-tertiary-dim { background-color: #4f46e5; }\n.bg-primary-fixed { background-color: #bfdbfe; }\n.text-on-primary { color: #eff6ff; }\n.text-on-secondary-container { color: #134e4a; }\n.text-on-tertiary-container { color: #4c1d95; }\n.text-on-primary-fixed { color: #1e3a8a; }\n.text-on-surface-variant { color: #475569; }\n.text-primary { color: #2563eb; }\n.text-error { color: #dc2626; }\n.bg-surface-container-lowest { background-color: #ffffff; }\n\n.font-headline,\n.font-label {\n  font-family: \"Inter\", ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, Arial, sans-serif;\n}\n`,
    'utf8'
  );

  await fs.writeFile(
    path.join(src, 'App.tsx'),
    `import { useEffect } from 'react';\nimport { Navigate, Route, Routes } from 'react-router-dom';\nimport { Toaster } from 'sonner';\n${imports}\nimport { initializeMockData } from './utils/storage';\n\nexport function App() {\n  useEffect(() => {\n    initializeMockData();\n  }, []);\n\n  const Dashboard = ${names.includes('Dashboard') ? 'Dashboard' : names[0]};\n\n  return (\n    <div className=\"min-h-screen bg-[#f8fafc] text-slate-900\">\n      <Routes>\n        <Route path=\"/\" element={<Dashboard />} />\n        ${names.includes('AddCard') ? '<Route path=\"/add-card\" element={<AddCard />} />\\n' : ''}${names.includes('AdminScraper') ? '<Route path=\"/admin\" element={<AdminScraper />} />\\n' : ''}${names.includes('Settings') ? '<Route path=\"/settings\" element={<Settings />} />\\n' : ''}        <Route path=\"/benefits\" element={<Dashboard />} />\n        <Route path=\"/calendar\" element={<Dashboard />} />\n        <Route path=\"*\" element={<Navigate to=\"/\" replace />} />\n      </Routes>\n      <Toaster richColors position=\"top-right\" />\n    </div>\n  );\n}\n`,
    'utf8'
  );

  await fs.writeFile(
    path.join(src, 'vite-env.d.ts'),
    `/// <reference types="vite/client" />\n`,
    'utf8'
  );

  // Minimal shared modules so generated pages compile reliably.
  await fs.mkdir(path.join(src, 'pages', 'ui'), { recursive: true });
  await fs.mkdir(path.join(src, 'utils'), { recursive: true });

  await fs.writeFile(
    path.join(src, 'pages', 'ui', 'utils.ts'),
    `import { clsx, type ClassValue } from 'clsx';\nimport { twMerge } from 'tailwind-merge';\n\nexport function cn(...inputs: ClassValue[]) {\n  return twMerge(clsx(inputs));\n}\n`,
    'utf8'
  );

  await fs.writeFile(
    path.join(src, 'pages', 'ui', 'button.tsx'),
    `import * as React from 'react';\nimport { Slot } from '@radix-ui/react-slot';\nimport { cva, type VariantProps } from 'class-variance-authority';\nimport { cn } from './utils';\n\nconst buttonVariants = cva('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50', {\n  variants: {\n    variant: {\n      default: 'bg-sky-600 text-white hover:bg-sky-700',\n      outline: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50',\n      ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',\n    },\n    size: {\n      default: 'h-9 px-4',\n      sm: 'h-8 px-3',\n      icon: 'h-9 w-9',\n    },\n  },\n  defaultVariants: { variant: 'default', size: 'default' },\n});\n\nexport function Button({ className, variant, size, asChild, ...props }: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {\n  const Comp = asChild ? Slot : 'button';\n  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;\n}\n`,
    'utf8'
  );

  await fs.writeFile(
    path.join(src, 'pages', 'ui', 'input.tsx'),
    `import * as React from 'react';\nimport { cn } from './utils';\n\nexport function Input({ className, type, ...props }: React.ComponentProps<'input'>) {\n  return (\n    <input\n      type={type}\n      className={cn('h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500', className)}\n      {...props}\n    />\n  );\n}\n`,
    'utf8'
  );

  await fs.writeFile(\n    path.join(src, 'pages', 'ui', 'label.tsx'),\n    `import * as React from 'react';\nimport * as LabelPrimitive from '@radix-ui/react-label';\nimport { cn } from './utils';\n\nexport function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {\n  return <LabelPrimitive.Root className={cn('text-sm font-medium text-slate-800', className)} {...props} />;\n}\n`,\n    'utf8'\n  );\n+\n+  await fs.writeFile(\n+    path.join(src, 'utils', 'storage.ts'),\n+    `import type { Benefit, CreditCard, UserSettings } from '../types';\n\nconst STORAGE_KEYS = { CARDS: 'rewardstracker_cards', BENEFITS: 'rewardstracker_benefits', SETTINGS: 'rewardstracker_settings' };\n\nexport function getCards(): CreditCard[] { const data = localStorage.getItem(STORAGE_KEYS.CARDS); return data ? JSON.parse(data) : []; }\nexport function saveCard(card: CreditCard): void { const cards = getCards(); cards.push(card); localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards)); }\nexport function getBenefits(): Benefit[] { const data = localStorage.getItem(STORAGE_KEYS.BENEFITS); return data ? JSON.parse(data) : []; }\nexport function saveBenefit(benefit: Benefit): void { const benefits = getBenefits(); benefits.push(benefit); localStorage.setItem(STORAGE_KEYS.BENEFITS, JSON.stringify(benefits)); }\nexport function updateBenefit(benefitId: string, updates: Partial<Benefit>): void { const benefits = getBenefits().map((b) => (b.id === benefitId ? { ...b, ...updates } : b)); localStorage.setItem(STORAGE_KEYS.BENEFITS, JSON.stringify(benefits)); }\nexport function getSettings(): UserSettings { const data = localStorage.getItem(STORAGE_KEYS.SETTINGS); return data ? JSON.parse(data) : { pushNotifications: true, emailReminders: false }; }\nexport function saveSettings(settings: UserSettings): void { localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings)); }\nexport function initializeMockData(): void {\n  if (getCards().length) return;\n  const mockCards: CreditCard[] = [\n    { id: '1', name: 'Chase Sapphire Reserve', last4: '4532', appliedDate: '2024-01-15', issuer: 'Chase' },\n    { id: '2', name: 'American Express Gold', last4: '8901', appliedDate: '2023-06-20', issuer: 'Amex' }\n  ];\n  localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(mockCards));\n  const now = Date.now();\n  const mockBenefits: Benefit[] = [\n    { id: 'b1', cardId: '1', cardName: 'Chase Sapphire Reserve', title: '$300 Travel Credit', value: 300, expiresAt: new Date(now + 15*864e5).toISOString(), frequency: 'annual', isUsed: false, category: 'Travel', description: 'Flexible travel statement credit.' },\n    { id: 'b2', cardId: '2', cardName: 'American Express Gold', title: '$10 Uber Cash', value: 10, expiresAt: new Date(now + 3*864e5).toISOString(), frequency: 'monthly', isUsed: false, category: 'Lifestyle', description: 'Monthly Uber Cash benefit.' }\n  ];\n  localStorage.setItem(STORAGE_KEYS.BENEFITS, JSON.stringify(mockBenefits));\n}\n`,\n+    'utf8'\n+  );\n+\n+  // Normalize occasional bad import\n+  for (const f of pageFiles) {\n+    const fp = path.join(src, 'pages', f);\n+    try {\n+      const code = await fs.readFile(fp, 'utf8');\n+      const next = code.replace(/from\\s+['\\\"]react-router['\\\"]/g, \"from 'react-router-dom'\");\n+      if (next !== code) await fs.writeFile(fp, next, 'utf8');\n+    } catch {\n+      /* ignore */\n+    }\n+  }\n }\n*** End Patch}Oops, that is not valid JSON.**
}

function parseArgs(argv) {
  const out = { project: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--project' && argv[i + 1]) {
      out.project = argv[i + 1];
      i++;
    }
  }
  return out;
}

async function promptProject(available) {
  const rl = readline.createInterface({ input, output });
  try {
    console.log('\nAvailable projects (from Figma/*/pages):');
    if (available.length === 0) {
      console.log('  (none — create UX-Workspace/Figma/<name>/pages with .tsx files)');
    } else {
      for (const n of available) console.log(`  • ${n}`);
    }
    const answer = (await rl.question('\nEnter project folder name to unify: ')).trim();
    return answer || null;
  } finally {
    rl.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = await loadConfig();
  const apiKey = await getApiKey(config);
  if (!apiKey) {
    console.error('Missing OPENAI_API_KEY. Add it to .env.local or export it.');
    process.exit(1);
  }

  let available = await listProjects(config);
  let project = args.project;

  if (!project) {
    project = await promptProject(available);
  }

  if (!project) {
    console.error('No project selected.');
    process.exit(1);
  }

  const { figmaPages, figmaProject, stitchDesktopDir, stitchMobileDir, outputDir } = projectPaths(config, project);

  if (!(await pathExists(figmaPages))) {
    console.error(`Missing Figma pages folder: ${figmaPages}`);
    console.error('Expected: <workspace>/Figma/<project>/pages/*.tsx');
    process.exit(1);
  }

  const mapping = await loadProjectMapping(figmaProject, config.defaultMapping || {});
  if (!(await pathExists(path.join(figmaProject, 'mapping.json')))) {
    console.warn('Note: no Figma/<project>/mapping.json — using defaults from ux-synthesizer/mapping.json');
  }

  const model = config.openaiModel || 'gpt-4o';
  const temperature = typeof config.temperature === 'number' ? config.temperature : 0.3;
  const analysisTemperature =
    typeof config.analysisTemperature === 'number' ? config.analysisTemperature : 0.4;
  const maxCompare = config.maxCompareChars ?? 120000;
  const maxAnalysisInSynth = config.maxAnalysisInSynthesisChars ?? 8000;

  const figmaFiles = (await fs.readdir(figmaPages)).filter((f) => f.endsWith('.tsx')).sort();
  if (figmaFiles.length === 0) {
    console.error(`No .tsx files in ${figmaPages}`);
    process.exit(1);
  }

  const figmaFileObjs = [];
  for (const f of figmaFiles) {
    const content = await fs.readFile(path.join(figmaPages, f), 'utf8');
    figmaFileObjs.push({ rel: f, content });
  }

  const stitchDesktopFiles = await collectFilesRecursive(stitchDesktopDir, ['.html', '.htm']);
  const stitchMobileFiles = await collectFilesRecursive(stitchMobileDir, ['.html', '.htm']);

  const figmaBundle = bundleLabeled(figmaFileObjs, 'FIGMA');
  const stitchDesktopBundle = bundleLabeled(stitchDesktopFiles, 'STITCH_DESKTOP');
  const stitchMobileBundle = bundleLabeled(stitchMobileFiles, 'STITCH_MOBILE');

  console.log(`\n=== Project: ${project} ===`);
  console.log(
    `Figma pages: ${figmaFiles.length} | Stitch Desktop files: ${stitchDesktopFiles.length} | Stitch Mobile files: ${stitchMobileFiles.length}`
  );
  console.log('\nRunning full comparison + analysis (LLM)...');

  const analysisMd = await runFullComparison({
    apiKey,
    model,
    temperature: analysisTemperature,
    project,
    figmaBundle,
    stitchDesktopBundle,
    stitchMobileBundle,
    maxChars: maxCompare,
  });

  await fs.mkdir(outputDir, { recursive: true });
  const analysisPath = path.join(outputDir, 'UX-ANALYSIS.md');
  await fs.writeFile(analysisPath, analysisMd, 'utf8');
  console.log(`\nWrote: ${analysisPath}`);

  const analysisExcerpt =
    analysisMd.length > maxAnalysisInSynth
      ? analysisMd.slice(0, maxAnalysisInSynth) +
        `\n\n[... analysis truncated for synthesis; full document: UX-ANALYSIS.md ...]\n`
      : analysisMd;

  const report = {
    generatedAt: new Date().toISOString(),
    project,
    figmaPages,
    stitchDesktopDir,
    stitchMobileDir,
    outputDir,
    analysisPath,
    pages: [],
  };

  await fs.mkdir(path.join(outputDir, 'src', 'pages'), { recursive: true });

  const universalPages = figmaFiles.filter((f) => mapping[f] != null);
  const outlierPages = figmaFiles.filter((f) => mapping[f] == null);

  const synthesized = new Map();

  for (const f of universalPages) {
    const figmaCode = await fs.readFile(path.join(figmaPages, f), 'utf8');
    const stitchDesktopPath = resolveMappedHtml(stitchDesktopDir, mapping[f]);
    const stitchMobilePath = resolveMappedHtml(stitchMobileDir, mapping[f]);
    const stitchDesktopCode = await readCodeSafe(stitchDesktopPath);
    const stitchMobileCode = await readCodeSafe(stitchMobilePath);

    const res = await synthesizeUX({
      apiKey,
      model,
      temperature,
      figmaCode,
      stitchDesktopCode,
      stitchMobileCode,
      pageName: f,
      analysisExcerpt,
      projectLabel: project,
    });

    await fs.writeFile(path.join(outputDir, 'src', 'pages', f), res, 'utf8');
    synthesized.set(f, res);
    report.pages.push({
      file: f,
      phase: 'paired',
      stitchDesktopPath: stitchDesktopPath || null,
      stitchDesktopFound: Boolean(stitchDesktopCode),
      stitchMobilePath: stitchMobilePath || null,
      stitchMobileFound: Boolean(stitchMobileCode),
    });
  }

  const refName =
    config.styleReferencePage && synthesized.has(config.styleReferencePage)
      ? config.styleReferencePage
      : universalPages[0];
  let styleReference = refName ? synthesized.get(refName) : null;
  if (!styleReference && synthesized.size) {
    styleReference = [...synthesized.values()][0];
  }
  const MAX_REF = 12000;
  if (styleReference && styleReference.length > MAX_REF) {
    styleReference =
      styleReference.slice(0, MAX_REF) +
      `\n/* ...truncated reference (${styleReference.length} chars) */\n`;
  }

  for (const f of outlierPages) {
    const figmaCode = await fs.readFile(path.join(figmaPages, f), 'utf8');
    const res = await synthesizeUX({
      apiKey,
      model,
      temperature,
      figmaCode,
      stitchDesktopCode: '',
      stitchMobileCode: '',
      pageName: f,
      styleReference,
      analysisExcerpt,
      projectLabel: project,
    });
    await fs.writeFile(path.join(outputDir, 'src', 'pages', f), res, 'utf8');
    synthesized.set(f, res);
    report.pages.push({
      file: f,
      phase: 'figma-only-unified',
      stitchDesktopPath: null,
      stitchDesktopFound: false,
      stitchMobilePath: null,
      stitchMobileFound: false,
    });
  }

  await writeScaffold({ outputDir, pageFiles: figmaFiles, projectTitle: project });
  await writeReport(outputDir, report);

  console.log(`\nDone. Unified app: ${outputDir}`);
  console.log(`Analysis: ${analysisPath}`);
  console.log(`Report: ${path.join(outputDir, 'synthesis-report.json')}`);
  console.log(`Next: cd "${outputDir}" && npm install && npm run dev`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
