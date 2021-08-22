import minimist from 'minimist'
import { resolve } from 'path'
import fs from 'fs'
import dargs from 'dargs'

const args = minimist(process.argv.slice(2))

if (!args.config && !fs.existsSync(resolve(process.cwd(), 'vite.config.ts'))) {
    args.config = require.resolve('./defaultConfig')
}

process.argv = [...process.argv.slice(0, 2), ...dargs(args)]

require('vite/bin/vite.js')
