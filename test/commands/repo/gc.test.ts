import {runCommand} from '@heroku-cli/test-utils'
import {ux} from '@oclif/core/ux'
import stripAnsi from 'strip-ansi'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const getURLMock = vi.fn()
const putURLMock = vi.fn()
const downloadMock = vi.fn()
const uploadMock = vi.fn()
const execSyncHelperMock = vi.fn()
const mkdtempSyncMock = vi.fn()
const mkdirSyncMock = vi.fn()
const existsSyncMock = vi.fn()
const rmSyncMock = vi.fn()
const tarExtractMock = vi.fn()
const tarCreateMock = vi.fn()

vi.mock('../../../src/lib/repo.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../src/lib/repo.js')>()
  return {
    ...actual,
    getURL: (...args: unknown[]) => getURLMock(...args),
    putURL: (...args: unknown[]) => putURLMock(...args),
  }
})

vi.mock('../../../src/lib/download.js', () => ({
  download: (...args: unknown[]) => downloadMock(...args),
}))

vi.mock('../../../src/lib/upload.js', () => ({
  upload: (...args: unknown[]) => uploadMock(...args),
}))

vi.mock('../../../src/lib/file-helper.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../src/lib/file-helper.js')>()
  return {
    ...actual,
    execSyncHelper: (...args: unknown[]) => execSyncHelperMock(...args),
    existsSync: (...args: unknown[]) => existsSyncMock(...args),
    mkdirSync: (...args: unknown[]) => mkdirSyncMock(...args),
    mkdtempSync: (...args: unknown[]) => mkdtempSyncMock(...args),
    rmSync: (...args: unknown[]) => rmSyncMock(...args),
  }
})

vi.mock('tar', async importOriginal => {
  const actual = await importOriginal<typeof import('tar')>()
  return {
    ...actual,
    create: (...args: unknown[]) => tarCreateMock(...args),
    extract: (...args: unknown[]) => tarExtractMock(...args),
  }
})

const Cmd = (await import('../../../src/commands/repo/gc.js')).default

const originalActionStart = ux.action.start
const originalActionStop = ux.action.stop

const testGetURL = 'https://get-url.com/repo.tgz'
const testPutURL = 'https://put-url.com/repo.tgz'
const testTmpDir = '/tmp/heroku-repo-gc-test123'

describe('repo:gc', () => {
  beforeEach(() => {
    getURLMock.mockReset()
    putURLMock.mockReset()
    downloadMock.mockReset()
    uploadMock.mockReset()
    execSyncHelperMock.mockReset()
    mkdtempSyncMock.mockReset()
    mkdirSyncMock.mockReset()
    existsSyncMock.mockReset()
    rmSyncMock.mockReset()
    tarExtractMock.mockReset().mockResolvedValue({})
    tarCreateMock.mockReset().mockResolvedValue({})

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
    vi.clearAllMocks()
  })

  describe('happy path', () => {
    it('should download, gc, and upload repo successfully', async () => {
      getURLMock.mockResolvedValue(testGetURL)
      putURLMock.mockResolvedValue(testPutURL)
      mkdtempSyncMock.mockReturnValue(testTmpDir)
      downloadMock.mockResolvedValue({})
      execSyncHelperMock.mockReturnValue(Buffer.from('git version 2.39.0'))
      uploadMock.mockResolvedValue({})
      existsSyncMock.mockReturnValue(true)

      await runCommand(Cmd, ['--app', 'myapp'])

      // Verify git check
      expect(execSyncHelperMock.mock.calls[0][0]).to.equal('git --version')

      // Verify download was called
      expect(downloadMock).toHaveBeenCalledOnce()
      expect(downloadMock.mock.calls[0][0]).to.equal(testGetURL)
      expect(downloadMock.mock.calls[0][2]).to.deep.equal({progress: true})

      // Verify tar extract was called
      expect(tarExtractMock).toHaveBeenCalledOnce()

      // Verify git gc was called
      expect(execSyncHelperMock.mock.calls[1][0]).to.equal('git gc --aggressive')

      // Verify tar create was called
      expect(tarCreateMock).toHaveBeenCalledOnce()

      // Verify upload was called
      expect(uploadMock).toHaveBeenCalledOnce()
      expect(uploadMock.mock.calls[0][0]).to.equal(testPutURL)
      expect(uploadMock.mock.calls[0][2]).to.deep.equal({progress: true})

      // Verify cleanup
      expect(rmSyncMock).toHaveBeenCalledOnce()
    })
  })

  describe('git not installed', () => {
    it('should error when git is not installed', async () => {
      getURLMock.mockResolvedValue(testGetURL)
      putURLMock.mockResolvedValue(testPutURL)
      execSyncHelperMock.mockImplementation(() => {
        throw new Error('command not found: git')
      })

      const {error} = await runCommand(Cmd, ['--app', 'myapp'])
      expect(error?.message).to.contain('You don\'t have Git installed on your system. Install Git and try again.')

      // Verify no download/upload happened
      expect(downloadMock).not.toHaveBeenCalled()
      expect(uploadMock).not.toHaveBeenCalled()
    })
  })

  describe('cleanup on error', () => {
    it('should cleanup temp directory on download error', async () => {
      getURLMock.mockResolvedValue(testGetURL)
      putURLMock.mockResolvedValue(testPutURL)
      mkdtempSyncMock.mockReturnValue(testTmpDir)
      execSyncHelperMock.mockReturnValue(Buffer.from('git version 2.39.0'))
      downloadMock.mockRejectedValue(new Error('Download failed'))
      existsSyncMock.mockReturnValue(true)

      const {error} = await runCommand(Cmd, ['--app', 'myapp'])
      expect(error?.message).to.contain('Download failed')

      // Verify cleanup still happened
      expect(rmSyncMock).toHaveBeenCalledOnce()
      expect(rmSyncMock.mock.calls[0][0]).to.equal(testTmpDir)
    })

    it('should cleanup temp directory on git gc error', async () => {
      getURLMock.mockResolvedValue(testGetURL)
      putURLMock.mockResolvedValue(testPutURL)
      mkdtempSyncMock.mockReturnValue(testTmpDir)
      downloadMock.mockResolvedValue({})
      execSyncHelperMock
      .mockReturnValueOnce(Buffer.from('git version 2.39.0'))
      .mockImplementationOnce(() => {
        throw new Error('git gc failed')
      })
      existsSyncMock.mockReturnValue(true)

      const {error} = await runCommand(Cmd, ['--app', 'myapp'])
      expect(error?.message).to.contain('git gc failed')

      // Verify cleanup still happened
      expect(rmSyncMock).toHaveBeenCalledOnce()
    })

    it('should cleanup temp directory on upload error', async () => {
      getURLMock.mockResolvedValue(testGetURL)
      putURLMock.mockResolvedValue(testPutURL)
      mkdtempSyncMock.mockReturnValue(testTmpDir)
      downloadMock.mockResolvedValue({})
      execSyncHelperMock.mockReturnValue(Buffer.from('git version 2.39.0'))
      uploadMock.mockRejectedValue(new Error('Upload failed'))
      existsSyncMock.mockReturnValue(true)

      const {error} = await runCommand(Cmd, ['--app', 'myapp'])
      expect(error?.message).to.contain('Upload failed')

      // Verify cleanup still happened
      expect(rmSyncMock).toHaveBeenCalledOnce()
    })
  })
})
