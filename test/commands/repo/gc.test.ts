import {expect} from 'chai'
import * as sinon from 'sinon'

import Cmd from '../../../src/commands/repo/gc'
import Dyno from '../../../src/lib/dyno'
import * as repo from '../../../src/lib/repo'
import {runCommand} from '../../run-command'

describe('repo:gc', function () {
  let getURLStub: sinon.SinonStub
  let putURLStub: sinon.SinonStub
  let dynoStub: sinon.SinonStub
  let dynoOpts: {
    app: string,
    attach: boolean,
    command: string,
  }

  const commandString = `set -e
mkdir -p tmp/repo_tmp/unpack
cd tmp/repo_tmp
curl -fo repo.tgz 'https://get-url.com'
cd unpack
tar -zxf ../repo.tgz
git gc --aggressive
tar -zcf ../repack.tgz .
curl -fo /dev/null --upload-file ../repack.tgz 'https://put-url.com'
exit`

  beforeEach(function () {
    getURLStub = sinon.stub(repo, 'getURL')
    putURLStub = sinon.stub(repo, 'putURL')
    dynoStub = sinon.stub(Dyno.prototype, 'start').callsFake(function () {
      // @ts-expect-error
      dynoOpts = this.opts
      return Promise.resolve()
    })
  })

  afterEach(function () {
    sinon.restore()
  })

  it('should create Dyno with correct configuration', async function () {
    getURLStub.returns(Promise.resolve('https://get-url.com'))
    putURLStub.returns(Promise.resolve('https://put-url.com'))

    await runCommand(Cmd, ['--app', 'myapp'])

    expect(dynoStub.calledOnce).to.be.true
    expect(dynoOpts.app).to.equal('myapp')
    expect(dynoOpts.attach).to.equal(true)
    expect(dynoOpts.command).to.equal(commandString)
  })
})
