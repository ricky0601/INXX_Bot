import { execFileSync } from 'node:child_process'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

execFileSync(npmCommand, ['run', 'build'], { stdio: 'inherit' })
execFileSync(npmCommand, ['run', 'deploy'], { stdio: 'inherit' })

await import('./dist/index.js')
