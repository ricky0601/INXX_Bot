import { execFileSync } from 'node:child_process'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

console.log('[startup] Dishost wrapper started')

console.log('[startup] Building TypeScript sources...')
execFileSync(npmCommand, ['run', 'build'], { stdio: 'inherit' })
console.log('[startup] Build completed')

console.log('[startup] Deploying Discord slash commands...')
execFileSync(npmCommand, ['run', 'deploy'], { stdio: 'inherit' })
console.log('[startup] Slash command deploy completed')

console.log('[startup] Starting Discord bot from dist/index.js...')
await import('./dist/index.js')
