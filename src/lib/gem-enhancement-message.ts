import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js'
import type { GemEnhancementActionResponse, GemEnhancementResult, GemEnhancementView } from './gem-enhancement-api.js'

export const GEM_ENHANCE_BUTTON_ID = 'gem_enhancement:attempt'
export const GEM_GAHO_DRAW_BUTTON_ID = 'gem_enhancement:draw-gaho'
export const GEM_GAHO_SKIP_BUTTON_ID = 'gem_enhancement:skip-gaho'
export const GEM_ENHANCEMENT_BUTTON_PREFIX = 'gem_enhancement:'

const resultLabels: Record<GemEnhancementResult, string> = {
  success: '강화 성공',
  failure: '강화 실패',
  down: '강화 하락',
  destroyed: '보석 파괴',
  pity_forced: '장기백 확정 성공',
  destroy_prevented: '파괴 방지',
  down_prevented: '하락 방지',
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

function formatResult(action: GemEnhancementActionResponse | null): string | null {
  if (!action) return null

  if ('skipped' in action) {
    return '선조의 가호를 넘겼습니다.'
  }

  if ('effect' in action.result) {
    return `선조의 가호: ${action.result.effect.description}`
  }

  const result = action.result
  return `${resultLabels[result.result]} · ${result.levelBefore}강 → ${result.levelAfter}강 · 장기백 ${result.pityBefore.toFixed(1)} → ${result.pityAfter.toFixed(1)}`
}

function formatLeaderboard(view: GemEnhancementView): string {
  if (view.leaderboard.length === 0) {
    return '아직 랭킹이 없습니다.'
  }

  return view.leaderboard
    .slice(0, 5)
    .map((entry) => `${entry.rank}. ${entry.displayName ?? '이름 없음'} · ${entry.levelLabel} · 장기백 ${entry.pity.toFixed(1)}`)
    .join('\n')
}

export function buildGemEnhancementMessage(
  view: GemEnhancementView,
  action: GemEnhancementActionResponse | null = null,
  options: { withButtons?: boolean } = {},
) {
  const { withButtons = true } = options
  const state = view.currentUserState
  const resultText = formatResult(action)
  const description = state
    ? [
        resultText ? `**결과**\n${resultText}` : null,
        `현재 **${state.levelLabel}** · 최고 **${state.bestLevelLabel}**`,
        `장기백 ${state.pity.toFixed(1)} · 시도 ${state.attempts}회 · 성공 ${state.successes}회`,
        view.cooldownRemainingSeconds > 0 ? `다음 강화까지 ${view.cooldownRemainingSeconds}초 남았습니다.` : '지금 강화할 수 있습니다.',
      ]
        .filter((line): line is string => Boolean(line))
        .join('\n')
    : '보석 강화 상태를 불러오지 못했습니다.'

  const embed = new EmbedBuilder()
    .setColor(0xf7c948)
    .setTitle('💎 보석 강화')
    .setDescription(description)
    .addFields(
      {
        name: '강화 확률',
        value: state
          ? `성공 ${formatPercent(state.currentRates.successProbability)} · 하락 ${formatPercent(state.currentRates.downProbability)} · 파괴 ${formatPercent(state.currentRates.destructionProbability)}`
          : '—',
        inline: false,
      },
      {
        name: '선조의 가호',
        value: state
          ? `스택 ${state.gaho.count}/7 · 파괴방지 ${state.gaho.shield} · 하락방지 ${state.gaho.downShield}${state.gaho.ready ? '\n가호를 뽑거나 넘긴 뒤 강화할 수 있습니다.' : ''}`
          : '—',
        inline: false,
      },
      { name: '랭킹 TOP 5', value: formatLeaderboard(view), inline: false },
    )

  if (!withButtons) {
    return { embeds: [embed], components: [] }
  }

  const canEnhance = Boolean(state && !state.gaho.ready && view.cooldownRemainingSeconds === 0)
  const canUseGaho = Boolean(state?.gaho.ready)
  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(GEM_ENHANCE_BUTTON_ID)
      .setLabel('강화')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!canEnhance),
    new ButtonBuilder()
      .setCustomId(GEM_GAHO_DRAW_BUTTON_ID)
      .setLabel('가호 뽑기')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!canUseGaho),
    new ButtonBuilder()
      .setCustomId(GEM_GAHO_SKIP_BUTTON_ID)
      .setLabel('가호 넘기기')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!canUseGaho),
  )

  return { embeds: [embed], components: [buttons] }
}
