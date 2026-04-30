import {Command, flags} from '@heroku-cli/command'
import {ux} from '@oclif/core'
import path from 'path'
import * as os from 'os'
import * as tar from 'tar'

import {download} from '../../lib/download'
import {upload} from '../../lib/upload'
import {getURL, putURL} from '../../lib/repo'
import {execSyncHelper, mkdtempSync, mkdirSync, existsSync, rmSync} from '../../lib/file-helper'

export default class Gc extends Command {
  static description = 'run a git gc --aggressive on an application\'s repository'
  static flags = {
    app: flags.app({required: true}),
    remote: flags.string({char: 'r', description: 'the git remote to use'}),
  }

  async run() {
    const {flags} = await this.parse(Gc)
    const {app} = flags

    // Check if git is installed locally
    try {
      execSyncHelper('git --version', {stdio: 'ignore'})
    } catch {
      this.error('You don\'t have Git installed on your system. Install Git and try again.')
    }

    const repoGetURL = await getURL(app as string, this.heroku)
    const repoPutURL = await putURL(app as string, this.heroku)

    // Create temporary directory
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'heroku-repo-gc-'))
    const repoTgz = path.join(tmpDir, 'repo.tgz')
    const unpackDir = path.join(tmpDir, 'unpack')
    const repackTgz = path.join(tmpDir, 'repack.tgz')

    try {
      ux.log('Downloading repository')
      await download(repoGetURL, repoTgz, {progress: true})

      ux.action.start('Unpacking repository')
      mkdirSync(unpackDir, {recursive: true})
      await tar.extract({
        file: repoTgz,
        cwd: unpackDir,
      })
      ux.action.stop()

      ux.log('Running git gc --aggressive')
      execSyncHelper('git gc --aggressive', {cwd: unpackDir, stdio: 'inherit'})

      ux.action.start('Repacking repository')
      await tar.create({
        gzip: true,
        file: repackTgz,
        cwd: unpackDir,
      }, ['.'])
      ux.action.stop()

      ux.log('Uploading repacked repository')
      await upload(repoPutURL, repackTgz, {progress: true})
    } finally {
      // Cleanup temporary directory
      if (existsSync(tmpDir)) {
        rmSync(tmpDir, {recursive: true, force: true})
      }
    }
  }
}
