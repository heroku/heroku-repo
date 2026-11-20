import {Command, flags} from '@heroku-cli/command'

import Dyno from '../../lib/dyno.js'
import {getCacheURL, putCacheURL} from '../../lib/repo.js'

export default class PurgeCache extends Command {
  static aliases = ['repo:purge_cache']
  static description = 'delete the contents of the build cache in the repository'
  static flags = {
    app: flags.app({required: true}),
    remote: flags.string({char: 'r', description: 'the git remote to use'}),
  }

  async run() {
    const {flags} = await this.parse(PurgeCache)
    const {app} = flags
    const repoGetCacheURL = await getCacheURL(app as string, this.heroku)
    const repoPutCacheURL = await putCacheURL(app as string, this.heroku)

    const command = `set -e
mkdir -p tmp/repo_tmp/unpack
cd tmp/repo_tmp
curl -fo repo-cache.tgz '${repoGetCacheURL}'
cd unpack
METADATA=
if tar -tzf ../repo-cache.tgz ./vendor/heroku >/dev/null 2>&1; then
  METADATA=./vendor/heroku
elif tar -tzf ../repo-cache.tgz vendor/heroku >/dev/null 2>&1; then
  METADATA=vendor/heroku
else
  tar -tzf ../repo-cache.tgz >/dev/null
fi
if [ -n "$METADATA" ]; then
  tar -zxf ../repo-cache.tgz "$METADATA"
fi
tar -zcf ../cache-repack.tgz .
curl -fo /dev/null --upload-file ../cache-repack.tgz '${repoPutCacheURL}'
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
