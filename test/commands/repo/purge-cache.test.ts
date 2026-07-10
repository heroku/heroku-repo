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
tar -zxf ../repo-cache.tgz
METADATA="vendor/heroku"
if [ -d "$METADATA" ]; then
  TMPDIR=\`mktemp -d\`
  cp -rf $METADATA $TMPDIR
fi
cd ..
rm -rf unpack
mkdir unpack
cd unpack
TMPDATA="$TMPDIR/heroku"
VENDOR="vendor"
if [ -d "$TMPDATA" ]; then
  mkdir $VENDOR
  cp -rf $TMPDATA $VENDOR
  rm -rf $TMPDIR
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
  })
})
