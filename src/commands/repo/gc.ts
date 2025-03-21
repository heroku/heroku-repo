import {Command, flags} from '@heroku-cli/command'

import Dyno from '../../lib/dyno'
import {getURL, putURL} from '../../lib/repo'

export default class Gc extends Command {
  static description = 'run a git gc --aggressive on an application\'s repository'
  static flags = {
    app: flags.app({required: true}),
    remote: flags.string({char: 'r', description: 'the git remote to use'}),
  }

  async run() {
    const {flags} = await this.parse(Gc)
    const {app} = flags
    const repoGetURL = await getURL(app as string, this.heroku)
    const repoPutURL = await putURL(app as string, this.heroku)

    const command = `set -e
mkdir -p tmp/repo_tmp/unpack
cd tmp/repo_tmp
curl -fo repo.tgz '${repoGetURL}'
cd unpack
tar -zxf ../repo.tgz
git gc --aggressive
tar -zcf ../repack.tgz .
curl -fo /dev/null --upload-file ../repack.tgz '${repoPutURL}'
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
