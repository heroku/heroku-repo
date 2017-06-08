'use strict'

const cli = require('heroku-cli-util')
const co = require('co')
const {Dyno} = require('heroku-run')

function * run (context) {
  const repo = require('../lib/repo')
  const app = context.app
  let configArgs = context.args.join(' ')

  let dyno = new Dyno({
    heroku: cli.heroku,
    app,
    attach: true,
    command: `set -e
mkdir -p /tmp/repo_tmp/repository
cd /tmp/repo_tmp

wget -O repository.tgz '${yield repo.getURL(app)}'
tar -xzf repository.tgz -C repository
cd repository

git config ${configArgs}

tar -zcf ../repack.tgz .
curl -o /dev/null --upload-file ../repack.tgz '${yield repo.putURL(app)}'
exit`
  })
  yield dyno.start()
}

module.exports = {
  topic: 'repo',
  command: 'config',
  description: 'set custom config on the repo',
  needsAuth: true,
  needsApp: true,
  variableArgs: true,
  run: cli.command(co.wrap(run))
}
