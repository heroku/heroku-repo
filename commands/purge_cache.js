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
cd tmp/repo_tmp
curl -o repo-cache.tgz '#{cache_get_url}'
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
curl -o /dev/null --upload-file ../cache-repack.tgz '#{cache_put_url}'
exit`
  })
  yield dyno.start()
}

module.exports = {
  topic: 'repo',
  command: 'purge_cache',
  description: 'deletes the contents the build cache in the repository',
  needsAuth: true,
  needsApp: true,
  run: cli.command(co.wrap(run))
}
