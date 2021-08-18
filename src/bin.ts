import minimist from 'minimist'
import { resolve } from 'path'
import fs from 'fs'
import dargs from 'dargs'

// Isn't used at the moment due to unstable Vite behaviour

const args = minimist(process.argv.slice(2))

if (!args.config && !fs.existsSync(resolve(process.cwd(), 'vite.config.ts'))) {
    args.config = require.resolve('./defaultConfig')
}

process.argv = [...process.argv.slice(0, 2), ...dargs(args)]

require('vite/bin/vite.js')
