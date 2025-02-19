import {Command, flags, vars} from '@heroku-cli/command'
import color from '@heroku-cli/color'
import * as Heroku from '@heroku-cli/schema'
import {ux} from '@oclif/core'

export default class Clone extends Command {
  static description = 'clone the application repo to your local filesystem'
  static flags = {
    app: flags.app({required: true}),
    remote: flags.string({char: 'r', description: 'the git remote to use'}),
  }

  async run() {
    const {flags} = await this.parse(Clone)
    const {app} = flags
    ux.action.start(`Resetting Git repository for  ${color.app(app)}`)
    await this.heroku.delete(`/${app}/git`, {
      method: 'DELETE',
      hostname: vars.httpGitHost,
      parseJSON: false,
    })
    ux.action.stop()
  }
}
