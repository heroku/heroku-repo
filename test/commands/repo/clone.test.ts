import {expect} from 'chai'
import {stderr, stdout} from 'stdout-stderr'
import nock from 'nock'
import * as sinon from 'sinon'
import * as fs from "../../../src/lib/file-helper";
import Cmd from '../../../src/commands/repo/clone'
import {runCommand} from '../../run-command'
import {execSyncHelper} from "../../../src/lib/file-helper";

const app = {
  id: 'app-id',
  name: 'myapp',
  database_size: 1000,
  create_status: 'complete',
  repo_size: 1000,
  slug_size: 1000,
  git_url: 'https://git.heroku.com/myapp',
  web_url: 'https://myapp.herokuapp.com',
  region: {name: 'eu'},
  build_stack: {name: 'cedar-14'},
  stack: {name: 'cedar-14'},
  owner: {email: 'foo@foo.com'},
  space: {name: 'myspace'},
  generation: 'cedar',
  internal_routing: true,
}

const buildMetadata = {
  app: {
    name: 'myapp',
    id: 'app-id',
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
    existsSyncStub = sinon.stub(fs, 'existsSync');
    mkdirSyncStub = sinon.stub(fs, 'mkdirSync');
    chdirStub = sinon.stub(process, 'chdir');
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
      'myapp'
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

    existsSyncStub.withArgs('myapp').returns(true);

    await runCommand(Cmd, [
      '--app',
      'myapp'
    ]).catch(error => {
      const {message} = error as { message: string }
      expect(message).to.equal('myapp already exists in the filesystem. Aborting.')
    })

    expect(mkdirSyncStub.called).to.be.false;
  })
})
