import {expect} from 'chai'
import nock from 'nock'
import * as sinon from 'sinon'

import Cmd from '../../../src/commands/repo/clone'
import * as fs from '../../../src/lib/file-helper'
import {runCommand} from '../../run-command'

const app = {
  build_stack: {name: 'cedar-14'},
  create_status: 'complete',
  database_size: 1000,
  generation: 'cedar',
  git_url: 'https://git.heroku.com/myapp',
  id: 'app-id',
  internal_routing: true,
  name: 'myapp',
  owner: {email: 'foo@foo.com'},
  region: {name: 'eu'},
  repo_size: 1000,
  slug_size: 1000,
  space: {name: 'myspace'},
  stack: {name: 'cedar-14'},
  web_url: 'https://myapp.herokuapp.com',
}

const buildMetadata = {
  app: {
    id: 'app-id',
    name: 'myapp',
  },
  cache_delete_url: 'https://cache-delete.com',
  cache_get_url: 'https://cache-get.com',
  cache_put_url: 'https://cache-put.com',
  repo_delete_url: 'https://repo-delete.com',
  repo_get_url: 'https://repo-get.com',
  repo_put_url: 'https://repo-put.com',
}

describe('repo:clone', function () {
  let api: nock.Scope
  let existsSyncStub: sinon.SinonStub
  let mkdirSyncStub: sinon.SinonStub
  let chdirStub: sinon.SinonStub
  let execSyncHelperStub: sinon.SinonStub

  beforeEach(function () {
    api = nock('https://api.heroku.com')
    existsSyncStub = sinon.stub(fs, 'existsSync')
    mkdirSyncStub = sinon.stub(fs, 'mkdirSync')
    chdirStub = sinon.stub(process, 'chdir')
    execSyncHelperStub = sinon.stub(fs, 'execSyncHelper')
  })

  afterEach(function () {
    api.done()
    nock.cleanAll()
    sinon.restore()
  })

  it('successfully clones a repository', async function () {
    nock('https://api.heroku.com')
      .get('/apps/myapp/build-metadata')
      .reply(200, buildMetadata)
      .get('/apps/myapp')
      .reply(200, app)

    existsSyncStub.withArgs('myapp').returns(false)

    await runCommand(Cmd, [
      '--app',
      'myapp',
    ])

    expect(existsSyncStub.called).to.equal(true)
    expect(mkdirSyncStub.calledWith('myapp/.git')).to.equal(true)
    expect(chdirStub.calledWith('myapp/.git')).to.equal(true)
    expect(execSyncHelperStub.callCount).to.equal(4)
  })

  it('should abort if app directory already exists', async () => {
    nock('https://api.heroku.com')
      .get('/apps/myapp/build-metadata')
      .reply(200, buildMetadata)
      .get('/apps/myapp')
      .reply(200, app)

    existsSyncStub.withArgs('myapp').returns(true)

    await runCommand(Cmd, [
      '--app',
      'myapp',
    ]).catch(error => {
      const {message} = error as { message: string }
      expect(message).to.equal('myapp already exists in the filesystem. Aborting.')
    })

    expect(mkdirSyncStub.called).to.be.false
  })
})
