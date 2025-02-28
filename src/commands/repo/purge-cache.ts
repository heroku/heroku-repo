import {Command, flags} from '@heroku-cli/command'

import Dyno from '../../lib/dyno'
import {getURL, putURL} from '../../lib/repo'

export default class PurgeCache extends Command {
  static aliases = ['purge_cache']
  static description = 'delete the contents of the build cache in the repository'
  static flags = {
    app: flags.app({required: true}),
    remote: flags.string({char: 'r', description: 'the git remote to use'}),
  }

  async run() {
    const {flags} = await this.parse(PurgeCache)
    const {app} = flags
    const repoGetURL = await getURL(app as string, this.heroku)
    const repoPutURL = await putURL(app as string, this.heroku)

    const command = `set -e
mkdir -p tmp/repo_tmp/unpack
cd tmp/repo_tmp
curl -fo repo-cache.tgz '${repoGetURL}'
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
curl -fo /dev/null --upload-file ../cache-repack.tgz '${repoPutURL}'
exit`

    const dyno = new Dyno({
      app: app as string,
      attach: true,
      command,
      heroku: this.heroku,
    })
    await dyno.start()
  }
}
