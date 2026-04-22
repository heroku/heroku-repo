import {expect} from 'chai'
import {EventEmitter} from 'events'
import {ClientRequest, IncomingMessage} from 'http'
import * as https from 'https'
import {WriteStream} from 'node:fs'
import proxyquire from 'proxyquire'
import sinon from 'sinon'

import * as fs from '../../src/lib/file-helper'

describe('Download Module', function () {
  let httpsStub: sinon.SinonStubbedInstance<typeof https>
  let progressStub: sinon.SinonStub
  let writeStreamStub: sinon.SinonStub
  let responseStub: EventEmitter

  const testURL = 'https://example.com'
  const testPath = '/test/path/file.txt'

  beforeEach(async function () {
    progressStub = sinon.stub().callsFake(() => {
      return {
        tick: sinon.stub(),
      }
    })
    writeStreamStub = sinon.stub(fs, 'createWriteStream')

    responseStub = Object.assign(new EventEmitter(), {
      headers: {'content-length': '1024'},
      on: sinon.stub().callsFake((event: string, callback: (data?: string) => void) => {
        if (event === 'data') {
          callback('')
        }

        if (event === 'finish') {
          callback()
        }
      }),
      pipe: sinon.stub(),
    })

    httpsStub = {
      get: sinon.stub().callsFake((_url: string, callback: (res: IncomingMessage) => void) => {
        callback(responseStub as IncomingMessage)
        return responseStub as ClientRequest
      }),
    } as sinon.SinonStubbedInstance<typeof https>
  })

  afterEach(function () {
    sinon.restore()
  })

  describe('download function', function () {
    it('should create write stream with correct path', async function () {
      const downloadWithMocks = proxyquire('../../src/lib/download', {
        https: httpsStub,
      }).download
      writeStreamStub.returns(responseStub as WriteStream)

      await downloadWithMocks(testURL, testPath, {progress: false})

      expect(writeStreamStub.calledWith(testPath)).to.equal(true)
    })
  })

  describe('showProgress function', function () {
    it('should initialize progress bar with correct options', async function () {
      const downloadWithMocks = proxyquire('../../src/lib/download', {
        https: httpsStub,
        'smooth-progress': progressStub,
      }).download
      writeStreamStub.returns(responseStub as WriteStream)

      await downloadWithMocks(testURL, testPath, {progress: true})

      expect(progressStub.calledWith({
        tmpl: 'Downloading... :bar :percent :eta :data',
        total: 1024,
        width: 25,
      })).to.equal(true)
    })
  })
})
