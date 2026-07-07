import {
  ActionRowBuilder,
  AutocompleteInteraction,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js'
import { getGuildConfig, createRaidSchedule } from '../lib/inxx-api.js'
import { requireInxxUser } from '../lib/require-inxx-user.js'
import { getCachedRaidCatalog } from '../lib/raid-catalog-cache.js'

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
    option.setName('날짜').setDescription('예: 2026-08-01').setRequired(true),
  )
  .addStringOption((option) =>
    option.setName('시간').setDescription('24시간 형식, 예: 20:30').setRequired(true),
  )
  .addIntegerOption((option) =>
    option
      .setName('모집인원')
      .setDescription('비워두면 인원 제한 없음')
      .setMinValue(1)
      .setMaxValue(30)
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
    await interaction.reply({ content: '이 명령어는 서버 안에서만 사용할 수 있습니다.', ephemeral: true })
    return
  }

  await interaction.deferReply({ ephemeral: true })
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
  const time = interaction.options.getString('시간', true)
  const maxParticipants = interaction.options.getInteger('모집인원')
  const memo = interaction.options.getString('메모')

  const catalog = await getCachedRaidCatalog()
  const raid = catalog.find((item) => item.raidName === raidName && item.difficulty === difficulty)
  if (!raid) {
    await interaction.editReply('선택한 레이드/난이도 조합을 찾을 수 없습니다. 자동완성 목록에서 다시 선택해주세요.')
    return
  }

  let schedule
  try {
    schedule = await createRaidSchedule({
      raidId: raid.id,
      date,
      time,
      maxParticipants,
      memo,
      creatorUserId: user.id,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '레이드 일정 생성에 실패했습니다.'
    await interaction.editReply(message)
    return
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(schedule.title)
    .addFields(
      { name: '일시', value: formatKst(schedule.scheduledAt), inline: true },
      { name: '모집 인원', value: schedule.maxParticipants ? `${schedule.maxParticipants}명` : '제한 없음', inline: true },
    )
    .setFooter({ text: `주최: ${user.displayName ?? user.discordUsername ?? '알 수 없음'}` })

  if (schedule.memo) {
    embed.addFields({ name: '메모', value: schedule.memo })
  }

  const joinButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`raid_join:${schedule.id}:dealer`)
      .setLabel('딜러로 참여')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`raid_join:${schedule.id}:support`)
      .setLabel('서포터로 참여')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`raid_delete:${schedule.id}`)
      .setLabel('삭제')
      .setStyle(ButtonStyle.Danger),
  )

  try {
    const thread = await forumChannel.threads.create({
      name: `${schedule.title} · ${formatKst(schedule.scheduledAt)}`,
      message: { embeds: [embed], components: [joinButtons] },
    })

    await interaction.editReply(`레이드 일정이 등록되고 포럼에 게시되었습니다: ${thread.toString()}`)
  } catch (error) {
    console.error('Failed to create raid forum thread:', error)
    await interaction.editReply(
      '레이드 일정은 등록됐지만 포럼 게시물 생성에 실패했습니다. 관리자에게 알려주세요.',
    )
  }
}
