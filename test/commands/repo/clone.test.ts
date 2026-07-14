import {runCommand} from '@heroku-cli/test-utils'
import nock from 'nock'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const existsSyncMock = vi.fn()
const mkdirSyncMock = vi.fn()
const execSyncHelperMock = vi.fn()

vi.mock('../../../src/lib/file-helper.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../src/lib/file-helper.js')>()
  return {
    ...actual,
    execSyncHelper: (...args: unknown[]) => execSyncHelperMock(...args),
    existsSync: (...args: unknown[]) => existsSyncMock(...args),
    mkdirSync: (...args: unknown[]) => mkdirSyncMock(...args),
  }
})

const Cmd = (await import('../../../src/commands/repo/clone.js')).default

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

describe('repo:clone', () => {
  let chdirSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    existsSyncMock.mockReset()
    mkdirSyncMock.mockReset()
    execSyncHelperMock.mockReset()
    chdirSpy = vi.spyOn(process, 'chdir').mockImplementation(() => {})
  })

  afterEach(() => {
    chdirSpy.mockRestore()
    nock.cleanAll()
  })

  it('successfully clones a repository', async () => {
    nock('https://api.heroku.com')
    .get('/apps/myapp/build-metadata')
    .reply(200, buildMetadata)
    .get('/apps/myapp')
    .reply(200, app)

    existsSyncMock.mockReturnValue(false)

    await runCommand(Cmd, [
      '--app',
      'myapp',
    ])

    expect(existsSyncMock).toHaveBeenCalled()
    expect(mkdirSyncMock).toHaveBeenCalledWith('myapp/.git', {recursive: true})
    expect(chdirSpy).toHaveBeenCalledWith('myapp/.git')
    expect(execSyncHelperMock).toHaveBeenCalledTimes(4)
  })

  it('should abort if app directory already exists', async () => {
    nock('https://api.heroku.com')
    .get('/apps/myapp/build-metadata')
    .reply(200, buildMetadata)
    .get('/apps/myapp')
    .reply(200, app)

    existsSyncMock.mockReturnValue(true)

    const {error} = await runCommand(Cmd, [
      '--app',
      'myapp',
    ])

    expect(error?.message).to.equal('myapp already exists in the filesystem. Aborting.')
    expect(mkdirSyncMock).not.toHaveBeenCalled()
  })
})
