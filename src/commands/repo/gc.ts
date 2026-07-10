import {Command, flags} from '@heroku-cli/command'
import {ux} from '@oclif/core/ux'
import * as os from 'node:os'
import path from 'node:path'
import * as tar from 'tar'

import {download} from '../../lib/download.js'
import {
  execSyncHelper, existsSync, mkdirSync, mkdtempSync, rmSync,
} from '../../lib/file-helper.js'
import {getURL, putURL} from '../../lib/repo.js'
import {upload} from '../../lib/upload.js'

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
      ux.error('You don\'t have Git installed on your system. Install Git and try again.')
    }

    const repoGetURL = await getURL(app as string, this.heroku)
    const repoPutURL = await putURL(app as string, this.heroku)

    // Create temporary directory
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'heroku-repo-gc-'))
    const repoTgz = path.join(tmpDir, 'repo.tgz')
    const unpackDir = path.join(tmpDir, 'unpack')
    const repackTgz = path.join(tmpDir, 'repack.tgz')

    try {
      ux.stdout('Downloading repository')
      await download(repoGetURL, repoTgz, {progress: true})

      ux.action.start('Unpacking repository')
      mkdirSync(unpackDir, {recursive: true})
      await tar.extract({
        cwd: unpackDir,
        file: repoTgz,
      })
      ux.action.stop()

      ux.stdout('Running git gc --aggressive')
      execSyncHelper('git gc --aggressive', {cwd: unpackDir, stdio: 'inherit'})

      ux.action.start('Repacking repository')
      await tar.create({
        cwd: unpackDir,
        file: repackTgz,
        gzip: true,
      }, ['.'])
      ux.action.stop()

      ux.stdout('Uploading repacked repository')
      await upload(repoPutURL, repackTgz, {progress: true})
    } finally {
      // Cleanup temporary directory
      if (existsSync(tmpDir)) {
        rmSync(tmpDir, {force: true, recursive: true})
      }
    }
  }
}
