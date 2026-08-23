import type { GtaEvent } from '../types/dashboard'

const SITE_URL = 'https://vi-impact.vercel.app'
const DASHBOARD_TITLE = 'VI Impact — GTA VI × Take-Two (TTWO)'
const DASHBOARD_DESCRIPTION =
  'Acompanhe eventos públicos de GTA VI e movimentos observados da Take-Two (TTWO), com comparação ao Nasdaq-100 (QQQ), linha do tempo e análise de impacto.'

interface PageMetadata {
  title: string
  description: string
  canonicalUrl: string
  structuredData: Record<string, unknown>
}

function normalizeWhitespace(value: string | undefined): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncateAtWord(
  value: string,
  maximumLength: number,
): string {
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

function createEventDescription(gtaEvent: GtaEvent): string {
  const preferredText =
    normalizeWhitespace(gtaEvent.summary) ||
    normalizeWhitespace(gtaEvent.description)

  return preferredText
    ? truncateAtWord(preferredText, 160)
    : DASHBOARD_DESCRIPTION
}

function createDashboardMetadata(): PageMetadata {
  return {
    title: DASHBOARD_TITLE,
    description: DASHBOARD_DESCRIPTION,
    canonicalUrl: `${SITE_URL}/`,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'VI Impact',
      url: `${SITE_URL}/`,
      inLanguage: 'pt-BR',
      description: DASHBOARD_DESCRIPTION,
    },
  }
}

function createEventMetadata(gtaEvent: GtaEvent): PageMetadata {
  const routeKey = gtaEvent.slug?.trim() || gtaEvent.id
  const title = `${normalizeWhitespace(gtaEvent.title)} — VI Impact`
  const description = createEventDescription(gtaEvent)
  const canonicalUrl = `${SITE_URL}/events/${encodeURIComponent(routeKey)}`

  return {
    title,
    description,
    canonicalUrl,
    structuredData: {
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
    },
  }
}

function setMetaContent(
  attributeName: 'name' | 'property',
  attributeValue: string,
  content: string,
): void {
  let meta = document.head.querySelector<HTMLMetaElement>(
    `meta[${attributeName}="${attributeValue}"]`,
  )

  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute(attributeName, attributeValue)
    document.head.appendChild(meta)
  }

  meta.content = content
}

function setCanonicalUrl(canonicalUrl: string): void {
  let canonical =
    document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')

  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.appendChild(canonical)
  }

  canonical.href = canonicalUrl
}

function setStructuredData(structuredData: Record<string, unknown>): void {
  let script = document.head.querySelector<HTMLScriptElement>(
    'script[type="application/ld+json"]',
  )

  if (!script) {
    script = document.createElement('script')
    script.type = 'application/ld+json'
    document.head.appendChild(script)
  }

  script.textContent = JSON.stringify(structuredData, null, 2)
}

function applyMetadata(metadata: PageMetadata): void {
  document.title = metadata.title

  setMetaContent('name', 'description', metadata.description)
  setCanonicalUrl(metadata.canonicalUrl)
  setMetaContent('property', 'og:title', metadata.title)
  setMetaContent('property', 'og:description', metadata.description)
  setMetaContent('property', 'og:url', metadata.canonicalUrl)
  setMetaContent('name', 'twitter:title', metadata.title)
  setMetaContent(
    'name',
    'twitter:description',
    metadata.description,
  )
  setStructuredData(metadata.structuredData)
}

export function syncDashboardMetadata(): void {
  applyMetadata(createDashboardMetadata())
}

export function syncEventMetadata(gtaEvent: GtaEvent): void {
  applyMetadata(createEventMetadata(gtaEvent))
}
