import {Command, flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'
import {getURL} from '../../lib/repo'
import {download} from '../../lib/download'

export default class Download extends Command {
  static description = 'download the application repo as a tarball'
  static flags = {
    app: flags.app({required: true}),
    remote: flags.string({char: 'r', description: 'the git remote to use'}),
  }
  static args = {
    filename: Args.string({description: 'a filename for the tarball'}),
  }

  async run() {
    const {args, flags} = await this.parse(Download)
    const {app} = flags

    const url = await getURL(app as string, this.heroku)
    const filename = args.filename || `${app}.tar.gz`
    ux.log(`Downloading repository to ${filename}`)
    await download(url, filename, {progress: true})
  }
}
