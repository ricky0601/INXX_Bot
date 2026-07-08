# INXX_Bot — Agent Knowledge Base

INXX 디스코드 봇. TypeScript + discord.js v14. INXX 웹 API와 연동해 길드 명령어와 레이드 참여 흐름을 처리한다.

## Project Structure

```
INXX_Bot/
├── src/
│   ├── commands/         # Slash command modules
│   ├── interactions/     # Button/select/autocomplete handlers
│   ├── lib/              # API client, auth gates, caches
│   ├── index.ts          # Bot runtime
│   └── deploy-commands.ts # Slash-command deploy script
├── dist/                  # Committed runtime JS for Dishost; refresh with npm run build
├── index.js               # Dishost startup wrapper; deploys commands then imports dist/index.js
├── .env / .env.example / .env.development.example   # Environment variables
├── package.json
├── tsconfig.json
└── README.md
```

## Key Entry Points

- `src/index.ts` — bot runtime. Loads commands, starts client, routes interactions.
- `src/deploy-commands.ts` — registers guild slash commands via Discord REST.
- `index.js` — Dishost entrypoint. It must stay lightweight: no `npm run build` or `tsc` on server.
- `dist/deploy-commands.js` / `dist/index.js` — compiled files actually executed on Dishost.

## Command Pattern

Each command module in `src/commands/` exports:

```ts
export const data: SlashCommandBuilder;
export async function execute(interaction: ChatInputCommandInteraction): Promise<void>;
// optional:
export async function autocomplete(interaction: AutocompleteInteraction): Promise<void>;
```

`src/index.ts` dynamically loads every `.ts`/`.js` file in `src/commands/` and registers modules that expose both `data` and `execute`.

## Interaction Routing

Interaction `customId` prefix로 분기한다:

- `raid_join:` — `src/interactions/raid-join.ts`
- `raid_delete:` — `src/interactions/raid-delete.ts`
- `raid_join_character:` — `src/interactions/raid-join.ts`
- `char_register:` — `src/interactions/character-register.ts`

공통 패턴: `deferReply` / `deferUpdate` → INXX API 호출 → `editReply`로 결과 전달. 사용자 전용 흐름은 `ephemeral: true`를 사용한다.

## Environment Variables

`.env.example` 참고:

```bash
DISCORD_TOKEN
CLIENT_ID
GUILD_ID
DISCORD_BOT_API_SECRET
INXX_API_BASE_URL
INXX_WEB_BASE_URL
INXX_ENABLE_PREFIX_COMMANDS
```

`process.env`에서 직접 읽는다. 값이 없으면 `index.ts`와 `deploy-commands.ts`에서 즉시 종료한다.

로컬 개발 시에는 `.env`를 먼저 읽은 뒤 `.env.development`로 덧씌운다. `npm run dev`는 `NODE_ENV=development`를 설정하므로 `src/lib/load-env.ts`가 `.env.development`를 오버레이한다. 배포 환경(예: `npm start`)에서는 `.env`만 사용한다.

`INXX_ENABLE_PREFIX_COMMANDS=true`는 선택 사항이다. 운영에서 `./보석`, `./보석강화` 같은 메시지 prefix 명령을 쓰려면 이 값을 켜고 Discord Developer Portal에서 Message Content privileged intent도 활성화해야 한다. 기본값은 `false`이며, 이 경우 봇은 `GatewayIntentBits.Guilds`만 요청하고 slash command만 동작한다.

## INXX API Integration

- `src/lib/inxx-api.ts` — `INXX_API_BASE_URL`로 호출, `DISCORD_BOT_API_SECRET`을 Bearer로 사용.
- `src/lib/gem-enhancement-api.ts` — 보석 강화 전용 bot API 클라이언트. INXX의 `/api/bot/gem-enhancement`만 호출하며 Supabase에 직접 접근하지 않는다.
- `src/lib/require-inxx-user.ts` — Discord 계정이 INXX에 연동되어 있는지 검증.
- `src/lib/raid-catalog-cache.ts` — 레이드 카탈로그 캐시.

## Common Commands

```bash
npm run dev        # tsx watch src/index.ts
npm run deploy     # tsx src/deploy-commands.ts; local manual command registration only
npm run build      # tsc
npm run start      # node index.js; Dishost wrapper
npm run typecheck  # tsc --noEmit
npm run test       # vitest run
```

## Dishost Deployment Workflow

Dishost runs with tight memory (`NODE_OPTIONS=--max-old-space-size=128`) and installs production dependencies only (`npm install --omit=dev`). Do not rely on Dishost to compile TypeScript.

Required workflow for any change touching `src/**`, command definitions, interaction handlers, or runtime dependencies:

```bash
npm run build
git add src dist package.json package-lock.json index.js .gitignore
git commit
git push
```

Deployment flow after push:

1. Dishost auto-pulls `main`.
2. Dishost runs `npm run start` because `package.json` contains a `start` script.
3. `npm run start` runs `node index.js`.
4. `index.js` verifies required `dist` files exist.
5. `index.js` runs `node dist/deploy-commands.js` to register guild slash commands.
6. `index.js` imports `dist/index.js` to start the bot.

Expected Dishost console markers:

```text
[startup] Dishost wrapper started
[startup] Deploying Discord slash commands...
Refreshing 8 guild (/) commands...
Successfully reloaded 8 guild (/) commands.
[startup] Slash command deploy completed
[startup] Starting Discord bot from dist/index.js...
Ready! Logged in as ...
```

Do not add `npm run build`, `tsc`, or `tsx` to the Dishost startup path. It will likely OOM or fail because dev dependencies are omitted. Local `npm run deploy` is usually unnecessary; Dishost performs command registration on startup from committed `dist/deploy-commands.js`.

## Conventions

- Command 이름과 사용자 메시지는 한국어.
- Select/autocomplete 옵션은 최대 25개 제한을 준수한다.
- 민감/계정 전용 응답은 `ephemeral: true`.
- `tsconfig.json`은 strict + `NodeNext` module resolution.

## Anti-Patterns / Gotchas

- `src/index.ts`가 명령어 로딩 + 모든 interaction 라우팅 + 에러 핸들링을 한 파일에서 처리하고 있다. 새 interaction 유형을 추가할 때는 기존 prefix 분기를 확장하지 말고 별도 라우터로 분리하는 것을 권장한다.
- `src/lib/inxx-api.ts`는 `as Type`로 JSON을 캐스팅한다. 런타임 검증을 추가할 것.
- `src/commands/setup.ts`에 빈 `catch {}`가 있다. 의도하지 않은 예외를 삼키지 않도록 개선할 것.
- `src/commands/`의 파일명이 한국어(`내정보.ts`, `레이드.ts`)다. 일부 툴에서 경로 처리에 주의가 필요하다.
- `dist/` is intentionally committed for Dishost. If `src` changes but `dist` is not rebuilt and committed, Dishost will run stale code.
- Dishost ignores the UI `STARTUP_FILE` whenever `package.json` contains `start`; it runs `npm run start` first. Keep `start` pointing at `node index.js`.
- 테스트, lint, format 스크립트가 없다. 추가를 권장한다.
