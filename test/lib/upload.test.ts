import type {OutgoingHttpHeaders} from 'node:http'
import type * as https from 'node:https'

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const httpsRequestMock = vi.fn()
const statSyncMock = vi.fn()
const createReadStreamMock = vi.fn()
const progressMock = vi.fn()
const tickMock = vi.fn()

vi.mock('node:https', async importOriginal => {
  const actual = await importOriginal<typeof import('node:https')>()
  return {
    ...actual,
    default: {...actual, request: httpsRequestMock},
    request: httpsRequestMock,
  }
})

vi.mock('node:fs', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    createReadStream: createReadStreamMock,
    statSync: statSyncMock,
  }
})

vi.mock('smooth-progress', () => ({
  default: progressMock,
}))

const {upload} = await import('../../src/lib/upload.js')

const testURL = 'https://example.com/upload?token=abc123'
const testPath = '/test/path/file.txt'
const testFileSize = 2048

// Fake read stream that captures listeners and fires 'end' when piped so upload resolves.
function fakeReadStream() {
  const listeners: Record<string, (chunk?: Buffer | string) => void> = {}
  return {
    on(event: string, cb: (chunk?: Buffer | string) => void) {
      listeners[event] = cb
      if (event === 'data') cb(Buffer.from('test'))
      return this
    },
    pipe() {
      listeners.end?.()
      return this
    },
  }
}

describe('Upload Module', () => {
  beforeEach(() => {
    httpsRequestMock.mockReset()
    statSyncMock.mockReset()
    createReadStreamMock.mockReset()
    progressMock.mockReset()
    tickMock.mockReset()
    progressMock.mockReturnValue({tick: tickMock})
    statSyncMock.mockReturnValue({size: testFileSize})
    createReadStreamMock.mockReturnValue(fakeReadStream())

    httpsRequestMock.mockImplementation((_options: https.RequestOptions, callback: (res: unknown) => void) => {
      callback({statusCode: 200})
      return {on: vi.fn()}
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('upload function', () => {
    it('creates a read stream with correct path', async () => {
      await upload(testURL, testPath, {progress: false})

      expect(createReadStreamMock).toHaveBeenCalledWith(testPath)
    })

    it('makes a PUT request with correct options', async () => {
      await upload(testURL, testPath, {progress: false})

      expect(httpsRequestMock).toHaveBeenCalledOnce()
      const callArgs = httpsRequestMock.mock.calls[0][0] as https.RequestOptions
      expect(callArgs.method).to.equal('PUT')
      expect(callArgs.hostname).to.equal('example.com')
      expect(callArgs.path).to.equal('/upload?token=abc123')
      const headers = callArgs.headers as OutgoingHttpHeaders
      expect(headers['Content-Length']).to.equal(testFileSize)
    })
  })

  describe('showProgress function', () => {
    it('initializes the progress bar with correct options', async () => {
      await upload(testURL, testPath, {progress: true})

      expect(progressMock).toHaveBeenCalledWith({
        tmpl: 'Uploading... :bar :percent :eta :data',
        total: testFileSize,
        width: 25,
      })
    })

    it('doesn\'t show progress when progress option is false', async () => {
      await upload(testURL, testPath, {progress: false})

      expect(progressMock).not.toHaveBeenCalled()
    })
  })
})
