#!/usr/bin/env node

import fs from 'fs'
import { resolve } from 'path'
import dargs from 'dargs'
import minimist from 'minimist'

const args = minimist(process.argv.slice(2))

if (!args.config && !fs.existsSync(resolve(process.cwd(), 'vite.config.ts'))) args.config = require.resolve('./defaultConfig')

process.argv = [...process.argv.slice(0, 2), ...dargs(args)]

// eslint-disable-next-line @typescript-eslint/no-require-imports
require('vite/bin/vite.js')
