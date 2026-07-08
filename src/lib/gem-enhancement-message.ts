import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js'
import type {
  GemEnhancementActionResponse,
  GemEnhancementAttemptResult,
  GemEnhancementRates,
  GemEnhancementResult,
  GemEnhancementState,
  GemEnhancementView,
} from './gem-enhancement-api.js'

export const GEM_ENHANCE_BUTTON_ID = 'gem_enhancement:attempt'
export const GEM_GAHO_DRAW_BUTTON_ID = 'gem_enhancement:draw-gaho'
export const GEM_GAHO_SKIP_BUTTON_ID = 'gem_enhancement:skip-gaho'
export const GEM_ENHANCEMENT_BUTTON_PREFIX = 'gem_enhancement:'

// Mirrors GAHO_THRESHOLD in the INXX backend (선조의 가호 준비까지 필요한 스택 수).
const GAHO_THRESHOLD = 6

const COLOR_DEFAULT = 0xf7c948
const COLOR_SUCCESS = 0x4ade80
const COLOR_DESTROYED = 0xef4444
const COLOR_DOWN = 0xf59e0b

const resultHeadlines: Record<GemEnhancementResult, string> = {
  success: '💎 강화 성공',
  pity_forced: '💎 장기백 확정 성공!',
  failure: '🛡️ 강화 실패',
  down: '📉 강화 하락',
  destroyed: '💥 보석 파괴',
  destroy_prevented: '🛡️ 파괴 무효',
  down_prevented: '🛡️ 하락 무효',
}

const resultColors: Record<GemEnhancementResult, number> = {
  success: COLOR_SUCCESS,
  pity_forced: COLOR_SUCCESS,
  failure: COLOR_DEFAULT,
  down: COLOR_DOWN,
  destroyed: COLOR_DESTROYED,
  destroy_prevented: COLOR_SUCCESS,
  down_prevented: COLOR_SUCCESS,
}

type PremiumGahoEffect = {
  key: string
  description: string
}

const premiumGahoEffects: Record<string, { headline: string; description: string }> = {
  duel: {
    headline: '⚔️ 일기토',
    description: '쿨타임과 관계없이 보석 강화를 시도할 수 있습니다.',
  },
  guaranteed_success: {
    headline: '💎 확정 대성공',
    description: '보석 레벨이 즉시 1단계 상승합니다.',
  },
  pity_plus_50: {
    headline: '📈 장기백 +50%',
    description: '장기백 게이지가 50% 즉시 상승합니다.',
  },
  level_plus_3: {
    headline: '🚀 레벨 +3',
    description: '보석 강화 레벨이 3단계 즉시 상승합니다.',
  },
  double_shield: {
    headline: '🛡️ 이중 방패',
    description: '파괴 방지권과 하락 방지권을 각각 2개씩 추가로 획득합니다.',
  },
  extra_try_x3: {
    headline: '🎯 추가 시도 x3',
    description: '보석 강화를 3회 추가로 시도할 수 있습니다.',
  },
  lucky: {
    headline: '🍀 행운의 가호',
    description: '다음 3회 동안 강화 성공 확률이 2배로 상승합니다.',
  },
  guard: {
    headline: '✨ 불굴의 가호',
    description: '다음 3회 동안 강화 실패 시 레벨 하락과 파괴를 무효로 방지합니다.',
  },
  extend_enhanced: {
    headline: '🟣 강화 모드 연장',
    description: '강화 모드 지속 시간이 연장됩니다.',
  },
  reset_cooldown: {
    headline: '⏰ 쿨타임 초기화',
    description: '보석 강화 쿨타임이 즉시 초기화됩니다.',
  },
  cooldown_plus_5m: {
    headline: '⏳ 쿨타임 연장',
    description: '보석 강화 쿨타임이 5분 증가합니다.',
  },
}

function formatPremiumGahoEffect(effect: PremiumGahoEffect): { headline: string; description: string } {
  const mapped = premiumGahoEffects[effect.key]
  if (mapped) return mapped
  return { headline: '🎲 선조의 가호', description: effect.description }
}

type ParsedAction =
  | { kind: 'attempt'; result: GemEnhancementAttemptResult }
  | { kind: 'gaho'; effect: { key: string; description: string } }
  | { kind: 'skip' }

