import { expect } from 'chai'
import sinon from 'sinon'
import { EventEmitter } from 'events'
import { IncomingMessage } from 'http'
import * as https from 'https'
import {WriteStream} from "node:fs";
import * as fs from "../../src/lib/file-helper"

const proxyquire = require('proxyquire').noCallThru()

describe('Download Module', () => {
  let httpsStub: sinon.SinonStubbedInstance<typeof https>
  let progressStub: sinon.SinonStub
  let writeStreamStub: sinon.SinonStub
  let responseStub: EventEmitter

  const testURL = 'https://example.com'
  const testPath = '/test/path/file.txt'

  beforeEach(() => {
    progressStub = sinon.stub()
    writeStreamStub = sinon.stub(fs, 'createWriteStream').returns(<WriteStream>responseStub)

    responseStub = Object.assign(new EventEmitter(), {
      headers: { 'content-length': '1024' },
      on: sinon.stub().callsFake((event: string, callback: () => void) => {
        if (event === 'data') {
          callback()
        }
        if (event === 'close') {
          callback()
        }
      })
    })

    httpsStub = {
      get: sinon.stub().callsFake((url: string, callback: (res: IncomingMessage) => void) => {
        callback(responseStub as IncomingMessage)
        return responseStub
      })
    } as any
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('download function', () => {
    it('should create write stream with correct path', async () => {
      const downloadWithMocks = proxyquire('../../src/lib/download', {
        'https': httpsStub
      }).download

      await downloadWithMocks(testURL, testPath, {progress: false})

      expect(writeStreamStub.calledWith(testPath)).to.equal(true)
    })
  })

  describe('showProgress function', () => {
    it('should initialize progress bar with correct options', async () => {
      const downloadWithMocks = proxyquire('../../src/lib/download', {
        'smooth-progress': progressStub,
        'https': httpsStub
      }).download

      await downloadWithMocks('https://example.com', '/test/path', { progress: true })

      expect(progressStub.calledWith({
        tmpl: 'Downloading... :bar :percent :eta :data',
        width: 25,
        total: 1024
      })).to.equal(true)
    })
  })
})
