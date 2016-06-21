'use strict'

const cli = require('heroku-cli-util')
const co = require('co')
const {Dyno} = require('heroku-run')

function * run (context) {
  let dyno = new Dyno({
    heroku: cli.heroku,
    app: context.app,
    attach: true,
    command: `set -e
mkdir -p tmp/repo_tmp/unpack
cd tmp/repo_tmp/unpack
git init --bare .
tar -zcf ../repack.tgz .
curl -o /dev/null --upload-file ../repack.tgz '#{repo_put_url}'
exit`
  })
  yield dyno.start()
}

module.exports = {
  topic: 'repo',
  command: 'reset',
  description: 'reset the repo',
  needsAuth: true,
  needsApp: true,
  run: cli.command(co.wrap(run))
}