function parseAction(action: GemEnhancementActionResponse | null): ParsedAction | null {
  if (!action) return null
  if ('skipped' in action) return { kind: 'skip' }
  if ('effect' in action.result) return { kind: 'gaho', effect: action.result.effect }
  return { kind: 'attempt', result: action.result }
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function formatPity(pity: number): string {
  return `장기백 ${Math.round(pity)}%`
}

function formatRates(rates: GemEnhancementRates): string {
  return (
    `성공 ${formatPercent(rates.successProbability)} · ` +
    `파괴 ${formatPercent(rates.destructionProbability)} · ` +
    `하락 ${formatPercent(rates.downProbability)} · ` +
    `실패 ${formatPercent(rates.failureProbability)}`
  )
}

function ratesAllZero(rates: GemEnhancementRates): boolean {
  return (
    rates.successProbability === 0 &&
    rates.failureProbability === 0 &&
    rates.downProbability === 0 &&
    rates.destructionProbability === 0
  )
}

function formatGaho(state: GemEnhancementState): string {
  const parts: string[] = []

  // Enhanced mode badge
  if (state.enhancedMode) {
    parts.push('🟣 강화 모드')
  }

  // Gaho stack
  const stack = state.gaho.ready
    ? `🧿 사용 가능! ${GAHO_THRESHOLD}/${GAHO_THRESHOLD}`
    : `🧿 ${state.gaho.count}/${GAHO_THRESHOLD}`
  parts.push(stack)

  // Shields
  parts.push(`파괴 방지권 x${state.gaho.shield}`)
  parts.push(`하락 방지권 x${state.gaho.downShield}`)

  // Extra tries
  if (state.gahoExtraTry > 0) {
    parts.push(`추가 시도 x${state.gahoExtraTry}`)
  }

  // Buff counters
  if (state.duelRemaining > 0) {
    parts.push(`⚔️ 일기토 ${state.duelRemaining}회 남음`)
  }
  if (state.luckyRemaining > 0) {
    parts.push(`🍀 행운의 가호 ${state.luckyRemaining}회`)
  }
  if (state.guardRemaining > 0) {
    parts.push(`✨ 불굴의 가호 ${state.guardRemaining}회`)
  }

  return parts.join(' · ')
}

function toUnixSeconds(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000)
}

function formatAttemptCooldown(view: GemEnhancementView, result: GemEnhancementAttemptResult): string | null {
  if (result.cooldownSeconds <= 0) return null

  const lastAttemptAt = view.currentUserState?.lastAttemptAt
  const cooldownPenaltyUntil = view.currentUserState?.cooldownPenaltyUntil
  const penaltyEndsAt = cooldownPenaltyUntil ? new Date(cooldownPenaltyUntil).getTime() : NaN

  if (lastAttemptAt) {
    const attemptEndsAt = new Date(lastAttemptAt).getTime() + result.cooldownSeconds * 1000
    const endsAt = Number.isFinite(penaltyEndsAt) ? Math.max(attemptEndsAt, penaltyEndsAt) : attemptEndsAt
    return `⏳ <t:${Math.floor(endsAt / 1000)}:T> 강화 가능`
  }

  return `⏳ ${result.cooldownSeconds}초 후 강화 가능`
}

function formatCooldown(view: GemEnhancementView, parsed: ParsedAction | null): string {
  if (parsed?.kind === 'attempt') {
    const attemptCooldown = formatAttemptCooldown(view, parsed.result)
    if (attemptCooldown) {
      return attemptCooldown
    }
  }

  const cooldownPenaltyUntil = view.currentUserState?.cooldownPenaltyUntil
  if (cooldownPenaltyUntil) {
    const cooldownEndsAt = new Date(cooldownPenaltyUntil).getTime()
    if (Number.isFinite(cooldownEndsAt)) {
      if (cooldownEndsAt > Date.now()) {
        const endUnix = toUnixSeconds(cooldownPenaltyUntil)
        return `⏳ <t:${endUnix}:T> 강화 가능`
      }
    } else if (view.cooldownRemainingSeconds > 0) {
      return `⏳ ${view.cooldownRemainingSeconds}초 후 강화 가능`
    }
  }

  if (view.cooldownRemainingSeconds > 0 && !cooldownPenaltyUntil) {
    return `⏳ ${view.cooldownRemainingSeconds}초 후 강화 가능`
  }

  const lastAttemptAt = view.currentUserState?.lastAttemptAt
  if (lastAttemptAt) {
    const unix = toUnixSeconds(lastAttemptAt)
    return `✅ 지금 강화 가능\n마지막 시도 <t:${unix}:R> (<t:${unix}:T>)`
  }

  return '✅ 지금 강화 가능'
}

