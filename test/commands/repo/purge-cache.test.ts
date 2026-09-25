import {runCommand} from '@heroku-cli/test-utils'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import Dyno from '../../../src/lib/dyno.js'

const getCacheURLMock = vi.fn()
const putCacheURLMock = vi.fn()

vi.mock('../../../src/lib/repo.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../src/lib/repo.js')>()
  return {
    ...actual,
    getCacheURL: (...args: unknown[]) => getCacheURLMock(...args),
    putCacheURL: (...args: unknown[]) => putCacheURLMock(...args),
  }
})

const Cmd = (await import('../../../src/commands/repo/purge-cache.js')).default

const commandString = `set -e
mkdir -p tmp/repo_tmp/unpack
cd tmp/repo_tmp
curl -fo repo-cache.tgz 'https://get-cache-url.com'
cd unpack
METADATA=
if tar -tzf ../repo-cache.tgz ./vendor/heroku >/dev/null 2>&1; then
  METADATA=./vendor/heroku
elif tar -tzf ../repo-cache.tgz vendor/heroku >/dev/null 2>&1; then
  METADATA=vendor/heroku
else
  tar -tzf ../repo-cache.tgz >/dev/null
fi
if [ -n "$METADATA" ]; then
  tar -zxf ../repo-cache.tgz "$METADATA"
fi
tar -zcf ../cache-repack.tgz .
curl -fo /dev/null --upload-file ../cache-repack.tgz 'https://put-cache-url.com'
exit`

describe('repo:purge-cache', () => {
  let startSpy: ReturnType<typeof vi.spyOn>
  let dynoOpts: {app: string, attach: boolean, command: string}

  beforeEach(() => {
    getCacheURLMock.mockReset()
    putCacheURLMock.mockReset()
    startSpy = vi.spyOn(Dyno.prototype, 'start').mockImplementation(async function (this: Dyno) {
      dynoOpts = this.opts as typeof dynoOpts
    })
  })

  afterEach(() => {
    startSpy.mockRestore()
    vi.clearAllMocks()
  })

  it('should create Dyno with correct configuration', async () => {
    getCacheURLMock.mockResolvedValue('https://get-cache-url.com')
    putCacheURLMock.mockResolvedValue('https://put-cache-url.com')

    await runCommand(Cmd, ['--app', 'myapp'])

    expect(startSpy).toHaveBeenCalledOnce()
    expect(dynoOpts.app).to.equal('myapp')
    expect(dynoOpts.attach).to.equal(true)
    expect(dynoOpts.command).to.equal(commandString)
    expect(dynoOpts.command).toContain('tar -zxf ../repo-cache.tgz "$METADATA"')
    expect(dynoOpts.command).not.toContain('tar -zxf ../repo-cache.tgz\n')
    expect(dynoOpts.command).not.toContain('mktemp')
    expect(dynoOpts.command).not.toContain('cp -rf')
    expect(dynoOpts.command).not.toContain('rm -rf unpack')
  })
})
