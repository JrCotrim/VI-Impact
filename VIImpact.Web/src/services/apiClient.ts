const configuredApiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? ''
)
  .trim()
  .replace(/\/+$/, '')

export function buildApiUrl(
  path: string,
): string {
  const normalizedPath =
    path.startsWith('/') ? path : `/${path}`

  return `${configuredApiBaseUrl}${normalizedPath}`
}

export interface ApiProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  errorCode?: string
  traceId?: string
  message?: string
}

interface ApiRequestErrorOptions {
  status: number
  title: string
  message: string
  errorCode: string
  retryAfterSeconds?: number | null
  traceId?: string | null
}

export class ApiRequestError extends Error {
  readonly status: number
  readonly title: string
  readonly errorCode: string
  readonly retryAfterSeconds: number | null
  readonly traceId: string | null
  readonly canRetry: boolean

  constructor(options: ApiRequestErrorOptions) {
    super(options.message)

    this.name = 'ApiRequestError'
    this.status = options.status
    this.title = options.title
    this.errorCode = options.errorCode
    this.retryAfterSeconds =
      options.retryAfterSeconds ?? null
    this.traceId = options.traceId ?? null
    this.canRetry =
      options.status === 0 ||
      options.status === 408 ||
      options.status === 429 ||
      options.status === 502 ||
      options.status === 503 ||
      options.status === 504
  }
}

function getDefaultTitle(status: number): string {
  if (status === 429) {
    return 'Limite temporário atingido'
  }

  if (status === 502) {
    return 'Resposta inválida do provedor'
  }

  if (status === 503) {
    return 'Dados temporariamente indisponíveis'
  }

  if (status === 504 || status === 408) {
    return 'A consulta demorou mais que o esperado'
  }

  if (status >= 500) {
    return 'Não foi possível concluir a consulta'
  }

  if (status >= 400) {
    return 'Não foi possível processar a solicitação'
  }

  return 'Falha de conexão'
}

function getUserMessage(
  status: number,
  problemDetails: ApiProblemDetails | null,
  fallbackMessage: string,
): string {
  if (status === 429) {
    return (
      'O limite temporário de consultas ao provedor foi atingido. ' +
      'Aguarde alguns instantes e tente novamente.'
    )
  }

  if (status === 502) {
    return (
      'O provedor de dados retornou uma resposta inválida. ' +
      'Tente novamente em instantes.'
    )
  }

  if (status === 503) {
    return (
      'Os dados de mercado estão temporariamente indisponíveis. ' +
      'Tente novamente em instantes.'
    )
  }

  if (status === 504 || status === 408) {
    return (
      'A consulta aos dados de mercado demorou mais que o esperado. ' +
      'Tente novamente.'
    )
  }

  if (status >= 500) {
    return (
      'Ocorreu uma falha temporária ao consultar a API. ' +
      'Tente novamente em instantes.'
    )
  }

  return (
    problemDetails?.detail ??
    problemDetails?.message ??
    problemDetails?.title ??
    fallbackMessage
  )
}

function parseRetryAfterSeconds(
  response: Response,
): number | null {
  const retryAfter =
    response.headers.get('Retry-After')

  if (!retryAfter) {
    return null
  }

  const seconds = Number(retryAfter)

  if (
    Number.isFinite(seconds) &&
    seconds >= 0
  ) {
    return Math.ceil(seconds)
  }

  const retryAt = Date.parse(retryAfter)

  if (Number.isNaN(retryAt)) {
    return null
  }

  return Math.max(
    1,
    Math.ceil(
      (retryAt - Date.now()) / 1000,
    ),
  )
}

async function readProblemDetails(
  response: Response,
): Promise<ApiProblemDetails | null> {
  try {
    return (
      (await response.json()) as ApiProblemDetails
    )
  } catch {
    return null
  }
}

export function toApiRequestError(
  error: unknown,
  fallbackMessage: string,
): ApiRequestError {
  if (error instanceof ApiRequestError) {
    return error
  }

  return new ApiRequestError({
    status: -1,
    title: 'Não foi possível concluir a solicitação',
    message:
      error instanceof Error &&
      error.message.trim().length > 0
        ? error.message
        : fallbackMessage,
    errorCode: 'client_error',
  })
}

export function getRetryHint(
  error: ApiRequestError,
): string | null {
  if (
    error.retryAfterSeconds === null ||
    error.retryAfterSeconds <= 0
  ) {
    return null
  }

  if (error.retryAfterSeconds < 60) {
    return (
      `Nova tentativa recomendada em aproximadamente ` +
      `${error.retryAfterSeconds} segundos.`
    )
  }

  const minutes = Math.ceil(
    error.retryAfterSeconds / 60,
  )

  return (
    `Nova tentativa recomendada em aproximadamente ` +
    `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`
  )
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  fallbackMessage: string,
): Promise<T> {
  let response: Response

  try {
    response = await fetch(input, init)
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === 'AbortError'
    ) {
      throw error
    }

    throw new ApiRequestError({
      status: 0,
      title: 'Não foi possível conectar à API',
      message:
        'Verifique se a API do VI Impact está em execução e tente novamente.',
      errorCode: 'network_error',
    })
  }

  if (!response.ok) {
    const problemDetails =
      await readProblemDetails(response)

    throw new ApiRequestError({
      status: response.status,
      title:
        problemDetails?.title ??
        getDefaultTitle(response.status),
      message: getUserMessage(
        response.status,
        problemDetails,
        fallbackMessage,
      ),
      errorCode:
        problemDetails?.errorCode ??
        `http_${response.status}`,
      retryAfterSeconds:
        parseRetryAfterSeconds(response),
      traceId:
        problemDetails?.traceId ?? null,
    })
  }

  try {
    return (await response.json()) as T
  } catch {
    throw new ApiRequestError({
      status: 502,
      title: 'Resposta inválida da API',
      message:
        'A API retornou uma resposta que não pôde ser interpretada.',
      errorCode: 'invalid_api_response',
    })
  }
}