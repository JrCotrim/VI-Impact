import type { GtaEvent } from '../types/dashboard'
import { getGtaEventSourceLabel } from './gtaEventPresentation'

const eventAnalysisDescriptions: Record<string, string> = {
  'gta-vi-preorders-announced':
    'Em 18 de junho de 2026, a Rockstar Games confirmou que as pré-vendas de GTA VI começariam em 25 de junho. O anúncio antecipou a abertura efetiva das vendas e foi registrado separadamente pelo VI Impact para distinguir a reação do mercado à confirmação da data da reação ao início das compras.',
  'gta-vi-prices-and-editions-revealed':
    'Em 24 de junho de 2026, a Rockstar Games detalhou a estrutura comercial de GTA VI: a edição padrão foi anunciada por US$ 79,99 e a Ultimate Edition por US$ 99,99. A divulgação colocou preço e posicionamento das edições no centro da discussão e foi acompanhada por uma reação positiva da TTWO no pré-mercado.',
  'gta-vi-preorder-bonuses-preload-physical-format':
    'No mesmo ciclo de anúncios de 24 de junho, a Rockstar Games detalhou bônus de reserva, pré-carregamento e distribuição física. Foram apresentados o pacote Vintage Vice City, um mês de GTA+ para reservas digitais, pré-carregamento previsto para 12 de novembro e caixas físicas contendo código para download.',
  'gta-vi-preorders-open':
    'Em 25 de junho de 2026, as pré-vendas de GTA VI foram efetivamente abertas após terem sido anunciadas uma semana antes. O VI Impact trata a abertura das vendas como um evento separado para que a reação da TTWO ao início das compras não seja confundida com a reação ao anúncio de 18 de junho.',
  'gta-vi-extended-look-announced':
    'Em 6 de agosto de 2026, a Rockstar Games anunciou Grand Theft Auto VI: An Extended Look. A apresentação foi programada para estrear primeiro na Netflix em 27 de agosto, às 15h no horário do leste dos Estados Unidos, com publicação seis horas depois no canal oficial da Rockstar no YouTube e no site de GTA VI.',
  'gta-vi-gameplay-map-leak-august-2026':
    'Em 18 de agosto de 2026, vídeos e imagens atribuídos a GTA VI começaram a circular mostrando gameplay, partes de Leonida e novas interações. O material incluía Jason jogando basquete, dirigindo e entrando em combate. A Rockstar Games não confirmou a autenticidade; relatos de remoções por DMCA aumentaram a credibilidade do vazamento, mas o conteúdo pode representar uma build anterior ao estado final do jogo.',
  'gta-vi-third-gameplay-leak-august-2026':
    'Em 19 de agosto de 2026, outro vídeo atribuído a GTA VI mostrou Jason dirigindo à noite e entrando em confronto com seguranças em uma refinaria da Allied Crystal, em Ambrosia. O material também exibiu um taser, ações contextuais e uma cutscene com Cal Hampton. A Rockstar não confirmou oficialmente a autenticidade e a gravação pode ser de uma build de desenvolvimento.',
  'gta-vi-fourth-gameplay-leak-august-2026':
    'Também em 19 de agosto de 2026, um novo vídeo atribuído a GTA VI mostrou uma roda de armas com oito espaços, uma roda separada para itens, combate com faca, provocações e cumprimentos a NPCs, saque de corpos e itens de cura. A Rockstar Games não confirmou oficialmente o material, que pode pertencer a uma build anterior à versão final.',
  'gta-vi-plane-radio-gameplay-leak-august-2026':
    'Em 20 de agosto de 2026, um vídeo atribuído a GTA VI passou a circular mostrando Jason pilotando um biplano sobre Leonida em direção a Vice City. A gravação também apresentou uma nova interface de seleção de rádios e uma opção de música sob demanda. A Rockstar não confirmou oficialmente a autenticidade, e os indícios visuais sugerem que o material pode vir de uma build de desenvolvimento.',
  'gta-vi-hypercar-gameplay-leak-august-2026':
    'Em 21 de agosto de 2026, após cerca de um dia sem novas publicações, surgiu um novo vídeo atribuído a GTA VI e divulgado como “Hypercar”. A gravação, com pouco mais de dois minutos, mostra Jason quebrando o vidro de um Truffade Thrax, retirando um motorista que resiste e assumindo o controle do veículo antes de dirigir em alta velocidade durante a noite. A Rockstar Games não confirmou oficialmente a autenticidade do material, que pode representar uma build de desenvolvimento anterior ao estado final do jogo.',
}

export function getGtaEventAnalysisDescription(
  gtaEvent: GtaEvent,
): string {
  const curatedDescription =
    gtaEvent.slug
      ? eventAnalysisDescriptions[
          gtaEvent.slug
        ]
      : undefined

  if (curatedDescription) {
    return curatedDescription
  }

  const baseDescription =
    gtaEvent.description.trim()

  const sourceLabel =
    getGtaEventSourceLabel(gtaEvent)

  if (gtaEvent.isOfficial === true) {
    return `${baseDescription} O registro é baseado em uma fonte oficial de ${sourceLabel}, o que permite tratar a ocorrência e seus dados principais como confirmados no catálogo do VI Impact.`
  }

  if (gtaEvent.isOfficial === false) {
    return `${baseDescription} O registro não é oficial e tem ${sourceLabel} como referência; por isso, o conteúdo deve ser interpretado como informação atribuída ou reportada, e não como confirmação da Rockstar Games.`
  }

  return `${baseDescription} O VI Impact mantém este evento separado no catálogo para preservar seu contexto e permitir a comparação da reação de mercado ao redor da data registrada.`
}
