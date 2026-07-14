import {runCommand} from '@heroku-cli/test-utils'
import {ux} from '@oclif/core/ux'
import nock from 'nock'
import stripAnsi from 'strip-ansi'
import {
  afterEach, beforeEach, describe, expect, it,
} from 'vitest'

import Cmd from '../../../src/commands/repo/reset.js'

const originalActionStart = ux.action.start
const originalActionStop = ux.action.stop

describe('repo:reset', () => {
  let api: nock.Scope

  beforeEach(() => {
    api = nock('https://git.heroku.com:443')
    ux.action.start = (message: string) => {
      process.stderr.write(`${stripAnsi(message)}... `)
    }

    ux.action.stop = (messageToWrite = 'done') => {
      process.stderr.write(`${stripAnsi(messageToWrite)}\n`)
    }
  })

  afterEach(() => {
    ux.action.start = originalActionStart
    ux.action.stop = originalActionStop
    api.done()
    nock.cleanAll()
  })

  it('calls the correct API endpoint and shows the correct action message', async () => {
    api
    .delete('/myapp.git')
    .reply(200)

    const {stderr} = await runCommand(Cmd, [
      '--app',
      'myapp',
    ])

    expect(stripAnsi(stderr)).to.contain('Resetting Git repository for  myapp')
  })
})