function formatAttemptDetail(result: GemEnhancementAttemptResult): string {
  const transition = `${result.levelBefore}강 → ${result.levelAfter}강`

  switch (result.result) {
    case 'success':
      return `🎉 ${transition} 강화에 성공했어요!`
    case 'pity_forced':
      return '💎 장기백 100% 확정 성공!'
    case 'destroyed':
      return `💥 보석이 파괴되어 ${result.levelAfter}강으로 돌아갔어요.`
    case 'destroy_prevented':
      return '🛡️ 파괴 방지권으로 파괴를 막았어요.'
    case 'down':
      return `📉 ${transition} 하락했어요.`
    case 'down_prevented':
      return '🛡️ 하락 방지권으로 하락을 막았어요.'
    case 'failure':
    default:
      return `${formatPercent(result.rates.failureProbability)} 확률로 강화에 실패했어요.`
  }
}

function buildStatusEmbed(
  view: GemEnhancementView,
  parsed: ParsedAction | null,
  footerName: string | null | undefined,
  botName: string | null | undefined,
): EmbedBuilder {
  const state = view.currentUserState
  const embed = new EmbedBuilder()

  if (!state) {
    return embed
      .setColor(COLOR_DEFAULT)
      .setTitle('💎 보석 강화')
      .setDescription('보석 강화 상태를 불러오지 못했습니다.')
  }

  const titleBase = `${state.levelLabel} · ${formatPity(state.pity)}`
  const title = state.enhancedMode
    ? `🟣 강화된 선조의 가호 / 강화 모드 활성화! — ${titleBase}`
    : titleBase
  embed.setColor(COLOR_DEFAULT).setTitle(title).setThumbnail(state.levelIconUrl)

  // 결과 헤드라인 + '이번 시도' 상세, 그리고 표시할 확률 결정
  let ratesToShow: GemEnhancementRates | null = state.currentRates
  let ratesLabel = '🔮 강화 확률'

  if (parsed?.kind === 'attempt') {
    embed.setColor(resultColors[parsed.result.result]).setDescription(resultHeadlines[parsed.result.result])
    embed.addFields({ name: '이번 시도', value: formatAttemptDetail(parsed.result), inline: false })
    if (parsed.result.result === 'pity_forced') {
      ratesToShow = null
    } else {
      ratesToShow = parsed.result.rates
      ratesLabel = '🔮 이번 시도 확률'
    }
  } else if (parsed?.kind === 'gaho') {
    const gahoInfo = formatPremiumGahoEffect(parsed.effect)
    embed.setDescription(gahoInfo.headline)
    embed.addFields({ name: '이번 시도', value: gahoInfo.description, inline: false })
  } else if (parsed?.kind === 'skip') {
    embed.setDescription('⏭️ 선조의 가호를 넘겼습니다')
    embed.addFields({ name: '이번 시도', value: '다음 강화를 진행할 수 있습니다.', inline: false })
  }

  if (ratesToShow && !ratesAllZero(ratesToShow)) {
    embed.addFields({ name: ratesLabel, value: formatRates(ratesToShow), inline: false })
  }

  embed.addFields(
    { name: '📜 선조의 가호', value: formatGaho(state), inline: false },
    { name: '쿨타임', value: formatCooldown(view, parsed), inline: false },
  )

  if (footerName) {
    embed.setFooter({ text: botName ? `${footerName} • ${botName}` : footerName })
  }

  return embed
}

