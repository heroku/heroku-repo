'use strict'

const cli = require('heroku-cli-util')
const co = require('co')
const {Dyno} = require('heroku-run')

function * run (context) {
  let dyno = new Dyno({
    heroku: cli.heroku,
    app: context.app,
    command: `set -e
mkdir -p tmp/repo_tmp/unpack
cd tmp/repo_tmp
curl -o repo.tgz '#{repo_get_url}'
cd unpack
tar -zxf ../repo.tgz
git gc --aggressive
tar -zcf ../repack.tgz .
curl -o /dev/null --upload-file ../repack.tgz '#{repo_put_url}'
exit`
  })
  yield dyno.start()
}

module.exports = {
  topic: 'repo',
  command: 'gc',
  description: 'run a git gc --agressive on the applications repository',
  needsAuth: true,
  needsApp: true,
  run: cli.command(co.wrap(run))
}
