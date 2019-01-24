'use strict'

const cli = require('heroku-cli-util')
const co = require('co')
const {Dyno} = require('@heroku-cli/plugin-run')

function * run (context) {
  const repo = require('../lib/repo')
  const download = require('../lib/download')
  const app = context.app

  console.log("This command is experimental and subject to change, use as your own risk")

  // console.log(yield)
  let filename = context.args.filename || `${app}-cache.tgz`

  yield download(yield repo.getCacheURL(app), filename, {progress: true})
}

module.exports = {
  topic: 'repo',
  command: 'download_cache',
  description: 'downloads the contents of an application build cache for local inspection [EXPERIMENTAL]',
  needsAuth: true,
  needsApp: true,
  run: cli.command(co.wrap(run))
}
