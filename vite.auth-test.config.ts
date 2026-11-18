import { defineConfig } from 'vite'
import config from './vite.config.ts'

export default defineConfig({ ...config, cacheDir: 'node_modules/.vite-auth-tests' })
