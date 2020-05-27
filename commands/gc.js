'use strict'

const cli = require('heroku-cli-util')
const co = require('co')
const {Dyno} = require('@heroku-cli/plugin-run')

function * run (context) {
  const repo = require('../lib/repo')
  const app = context.app
  const size = context.flags.size

  let dyno = new Dyno({
    heroku: cli.heroku,
    app,
    size,
    attach: true,
    command: `set -e
mkdir -p tmp/repo_tmp/unpack
cd tmp/repo_tmp
curl -fo repo.tgz '${yield repo.getURL(app)}'
cd unpack
tar -zxf ../repo.tgz
git gc --aggressive
tar -zcf ../repack.tgz .
curl -fo /dev/null --upload-file ../repack.tgz '${yield repo.putURL(app)}'
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
  flags: [
    { name: 'size', char: 's', description: 'dyno size', hasValue: true }
  ],
  run: cli.command(co.wrap(run))
}
