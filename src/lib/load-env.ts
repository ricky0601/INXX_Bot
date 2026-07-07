import { config } from 'dotenv'

// Load the base environment first. Existing system variables are preserved.
config({ path: '.env' })

// In development, overlay .env.development so local overrides win.
if (process.env.NODE_ENV === 'development') {
  config({ path: '.env.development', override: true })
}
