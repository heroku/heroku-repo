import {runCommand} from '@heroku-cli/test-utils'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const getURLMock = vi.fn()
const downloadMock = vi.fn()

vi.mock('../../../src/lib/repo.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../src/lib/repo.js')>()
  return {
    ...actual,
    getURL: (...args: unknown[]) => getURLMock(...args),
  }
})

vi.mock('../../../src/lib/download.js', () => ({
  download: (...args: unknown[]) => downloadMock(...args),
}))

const Cmd = (await import('../../../src/commands/repo/download.js')).default

describe('repo:download', () => {
  beforeEach(() => {
    getURLMock.mockReset()
    downloadMock.mockReset()
    downloadMock.mockResolvedValue()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should download repo with default filename', async () => {
    const testUrl = 'https://myapp.com/repo.gz'
    getURLMock.mockResolvedValue(testUrl)

    const {stdout} = await runCommand(Cmd, [
      '--app',
      'myapp',
    ])

    expect(getURLMock).toHaveBeenCalledWith('myapp', expect.anything())
    expect(downloadMock).toHaveBeenCalledWith(testUrl, 'myapp.tar.gz', {progress: true})
    expect(stdout).to.contain('Downloading repository to myapp.tar.gz')
  })

  it('should download repo with custom filename', async () => {
    const testUrl = 'https://myapp.com/repo.gz'
    getURLMock.mockResolvedValue(testUrl)

    const {stdout} = await runCommand(Cmd, [
      'myapp2.tar.gz',
      '--app',
      'myapp',
    ])

    expect(getURLMock).toHaveBeenCalledWith('myapp', expect.anything())
    expect(downloadMock).toHaveBeenCalledWith(testUrl, 'myapp2.tar.gz', {progress: true})
    expect(stdout).to.contain('Downloading repository to myapp2.tar.gz')
  })
})
