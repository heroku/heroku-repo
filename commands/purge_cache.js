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
curl -o repo-cache.tgz '${yield repo.getCacheURL(app)}'
cd unpack
tar -zxf ../repo-cache.tgz
METADATA="vendor/heroku"
if [ -d "$METADATA" ]; then
  TMPDIR=\`mktemp -d\`
  cp -rf $METADATA $TMPDIR
fi
cd ..
rm -rf unpack
mkdir unpack
cd unpack
TMPDATA="$TMPDIR/heroku"
VENDOR="vendor"
if [ -d "$TMPDATA" ]; then
  mkdir $VENDOR
  cp -rf $TMPDATA $VENDOR
  rm -rf $TMPDIR
fi
tar -zcf ../cache-repack.tgz .
curl -o /dev/null --upload-file ../cache-repack.tgz '${yield repo.putCacheURL(app)}'
exit`
  })
  yield dyno.start()
}

module.exports = {
  topic: 'repo',
  command: 'purge_cache',
  description: 'delete the contents of the build cache in the repository',
  needsAuth: true,
  needsApp: true,
  run: cli.command(co.wrap(run))
}
