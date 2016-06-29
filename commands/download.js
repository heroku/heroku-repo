'use strict'

const cli = require('heroku-cli-util')
const co = require('co')

function * run (context) {
  const download = require('../lib/download')
  const repo = require('../lib/repo')
  const app = context.app

  let url = yield repo.getURL(app)
  let filename = context.args.filename || `${app}-repo.tgz`
  console.error(`Downloading repository to ${filename}`)
  yield download(url, filename, {progress: true})
}

module.exports = {
  topic: 'repo',
  command: 'download',
  description: 'download the repo',
  needsAuth: true,
  needsApp: true,
  args: [{name: 'filename', optional: true}],
  run: cli.command(co.wrap(run))
}
