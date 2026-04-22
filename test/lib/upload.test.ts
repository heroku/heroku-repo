import {expect} from 'chai'
import {EventEmitter} from 'events'
import {ClientRequest, IncomingMessage} from 'http'
import * as https from 'https'
import {ReadStream} from 'node:fs'
import sinon from 'sinon'
import proxyquire from 'proxyquire'

describe('Upload Module', function () {
  let httpsStub: sinon.SinonStubbedInstance<typeof https>
  let progressStub: sinon.SinonStub
  let statSyncStub: sinon.SinonStub
  let createReadStreamStub: sinon.SinonStub
  let readStreamStub: EventEmitter
  let requestStub: EventEmitter
  let responseStub: EventEmitter

  const testURL = 'https://example.com/upload?token=abc123'
  const testPath = '/test/path/file.txt'
  const testFileSize = 2048

  beforeEach(async function () {
    progressStub = sinon.stub().callsFake(() => {
      return {
        tick: sinon.stub(),
      }
    })

    statSyncStub = sinon.stub().returns({size: testFileSize})

    readStreamStub = Object.assign(new EventEmitter(), {
      on: sinon.stub().callsFake(function (this: any, event: string, callback: (data?: Buffer | string) => void) {
        this.listeners = this.listeners || {}
        this.listeners[event] = callback
        if (event === 'data') {
          // Simulate data chunk
          callback(Buffer.from('test'))
        }

        return this
      }),
      pipe: sinon.stub().callsFake(function (this: any) {
        // Simulate successful pipe
        if (this.listeners && this.listeners.end) {
          this.listeners.end()
        }

        return this
      }),
    })

    requestStub = Object.assign(new EventEmitter(), {
      on: sinon.stub().returnsThis(),
    })

    responseStub = Object.assign(new EventEmitter(), {
      statusCode: 200,
    })

    createReadStreamStub = sinon.stub().returns(readStreamStub as ReadStream)

    httpsStub = {
      request: sinon.stub().callsFake((_options: https.RequestOptions, callback: (res: IncomingMessage) => void) => {
        callback(responseStub as IncomingMessage)
        return requestStub as ClientRequest
      }),
    } as sinon.SinonStubbedInstance<typeof https>
  })

  afterEach(function () {
    sinon.restore()
  })

  describe('upload function', function () {
    it('creates a read stream with correct path', async function () {
      const uploadWithMocks = proxyquire('../../src/lib/upload', {
        https: httpsStub,
        fs: {
          statSync: statSyncStub,
          createReadStream: createReadStreamStub,
        },
      }).upload

      await uploadWithMocks(testURL, testPath, {progress: false})

      expect(createReadStreamStub.calledWith(testPath)).to.equal(true)
    })

    it('makes a PUT request with correct options', async function () {
      const uploadWithMocks = proxyquire('../../src/lib/upload', {
        https: httpsStub,
        fs: {
          statSync: statSyncStub,
          createReadStream: createReadStreamStub,
        },
      }).upload

      await uploadWithMocks(testURL, testPath, {progress: false})

      expect(httpsStub.request.calledOnce).to.equal(true)
      const callArgs = httpsStub.request.firstCall.args[0] as https.RequestOptions
      expect(callArgs.method).to.equal('PUT')
      expect(callArgs.hostname).to.equal('example.com')
      expect(callArgs.path).to.equal('/upload?token=abc123')
      expect(callArgs.headers?.['Content-Length']).to.equal(testFileSize)
    })
  })

  describe('showProgress function', function () {
    it('initializes the progress bar with correct options', async function () {
      const uploadWithMocks = proxyquire('../../src/lib/upload', {
        https: httpsStub,
        'smooth-progress': progressStub,
        fs: {
          statSync: statSyncStub,
          createReadStream: createReadStreamStub,
        },
      }).upload

      await uploadWithMocks(testURL, testPath, {progress: true})

      expect(progressStub.calledWith({
        tmpl: 'Uploading... :bar :percent :eta :data',
        total: testFileSize,
        width: 25,
      })).to.equal(true)
    })

    it('doesn\'t show progress when progress option is false', async function () {
      const uploadWithMocks = proxyquire('../../src/lib/upload', {
        https: httpsStub,
        'smooth-progress': progressStub,
        fs: {
          statSync: statSyncStub,
          createReadStream: createReadStreamStub,
        },
      }).upload

      await uploadWithMocks(testURL, testPath, {progress: false})

      expect(progressStub.called).to.equal(false)
    })
  })
})
