import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const deployEntrypoint = './dist/deploy-commands.js'
const botEntrypoint = './dist/index.js'

console.log('[startup] Dishost wrapper started')

if (!existsSync(deployEntrypoint) || !existsSync(botEntrypoint)) {
  console.error('[startup] Missing dist files. Run npm run build locally and commit dist before deploying.')
  process.exit(1)
}

console.log('[startup] Deploying Discord slash commands...')
execFileSync(process.execPath, [deployEntrypoint], { stdio: 'inherit' })
console.log('[startup] Slash command deploy completed')

console.log('[startup] Starting Discord bot from dist/index.js...')
await import(botEntrypoint)
