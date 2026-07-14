import {Command, flags, vars} from '@heroku-cli/command'
import * as color from '@heroku/heroku-cli-util/color'
import {ux} from '@oclif/core/ux'

export default class Reset extends Command {
  static description = 'reset the repo'
  static flags = {
    app: flags.app({required: true}),
    remote: flags.string({char: 'r', description: 'the git remote to use'}),
  }

  async run() {
    const {flags} = await this.parse(Reset)
    const {app} = flags
    ux.action.start(`Resetting Git repository for  ${color.app(app)}`)
    await this.heroku.delete(`/${app}.git`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`:${this.heroku.auth}`).toString('base64')}`,
      },
      hostname: vars.httpGitHost,
    })
    ux.action.stop()
  }
}
