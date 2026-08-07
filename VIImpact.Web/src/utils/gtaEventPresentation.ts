import type { GtaEvent } from '../types/dashboard'

export type GtaEventIconKey =
  | 'development'
  | 'announcement'
  | 'trailer'
  | 'leak'
  | 'delay'
  | 'financial'
  | 'release-window'
  | 'corporate'
  | 'security'
  | 'labor-legal'
  | 'pre-order'
  | 'pricing'
  | 'distribution'
  | 'market-analysis'
  | 'launch'
  | 'game-information'

export type RichGtaEvent = GtaEvent & {
  category?: string | number
  subcategory?: string
  priority?: string | number
  sourceType?: string | number
  sourceName?: string
  status?: string | number
  isOfficial?: boolean
  datePrecision?: string | number
}

export interface GtaEventPresentation {
  label: string
  className: string
  color: string
  iconKey: GtaEventIconKey
  symbol: string
}

const categoryNameByValue: Record<number, string> = {
  1: 'Development',
  2: 'Announcement',
  3: 'Trailer',
  4: 'Leak',
  5: 'Delay',
  6: 'FinancialResults',
  7: 'ReleaseWindow',
  8: 'Rumor',
  9: 'Corporate',
  10: 'Security',
  11: 'LaborAndLegal',
  12: 'PreOrder',
  13: 'Pricing',
  14: 'Distribution',
  15: 'MarketAnalysis',
  16: 'Launch',
  17: 'GameInformation',
}

const presentationByCategory: Record<
  string,
  GtaEventPresentation
> = {
  Development: {
    label: 'Desenvolvimento',
    className: 'category-development',
    color: '#22b8cf',
    iconKey: 'development',
    symbol: 'DEV',
  },
  Announcement: {
    label: 'Anúncio',
    className: 'category-announcement',
    color: '#f23896',
    iconKey: 'announcement',
    symbol: 'VI',
  },
  Trailer: {
    label: 'Trailer',
    className: 'category-trailer',
    color: '#8f42dd',
    iconKey: 'trailer',
    symbol: 'TR',
  },
  Leak: {
    label: 'Vazamento',
    className: 'category-leak',
    color: '#7c8599',
    iconKey: 'leak',
    symbol: '!',
  },
  Rumor: {
    label: 'Rumor',
    className: 'category-leak',
    color: '#7c8599',
    iconKey: 'leak',
    symbol: '?',
  },
  Delay: {
    label: 'Adiamento',
    className: 'category-delay',
    color: '#dc315d',
    iconKey: 'delay',
    symbol: '!',
  },
  FinancialResults: {
    label: 'Resultados financeiros',
    className: 'category-financial',
    color: '#278df1',
    iconKey: 'financial',
    symbol: 'T2',
  },
  ReleaseWindow: {
    label: 'Janela de lançamento',
    className: 'category-release-window',
    color: '#f97316',
    iconKey: 'release-window',
    symbol: 'CAL',
  },
  Corporate: {
    label: 'Corporativo',
    className: 'category-corporate',
    color: '#0ea5a8',
    iconKey: 'corporate',
    symbol: 'CO',
  },
  Security: {
    label: 'Segurança',
    className: 'category-security',
    color: '#e05252',
    iconKey: 'security',
    symbol: 'SEC',
  },
  LaborAndLegal: {
    label: 'Trabalhista e jurídico',
    className: 'category-labor-legal',
    color: '#c98a16',
    iconKey: 'labor-legal',
    symbol: 'LAW',
  },
  PreOrder: {
    label: 'Pré-venda',
    className: 'category-pre-order',
    color: '#f97316',
    iconKey: 'pre-order',
    symbol: 'PRE',
  },
  Pricing: {
    label: 'Preço',
    className: 'category-pricing',
    color: '#0aa564',
    iconKey: 'pricing',
    symbol: '$',
  },
  Distribution: {
    label: 'Distribuição',
    className: 'category-distribution',
    color: '#3b82f6',
    iconKey: 'distribution',
    symbol: 'BOX',
  },
  MarketAnalysis: {
    label: 'Análise de mercado',
    className: 'category-market-analysis',
    color: '#12a59c',
    iconKey: 'market-analysis',
    symbol: 'MKT',
  },
  Launch: {
    label: 'Lançamento',
    className: 'category-launch',
    color: '#0aa564',
    iconKey: 'launch',
    symbol: 'GTA',
  },
  GameInformation: {
    label: 'Informações do jogo',
    className: 'category-game-information',
    color: '#d946ef',
    iconKey: 'game-information',
    symbol: 'VI',
  },
}

