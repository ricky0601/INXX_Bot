import {
  ActionRowBuilder,
  AutocompleteInteraction,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js'
import { getGuildConfig, createRaidSchedule, getRaidSchedule } from '../lib/inxx-api.js'
import { requireInxxUser } from '../lib/require-inxx-user.js'
import { getCachedRaidCatalog } from '../lib/raid-catalog-cache.js'
import { buildRaidEmbed } from '../lib/raid-embed.js'
import { suggestDates } from '../lib/date-time-suggest.js'

const hourChoices = Array.from({ length: 24 }, (_, index) => ({
  name: `${String(index).padStart(2, '0')}시`,
  value: index,
}))

export const data = new SlashCommandBuilder()
  .setName('레이드')
  .setDescription('레이드 일정을 등록하고 포럼에 참여 게시물을 자동으로 작성합니다.')
  .addStringOption((option) =>
    option.setName('레이드').setDescription('레이드 선택').setRequired(true).setAutocomplete(true),
  )
  .addStringOption((option) =>
    option.setName('난이도').setDescription('난이도 선택').setRequired(true).setAutocomplete(true),
  )
  .addStringOption((option) =>
    option.setName('날짜').setDescription('예: 2026-08-01').setRequired(true).setAutocomplete(true),
  )
  .addIntegerOption((option) =>
    option
      .setName('시')
      .setDescription('미선택 시 21시')
      .setRequired(false)
      .addChoices(...hourChoices),
  )
  .addStringOption((option) =>
    option
      .setName('분')
      .setDescription('미선택 시 00분')
      .setRequired(false)
      .addChoices({ name: '00분', value: '00' }, { name: '30분', value: '30' }),
  )
  .addIntegerOption((option) =>
    option
      .setName('모집인원')
      .setDescription('비워두면 레이드 기본 인원 (지평/세르카 4, 나머지 8)')
      .setMinValue(1)
      .setMaxValue(8)
      .setRequired(false),
  )
  .addStringOption((option) =>
    option.setName('메모').setDescription('참고 사항 (최대 500자)').setMaxLength(500).setRequired(false),
  )

export const autocomplete = async (interaction: AutocompleteInteraction) => {
  const focused = interaction.options.getFocused(true)
  const query = focused.value.toLowerCase()
  const items = await getCachedRaidCatalog()

  if (focused.name === '레이드') {
    const raidNames = Array.from(new Set(items.map((item) => item.raidName)))
      .filter((name) => name.toLowerCase().includes(query))
      .slice(0, 25)

    await interaction.respond(raidNames.map((name) => ({ name, value: name })))
    return
  }

  if (focused.name === '난이도') {
    const selectedRaidName = interaction.options.getString('레이드')
    const difficulties = Array.from(
      new Set(
        items
          .filter((item) => !selectedRaidName || item.raidName === selectedRaidName)
          .map((item) => item.difficulty),
      ),
    )
      .filter((difficulty) => difficulty.toLowerCase().includes(query))
      .slice(0, 25)

    await interaction.respond(difficulties.map((difficulty) => ({ name: difficulty, value: difficulty })))
    return
  }

  if (focused.name === '날짜') {
    await interaction.respond(suggestDates(focused.value))
    return
  }

  await interaction.respond([])
}

function formatKst(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export const execute = async (interaction: ChatInputCommandInteraction) => {
  if (!interaction.inGuild()) {
    await interaction.reply({ content: '이 명령어는 서버 안에서만 사용할 수 있습니다.', flags: MessageFlags.Ephemeral })
    return
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  const guild = interaction.guild ?? (await interaction.client.guilds.fetch(interaction.guildId))

  const guildConfig = await getGuildConfig(guild.id)
  if (!guildConfig) {
    await interaction.editReply('먼저 `/setup`을 실행해 레이드 포럼 채널을 구성해주세요.')
    return
  }

  const forumChannel = await guild.channels.fetch(guildConfig.forumChannelId).catch(() => null)
  if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
    await interaction.editReply('레이드 포럼 채널을 찾을 수 없습니다. `/setup`을 다시 실행해주세요.')
    return
  }

  const user = await requireInxxUser(interaction)
  if (!user) return

  const raidName = interaction.options.getString('레이드', true)
  const difficulty = interaction.options.getString('난이도', true)
  const date = interaction.options.getString('날짜', true)
  const hour = interaction.options.getInteger('시') ?? 21
  const minute = interaction.options.getString('분') ?? '00'
  const time = `${String(hour).padStart(2, '0')}:${minute}`
  const maxParticipants = interaction.options.getInteger('모집인원')
  const memo = interaction.options.getString('메모')

  const catalog = await getCachedRaidCatalog()
  const raid = catalog.find((item) => item.raidName === raidName && item.difficulty === difficulty)
  if (!raid) {
    await interaction.editReply('선택한 레이드/난이도 조합을 찾을 수 없습니다. 자동완성 목록에서 다시 선택해주세요.')
    return
  }

  if (maxParticipants != null && maxParticipants > raid.defaultMaxParticipants) {
    await interaction.editReply(`선택한 레이드의 모집 인원은 최대 ${raid.defaultMaxParticipants}명입니다.`)
    return
  }

  const resolvedMaxParticipants = maxParticipants ?? raid.defaultMaxParticipants

  let schedule
  try {
    schedule = await createRaidSchedule({
      raidId: raid.id,
      date,
      time,
      maxParticipants: resolvedMaxParticipants,
      memo,
      creatorUserId: user.id,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '레이드 일정 생성에 실패했습니다.'
    await interaction.editReply(message)
    return
  }

  let detail
  try {
    detail = await getRaidSchedule(schedule.id)
  } catch (error) {
    console.error('Failed to fetch raid schedule detail:', error)
    await interaction.editReply(
      '레이드 일정은 생성됐지만 상세 정보를 불러오지 못했습니다. 관리자에게 알려주세요.',
    )
    return
  }

  const embed = buildRaidEmbed(detail)

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`raid_apply:${schedule.id}`)
      .setLabel('참가신청')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`raid_cancel:${schedule.id}`)
      .setLabel('취소')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`raid_manage:${schedule.id}`)
      .setLabel('관리')
      .setStyle(ButtonStyle.Danger),
  )

  try {
    const thread = await forumChannel.threads.create({
      name: `${schedule.title} · ${formatKst(schedule.scheduledAt)}`,
      message: { embeds: [embed], components: [buttons] },
    })

    await interaction.editReply(`레이드 일정이 등록되고 포럼에 게시되었습니다: ${thread.toString()}`)
  } catch (error) {
    console.error('Failed to create raid forum thread:', error)
    await interaction.editReply(
      '레이드 일정은 등록됐지만 포럼 게시물 생성에 실패했습니다. 관리자에게 알려주세요.',
    )
  }
}
