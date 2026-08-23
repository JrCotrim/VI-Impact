import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE_URL = 'https://vi-impact.vercel.app'
const DEFAULT_OG_IMAGE_URL = `${SITE_URL}/og-image.png`
const SEO_START = '<!-- VI_IMPACT_SEO_START -->'
const SEO_END = '<!-- VI_IMPACT_SEO_END -->'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.resolve(scriptDirectory, '..')
const distDirectory = path.join(webRoot, 'dist')

function resolveCatalogPath() {
  const configuredPath = process.env.VI_IMPACT_EVENT_CATALOG_PATH?.trim()

  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(webRoot, configuredPath)
  }

  return path.resolve(
    webRoot,
    '..',
    'VIImpact.Infrastructure',
    'Data',
    'Seed',
    'gta-events.json',
  )
}

function isOccurredEvent(event) {
  if (event.status === 1) {
    return true
  }

  return (
    typeof event.status === 'string' &&
    event.status.toLowerCase() === 'occurred'
  )
}

function normalizeWhitespace(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncateAtWord(value, maximumLength) {
  if (value.length <= maximumLength) {
    return value
  }

  const shortened = value.slice(0, maximumLength + 1)
  const finalWhitespace = shortened.lastIndexOf(' ')
  const cutoff =
    finalWhitespace >= Math.floor(maximumLength * 0.7)
      ? finalWhitespace
      : maximumLength

  return `${shortened.slice(0, cutoff).trimEnd()}…`
}

function createDescription(event) {
  const preferredText =
    normalizeWhitespace(event.summary) ||
    normalizeWhitespace(event.description)

  if (!preferredText) {
    throw new Error(
      `Event "${event.slug ?? event.id ?? 'unknown'}" has no SEO description.`,
    )
  }

  return truncateAtWord(preferredText, 160)
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeJsonForHtml(value) {
  return JSON.stringify(value, null, 2)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
}

function validateSlug(event) {
  const slug = normalizeWhitespace(event.slug)

  if (!slug) {
    throw new Error(
      `Occurred event "${event.title ?? event.id ?? 'unknown'}" has no slug.`,
    )
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`Event slug "${slug}" is not canonical.`)
  }

  return slug
}

function createEventSeoBlock(event, slug) {
  const title = `${normalizeWhitespace(event.title)} — VI Impact`
  const description = createDescription(event)
  const canonicalUrl = `${SITE_URL}/events/${slug}`

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: canonicalUrl,
    inLanguage: 'pt-BR',
    isPartOf: {
      '@type': 'WebSite',
      name: 'VI Impact',
      url: `${SITE_URL}/`,
    },
    about: {
      '@type': 'VideoGame',
      name: 'Grand Theft Auto VI',
    },
    mentions: {
      '@type': 'Organization',
      name: 'Take-Two Interactive',
    },
  }

  return `${SEO_START}
    <title>${escapeHtml(title)}</title>
    <meta
      name="description"
      content="${escapeHtml(description)}"
    />
    <meta name="robots" content="index, follow" />
    <meta name="application-name" content="VI Impact" />
    <meta name="theme-color" content="#080817" />

    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />

    <meta property="og:locale" content="pt_BR" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="VI Impact" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta
      property="og:description"
      content="${escapeHtml(description)}"
    />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta
      property="og:image"
      content="${DEFAULT_OG_IMAGE_URL}"
    />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta
      property="og:image:alt"
      content="VI Impact — eventos de GTA VI e movimentos observados de TTWO e QQQ"
    />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta
      name="twitter:description"
      content="${escapeHtml(description)}"
    />
    <meta
      name="twitter:image"
      content="${DEFAULT_OG_IMAGE_URL}"
    />
    <meta
      name="twitter:image:alt"
      content="VI Impact — eventos de GTA VI e movimentos observados de TTWO e QQQ"
    />

    <script type="application/ld+json">
${escapeJsonForHtml(structuredData)}
    </script>
    ${SEO_END}`
}

function replaceSeoBlock(html, replacement) {
  const startIndex = html.indexOf(SEO_START)
  const endIndex = html.indexOf(SEO_END)

  if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) {
    throw new Error(
      'Built index.html does not contain the expected SEO markers.',
    )
  }

  const endOffset = endIndex + SEO_END.length

  return (
    html.slice(0, startIndex) +
    replacement +
    html.slice(endOffset)
  )
}

function createSitemap(slugs) {
  const urls = [
    `${SITE_URL}/`,
    ...slugs.map((slug) => `${SITE_URL}/events/${slug}`),
  ]

  const entries = urls
    .map(
      (url) =>
        `  <url>\n    <loc>${escapeHtml(url)}</loc>\n  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`
}

async function main() {
  const catalogPath = resolveCatalogPath()
  const [catalogText, builtIndexHtml] = await Promise.all([
    fs.readFile(catalogPath, 'utf8'),
    fs.readFile(path.join(distDirectory, 'index.html'), 'utf8'),
  ])

  const catalog = JSON.parse(catalogText)

  if (!Array.isArray(catalog)) {
    throw new Error('GTA event catalog must be a JSON array.')
  }

  const occurredEvents = catalog.filter(isOccurredEvent)
  const slugs = []
  const seenSlugs = new Set()
  const eventsDirectory = path.join(distDirectory, 'events')

  await fs.mkdir(eventsDirectory, { recursive: true })

  for (const event of occurredEvents) {
    const slug = validateSlug(event)

    if (seenSlugs.has(slug)) {
      throw new Error(`Duplicate event slug "${slug}".`)
    }

    seenSlugs.add(slug)
    slugs.push(slug)

    const eventHtml = replaceSeoBlock(
      builtIndexHtml,
      createEventSeoBlock(event, slug),
    )

    await fs.writeFile(
      path.join(eventsDirectory, `${slug}.html`),
      eventHtml,
      'utf8',
    )
  }

  await fs.writeFile(
    path.join(distDirectory, 'sitemap.xml'),
    createSitemap(slugs),
    'utf8',
  )

  console.log(
    `Generated ${slugs.length} event SEO pages and sitemap.xml from ${path.relative(
      webRoot,
      catalogPath,
    )}.`,
  )
}

await main()
