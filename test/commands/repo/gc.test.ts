import {expect} from 'chai'
import * as sinon from 'sinon'
import * as proxyquire from 'proxyquire'

import * as download from '../../../src/lib/download'
import * as upload from '../../../src/lib/upload'
import * as repo from '../../../src/lib/repo'
import * as fileHelper from '../../../src/lib/file-helper'
import {runCommand} from '../../run-command'

describe('repo:gc', function () {
  let getURLStub: sinon.SinonStub
  let putURLStub: sinon.SinonStub
  let downloadStub: sinon.SinonStub
  let uploadStub: sinon.SinonStub
  let execSyncHelperStub: sinon.SinonStub
  let mkdtempSyncStub: sinon.SinonStub
  let existsSyncStub: sinon.SinonStub
  let rmSyncStub: sinon.SinonStub
  let tarStub: {
    create: sinon.SinonStub,
    extract: sinon.SinonStub,
  }
  let Cmd: any

  const testGetURL = 'https://get-url.com/repo.tgz'
  const testPutURL = 'https://put-url.com/repo.tgz'
  const testTmpDir = '/tmp/heroku-repo-gc-test123'

  beforeEach(function () {
    getURLStub = sinon.stub(repo, 'getURL')
    putURLStub = sinon.stub(repo, 'putURL')
    downloadStub = sinon.stub(download, 'download')
    uploadStub = sinon.stub(upload, 'upload')
    execSyncHelperStub = sinon.stub(fileHelper, 'execSyncHelper')
    mkdtempSyncStub = sinon.stub(fileHelper, 'mkdtempSync')
    existsSyncStub = sinon.stub(fileHelper, 'existsSync')
    rmSyncStub = sinon.stub(fileHelper, 'rmSync')

    // Create tar stub
    tarStub = {
      extract: sinon.stub().resolves(),
      create: sinon.stub().resolves(),
    }

    // Load command with proxyquire to stub tar
    Cmd = proxyquire.load('../../../src/commands/repo/gc', {
      tar: tarStub,
    }).default
  })

  afterEach(function () {
    sinon.restore()
  })

  describe('happy path', function () {
    it('should download, gc, and upload repo successfully', async function () {
      // Setup stubs
      getURLStub.returns(Promise.resolve(testGetURL))
      putURLStub.returns(Promise.resolve(testPutURL))
      mkdtempSyncStub.returns(testTmpDir)
      downloadStub.returns(Promise.resolve())
      execSyncHelperStub.returns(Buffer.from('git version 2.39.0'))
      uploadStub.returns(Promise.resolve())
      existsSyncStub.returns(true)

      await runCommand(Cmd, ['--app', 'myapp'])

      // Verify git check
      expect(execSyncHelperStub.firstCall.args[0]).to.equal('git --version')

      // Verify download was called
      expect(downloadStub.calledOnce).to.be.true
      expect(downloadStub.firstCall.args[0]).to.equal(testGetURL)
      expect(downloadStub.firstCall.args[2]).to.deep.equal({progress: true})

      // Verify tar extract was called
      expect(tarStub.extract.calledOnce).to.be.true

      // Verify git gc was called
      expect(execSyncHelperStub.secondCall.args[0]).to.equal('git gc --aggressive')

      // Verify tar create was called
      expect(tarStub.create.calledOnce).to.be.true

      // Verify upload was called
      expect(uploadStub.calledOnce).to.be.true
      expect(uploadStub.firstCall.args[0]).to.equal(testPutURL)
      expect(uploadStub.firstCall.args[2]).to.deep.equal({progress: true})

      // Verify cleanup
      expect(rmSyncStub.calledOnce).to.be.true
    })
  })

  describe('git not installed', function () {
    it('should error when git is not installed', async function () {
      getURLStub.returns(Promise.resolve(testGetURL))
      putURLStub.returns(Promise.resolve(testPutURL))
      execSyncHelperStub.throws(new Error('command not found: git'))

      try {
        await runCommand(Cmd, ['--app', 'myapp'])
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).to.contain('You don\'t have Git installed on your system. Install Git and try again.')
      }

      // Verify no download/upload happened
      expect(downloadStub.called).to.be.false
      expect(uploadStub.called).to.be.false
    })
  })

  describe('cleanup on error', function () {
    it('should cleanup temp directory on download error', async function () {
      getURLStub.returns(Promise.resolve(testGetURL))
      putURLStub.returns(Promise.resolve(testPutURL))
      mkdtempSyncStub.returns(testTmpDir)
      execSyncHelperStub.returns(Buffer.from('git version 2.39.0'))
      downloadStub.rejects(new Error('Download failed'))
      existsSyncStub.returns(true)

      try {
        await runCommand(Cmd, ['--app', 'myapp'])
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).to.contain('Download failed')
      }

      // Verify cleanup still happened
      expect(rmSyncStub.calledOnce).to.be.true
      expect(rmSyncStub.firstCall.args[0]).to.equal(testTmpDir)
    })

    it('should cleanup temp directory on git gc error', async function () {
      getURLStub.returns(Promise.resolve(testGetURL))
      putURLStub.returns(Promise.resolve(testPutURL))
      mkdtempSyncStub.returns(testTmpDir)
      downloadStub.returns(Promise.resolve())
      execSyncHelperStub.onFirstCall().returns(Buffer.from('git version 2.39.0'))
      execSyncHelperStub.onSecondCall().throws(new Error('git gc failed'))
      existsSyncStub.returns(true)

      try {
        await runCommand(Cmd, ['--app', 'myapp'])
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).to.contain('git gc failed')
      }

      // Verify cleanup still happened
      expect(rmSyncStub.calledOnce).to.be.true
    })

    it('should cleanup temp directory on upload error', async function () {
      getURLStub.returns(Promise.resolve(testGetURL))
      putURLStub.returns(Promise.resolve(testPutURL))
      mkdtempSyncStub.returns(testTmpDir)
      downloadStub.returns(Promise.resolve())
      execSyncHelperStub.returns(Buffer.from('git version 2.39.0'))
      uploadStub.rejects(new Error('Upload failed'))
      existsSyncStub.returns(true)

      try {
        await runCommand(Cmd, ['--app', 'myapp'])
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).to.contain('Upload failed')
      }

      // Verify cleanup still happened
      expect(rmSyncStub.calledOnce).to.be.true
    })
  })
})
