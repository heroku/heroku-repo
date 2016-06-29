'use strict'

const cli = require('heroku-cli-util')
const co = require('co')
const {Dyno} = require('heroku-run')

function * run (context) {
  const repo = require('../lib/repo')
  const app = context.app

  let dyno = new Dyno({
    heroku: cli.heroku,
    app,
    attach: true,
    command: `set -e
mkdir -p tmp/repo_tmp/unpack
cd tmp/repo_tmp
curl -o repo.tgz '${yield repo.getURL(app)}'
cd unpack
tar -zxf ../repo.tgz
git gc --aggressive
tar -zcf ../repack.tgz .
curl -o /dev/null --upload-file ../repack.tgz '${yield repo.putURL(app)}'
exit`
  })
  yield dyno.start()
}

module.exports = {
  topic: 'repo',
  command: 'gc',
  description: "run a git gc --aggressive on an application's repository",
  needsAuth: true,
  needsApp: true,
  run: cli.command(co.wrap(run))
}