const fallbackPresentation: GtaEventPresentation = {
  label: 'Evento',
  className: 'category-announcement',
  color: '#f23896',
  iconKey: 'announcement',
  symbol: 'VI',
}

function normalizeCategoryName(
  category: RichGtaEvent['category'],
): string | null {
  if (typeof category === 'number') {
    return categoryNameByValue[category] ?? null
  }

  if (typeof category !== 'string') {
    return null
  }

  const compactCategory = category
    .replace(/[\s_-]/g, '')
    .toLowerCase()

  const matchingCategory = Object.keys(
    presentationByCategory,
  ).find(
    (categoryName) =>
      categoryName.toLowerCase() ===
      compactCategory,
  )

  return matchingCategory ?? null
}

function inferCategoryName(
  gtaEvent: GtaEvent,
): string {
  const normalizedText =
    `${gtaEvent.title} ${gtaEvent.description}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()

  if (
    normalizedText.includes('adiamento') ||
    normalizedText.includes('adiado') ||
    normalizedText.includes('atraso')
  ) {
    return normalizedText.includes('rumor')
      ? 'Rumor'
      : 'Delay'
  }

  if (normalizedText.includes('trailer')) {
    return 'Trailer'
  }

  if (
    normalizedText.includes('vazamento') ||
    normalizedText.includes('hacker') ||
    normalizedText.includes('invasao')
  ) {
    return 'Leak'
  }

  if (
    normalizedText.includes('resultado') ||
    normalizedText.includes('reservas liquidas') ||
    normalizedText.includes('financeiro')
  ) {
    return 'FinancialResults'
  }

  if (
    normalizedText.includes('pre-venda') ||
    normalizedText.includes('pre venda')
  ) {
    return 'PreOrder'
  }

  if (
    normalizedText.includes('preco') ||
    normalizedText.includes('edicoes')
  ) {
    return 'Pricing'
  }

  if (
    normalizedText.includes('pre-carregamento') ||
    normalizedText.includes('caixas') ||
    normalizedText.includes('formato fisico') ||
    normalizedText.includes('distribuicao')
  ) {
    return 'Distribution'
  }

  if (
    normalizedText.includes('lancamento mundial') ||
    normalizedText.includes('lancamento confirmado')
  ) {
    return 'Launch'
  }

  if (
    normalizedText.includes('outono') ||
    normalizedText.includes('janela de lancamento') ||
    normalizedText.includes('mantem a data') ||
    normalizedText.includes('reafirma')
  ) {
    return 'ReleaseWindow'
  }

  if (
    normalizedText.includes('trabalh') ||
    normalizedText.includes('sindical') ||
    normalizedText.includes('tribunal') ||
    normalizedText.includes('julgamento') ||
    normalizedText.includes('demissoes')
  ) {
    return 'LaborAndLegal'
  }

  if (
    normalizedText.includes('seguranca') ||
    normalizedText.includes('sentenca')
  ) {
    return 'Security'
  }

  if (
    normalizedText.includes('analistas') ||
    normalizedText.includes('mercado de consoles')
  ) {
    return 'MarketAnalysis'
  }

  if (
    normalizedText.includes('cfx.re') ||
    normalizedText.includes('aquisicao') ||
    normalizedText.includes('parte da rockstar')
  ) {
    return 'Corporate'
  }

  if (
    normalizedText.includes('site oficial') ||
    normalizedText.includes('personagens') ||
    normalizedText.includes('regioes') ||
    normalizedText.includes('narrativa')
  ) {
    return 'GameInformation'
  }

  if (
    normalizedText.includes('desenvolvimento') ||
    normalizedText.includes('retorno presencial') ||
    normalizedText.includes('producao')
  ) {
    return 'Development'
  }

  return 'Announcement'
}

export function getGtaEventPresentation(
  gtaEvent: GtaEvent,
): GtaEventPresentation {
  const richEvent = gtaEvent as RichGtaEvent
  const categoryName =
    normalizeCategoryName(richEvent.category) ??
    inferCategoryName(gtaEvent)

  return (
    presentationByCategory[categoryName] ??
    fallbackPresentation
  )
}

export function parseGtaEventDate(
  dateText: string,
): Date {
  const hasTimezone =
    dateText.endsWith('Z') ||
    /[+-]\d{2}:\d{2}$/.test(dateText)

  return new Date(
    hasTimezone
      ? dateText
      : `${dateText}Z`,
  )
}

export function isDateOnlyGtaEvent(
  dateText: string,
): boolean {
  return /^(?:\d{4}-\d{2}-\d{2}|\d{4}-\d{2}-\d{2}T00:00:00(?:\.0+)?(?:Z|[+-]00:00)?)$/i.test(
    dateText,
  )
}

export function formatGtaEventDate(
  dateText: string,
): string {
  const eventDate = parseGtaEventDate(dateText)

  if (isDateOnlyGtaEvent(dateText)) {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(eventDate)
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(eventDate)
}

export function isOccurredGtaEvent(
  gtaEvent: GtaEvent,
  now = new Date(),
): boolean {
  const richEvent = gtaEvent as RichGtaEvent

  if (typeof richEvent.status === 'number') {
    return richEvent.status === 1
  }

  if (typeof richEvent.status === 'string') {
    const normalizedStatus =
      richEvent.status.toLowerCase()

    if (normalizedStatus === 'occurred') {
      return true
    }

    if (
      normalizedStatus === 'scheduled' ||
      normalizedStatus === 'cancelled'
    ) {
      return false
    }
  }

  return (
    parseGtaEventDate(
      gtaEvent.occurredAtUtc,
    ).getTime() <= now.getTime()
  )
}

export function getGtaEventCategoryLabel(
  gtaEvent: GtaEvent,
): string | null {
  const category = (
    gtaEvent as RichGtaEvent
  ).category

  const categoryName =
    normalizeCategoryName(category)

  if (!categoryName) {
    return null
  }

  return (
    presentationByCategory[categoryName]
      ?.label ?? null
  )
}

export function getGtaEventConfirmationLabel(
  gtaEvent: GtaEvent,
): string {
  const isOfficial = (
    gtaEvent as RichGtaEvent
  ).isOfficial

  if (isOfficial === true) {
    return 'Oficial'
  }

  if (isOfficial === false) {
    return 'Não oficial'
  }

  return 'Cadastro pendente'
}

export function getGtaEventPriorityLabel(
  gtaEvent: GtaEvent,
): string | null {
  const priority = (
    gtaEvent as RichGtaEvent
  ).priority

  if (priority === 1 || priority === 'Primary') {
    return 'Alta · P1'
  }

  if (priority === 2 || priority === 'Relevant') {
    return 'Média · P2'
  }

  if (priority === 3 || priority === 'Contextual') {
    return 'Contextual · P3'
  }

  return null
}

export function getGtaEventSourceLabel(
  gtaEvent: GtaEvent,
): string {
  const richEvent = gtaEvent as RichGtaEvent

  if (richEvent.sourceName?.trim()) {
    return richEvent.sourceName.trim()
  }

  if (gtaEvent.sourceUrl.trim()) {
    try {
      return new URL(
        gtaEvent.sourceUrl,
        window.location.origin,
      ).hostname.replace(/^www\./, '')
    } catch {
      return 'Fonte cadastrada'
    }
  }

  return 'Cadastro pendente'
}