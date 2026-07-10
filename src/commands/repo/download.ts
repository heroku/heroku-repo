import {Command, flags} from '@heroku-cli/command'
import {Args} from '@oclif/core'
import {ux} from '@oclif/core/ux'

import {download} from '../../lib/download.js'
import {getURL} from '../../lib/repo.js'

export default class Download extends Command {
  static args = {
    filename: Args.string({description: 'a filename for the tarball'}),
  }
  static description = 'download the application repo as a tarball'
  static flags = {
    app: flags.app({required: true}),
    remote: flags.string({char: 'r', description: 'the git remote to use'}),
  }

  async run() {
    const {args, flags} = await this.parse(Download)
    const {app} = flags

    const url = await getURL(app as string, this.heroku)
    const filename = args.filename || `${app}.tar.gz`
    ux.stdout(`Downloading repository to ${filename}`)
    await download(url, filename, {progress: true})
  }
}
