import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const httpsGetMock = vi.fn()
const createWriteStreamMock = vi.fn()
const progressMock = vi.fn()
const tickMock = vi.fn()

vi.mock('node:https', async importOriginal => {
  const actual = await importOriginal<typeof import('node:https')>()
  return {
    ...actual,
    default: {...actual.default, get: httpsGetMock},
    get: httpsGetMock,
  }
})

vi.mock('../../src/lib/file-helper.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../../src/lib/file-helper.js')>()
  return {
    ...actual,
    createWriteStream: createWriteStreamMock,
  }
})

vi.mock('smooth-progress', () => ({
  default: progressMock,
}))

const {download} = await import('../../src/lib/download.js')

const testURL = 'https://example.com'
const testPath = '/test/path/file.txt'

// Fake write stream whose 'finish' listener fires immediately so download resolves.
function fakeFileStream() {
  return {
    on(event: string, cb: () => void) {
      if (event === 'finish') cb()
      return this
    },
  }
}

// Fake response that emits a single data chunk so the progress path runs.
function fakeResponse() {
  return {
    headers: {'content-length': '1024'},
    on(event: string, cb: (chunk: string) => void) {
      if (event === 'data') cb('mock-chunk')
      return this
    },
    pipe: vi.fn(),
  }
}

describe('Download Module', () => {
  beforeEach(() => {
    httpsGetMock.mockReset()
    createWriteStreamMock.mockReset()
    progressMock.mockReset()
    tickMock.mockReset()
    progressMock.mockReturnValue({tick: tickMock})
    createWriteStreamMock.mockReturnValue(fakeFileStream())

    httpsGetMock.mockImplementation((_url: string, callback: (res: unknown) => void) => {
      callback(fakeResponse())
      return {on: vi.fn()}
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('download function', () => {
    it('should create write stream with correct path', async () => {
      await download(testURL, testPath, {progress: false})

      expect(createWriteStreamMock).toHaveBeenCalledWith(testPath)
    })
  })

  describe('showProgress function', () => {
    it('should initialize progress bar with correct options', async () => {
      await download(testURL, testPath, {progress: true})

      expect(progressMock).toHaveBeenCalledWith({
        tmpl: 'Downloading... :bar :percent :eta :data',
        total: 1024,
        width: 25,
      })
    })
  })
})
