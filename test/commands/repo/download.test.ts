import {expect} from 'chai'
import {stdout} from 'stdout-stderr'
import nock from 'nock'
import * as sinon from 'sinon'
import Cmd from '../../../src/commands/repo/download'
import {runCommand} from '../../run-command'
import * as repo from '../../../src/lib/repo'
import * as download from '../../../src/lib/download'

describe('repo:download', function () {
  let api: nock.Scope
  let getURLStub: sinon.SinonStub
  let downloadStub: sinon.SinonStub

  beforeEach(function () {
    api = nock('https://api.heroku.com')
    getURLStub = sinon.stub(repo, 'getURL')
    downloadStub = sinon.stub(download, 'download')
  })

  afterEach(function () {
    api.done()
    nock.cleanAll()
    sinon.restore()
  })

  it('should download repo with default filename', async function () {
    const testUrl = 'https://myapp.com/repo.gz'
    getURLStub.withArgs('myapp').returns(Promise.resolve(testUrl))
    downloadStub.withArgs(testUrl, 'myapp.gz', {progress: true}).returns(Promise.resolve())

    await runCommand(Cmd, [
      '--app',
      'myapp'
    ])

    expect(getURLStub.calledWith('myapp')).to.be.true
    expect(downloadStub.called).to.be.true
    expect(stdout.output).to.contain('Downloading repository to myapp.tar.gz')
  })

  it('should download repo with custom filename', async function () {
    const testUrl = 'https://myapp.com/repo.gz'
    getURLStub.withArgs('myapp').returns(Promise.resolve(testUrl))
    downloadStub.withArgs(testUrl, 'myapp.tar.gz', {progress: true}).returns(Promise.resolve())

    await runCommand(Cmd, [
      'myapp2.tar.gz',
      '--app',
      'myapp',
    ])

    expect(getURLStub.calledWith('myapp')).to.be.true
    expect(downloadStub.called).to.be.true
    expect(stdout.output).to.contain('Downloading repository to myapp2.tar.gz')
  })
})
