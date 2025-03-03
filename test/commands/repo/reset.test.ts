import {expect} from 'chai'
import nock from 'nock'
import {stderr} from 'stdout-stderr'

import Cmd from '../../../src/commands/repo/reset'
import {runCommand} from '../../run-command'

describe('repo:reset', function () {
  let api: nock.Scope

  beforeEach(function () {
    api = nock('https://git.heroku.com:443')
  })

  afterEach(function () {
    api.done()
    nock.cleanAll()
  })

  it('calls the correct API endpoint and shows the correct action message', async function () {
    api
      .delete('/myapp.git')
      .reply(200)

    await runCommand(Cmd, [
      '--app',
      'myapp',
    ])

    expect(stderr.output).to.include('Resetting Git repository for  ⬢ myapp')
  })
})
