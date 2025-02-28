import {Command, flags} from '@heroku-cli/command'
import * as Heroku from '@heroku-cli/schema'
import {ux} from '@oclif/core'

import {execSyncHelper, existsSync, mkdirSync} from '../../lib/file-helper'
import {getURL} from '../../lib/repo'

export default class Clone extends Command {
  static description = 'clone the application repo to your local filesystem'
  static flags = {
    app: flags.app({required: true}),
    remote: flags.string({char: 'r', description: 'the git remote to use'}),
  }

  async run() {
    const {flags} = await this.parse(Clone)
    const {app} = flags
    const url = await getURL(app as string, this.heroku)
    const {body: info} = await this.heroku.get<Heroku.App>(`/apps/${app}`)

    if (existsSync(app as string)) {
      ux.error(`${app} already exists in the filesystem. Aborting.`)
    }

    mkdirSync(`${app}/.git`, {recursive: true})
    process.chdir(`${app}/.git`)
    execSyncHelper(
      `curl -f '${url}' | tar xzf -`,
      {stdio: 'inherit'}
    )
    process.chdir('..')
    execSyncHelper(
      'git init',
      {stdio: 'inherit'}
    )
    execSyncHelper(
      'git reset --hard main',
      {stdio: 'inherit'}
    )
    execSyncHelper(
      `git remote add heroku ${info.git_url}`,
      {stdio: 'inherit'}
    )
  }
}