function buildRankingEmbed(view: GemEnhancementView): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(COLOR_DEFAULT).setTitle('🏆 강화 랭킹 — 현재 최고 레벨')

  if (view.leaderboard.length === 0) {
    return embed.setDescription('아직 랭킹이 없습니다.')
  }

  const medals = ['🥇', '🥈', '🥉']
  const lines = view.leaderboard.slice(0, 20).map((entry) => {
    const rankPrefix = entry.rank <= 3 ? medals[entry.rank - 1] : String(entry.rank).padStart(2, ' ')
    return `${rankPrefix} ${entry.displayName ?? '이름 없음'} — ${entry.levelLabel} · ${formatPity(entry.pity)}`
  })

  return embed.setDescription(lines.join('\n')).setFooter({ text: '상위 20명까지 표시됩니다.' })
}

function buildButtons(
  view: GemEnhancementView,
  ownerId: string,
  options: { hideDisabledButtons?: boolean } = {},
): ActionRowBuilder<ButtonBuilder> | null {
  const { hideDisabledButtons = false } = options
  const state = view.currentUserState
  const cooldown = view.cooldownRemainingSeconds
  const canEnhance = Boolean(
    state && !state.gaho.ready && (cooldown === 0 || state.duelRemaining > 0 || state.gahoExtraTry > 0),
  )
  const canUseGaho = Boolean(state?.gaho.ready)
  const isDuelActive = Boolean(state && state.duelRemaining > 0)

  const buttonStates = [
    {
      enabled: canEnhance,
      builder: new ButtonBuilder()
        .setCustomId(`${GEM_ENHANCE_BUTTON_ID}:${ownerId}`)
        .setLabel(isDuelActive ? '강화 (일기토)' : '강화')
        .setStyle(isDuelActive ? ButtonStyle.Danger : ButtonStyle.Primary),
    },
    {
      enabled: canUseGaho,
      builder: new ButtonBuilder()
        .setCustomId(`${GEM_GAHO_DRAW_BUTTON_ID}:${ownerId}`)
        .setLabel('가호 뽑기')
        .setStyle(ButtonStyle.Success),
    },
    {
      enabled: canUseGaho,
      builder: new ButtonBuilder()
        .setCustomId(`${GEM_GAHO_SKIP_BUTTON_ID}:${ownerId}`)
        .setLabel('가호 넘기기')
        .setStyle(ButtonStyle.Secondary),
    },
  ]

  const visibleButtons = hideDisabledButtons
    ? buttonStates.filter((buttonState) => buttonState.enabled)
    : buttonStates

  if (visibleButtons.length === 0) {
    return null
  }

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...visibleButtons.map(({ enabled, builder }) => builder.setDisabled(!enabled)),
  )
}

export function buildGemEnhancementMessage(
  view: GemEnhancementView,
  action: GemEnhancementActionResponse | null = null,
  ownerId: string,
  options: {
    withButtons?: boolean
    hideDisabledButtons?: boolean
    footerName?: string | null
    botName?: string | null
  } = {},
) {
  const { withButtons = true, hideDisabledButtons = false, footerName = null, botName = null } = options
  const parsed = parseAction(action)

  const embeds = [buildStatusEmbed(view, parsed, footerName, botName)]
  const buttonRow = withButtons ? buildButtons(view, ownerId, { hideDisabledButtons }) : null
  const components = buttonRow ? [buttonRow] : []

  return { embeds, components }
}

const GEM_ACTION_BY_PREFIX: Record<string, 'attempt' | 'draw-gaho' | 'skip-gaho'> = {
  [GEM_ENHANCE_BUTTON_ID]: 'attempt',
  [GEM_GAHO_DRAW_BUTTON_ID]: 'draw-gaho',
  [GEM_GAHO_SKIP_BUTTON_ID]: 'skip-gaho',
}

export function parseGemEnhancementButtonId(
  customId: string,
): { action: 'attempt' | 'draw-gaho' | 'skip-gaho'; ownerId: string } | null {
  const separatorIndex = customId.lastIndexOf(':')
  if (separatorIndex === -1) return null

  const actionId = customId.slice(0, separatorIndex)
  const ownerId = customId.slice(separatorIndex + 1)
  const action = GEM_ACTION_BY_PREFIX[actionId]
  if (!action || !ownerId) return null

  return { action, ownerId }
}

export function buildGemEnhancementRankingMessage(view: GemEnhancementView) {
  return {
    embeds: [buildRankingEmbed(view)],
    components: [],
  }
}

export { premiumGahoEffects, formatPremiumGahoEffect }
