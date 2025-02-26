import {expect} from 'chai'
import * as sinon from 'sinon'
import Cmd from '../../../src/commands/repo/purge-cache'
import {runCommand} from '../../run-command'
import * as repo from '../../../src/lib/repo'
import Dyno from '../../../src/lib/dyno'

describe('repo:purge-cache', function () {
  let getURLStub: sinon.SinonStub
  let putURLStub: sinon.SinonStub
  let dynoStub: sinon.SinonStub
  let dynoOpts: {
    app: string,
    command: string,
    attach: boolean,
  }

  const commandString = `set -e
mkdir -p tmp/repo_tmp/unpack
cd tmp/repo_tmp
curl -fo repo-cache.tgz 'https://get-url.com'
cd unpack
tar -zxf ../repo-cache.tgz
METADATA="vendor/heroku"
if [ -d "$METADATA" ]; then
  TMPDIR=\`mktemp -d\`
  cp -rf $METADATA $TMPDIR
fi
cd ..
rm -rf unpack
mkdir unpack
cd unpack
TMPDATA="$TMPDIR/heroku"
VENDOR="vendor"
if [ -d "$TMPDATA" ]; then
  mkdir $VENDOR
  cp -rf $TMPDATA $VENDOR
  rm -rf $TMPDIR
fi
tar -zcf ../cache-repack.tgz .
curl -fo /dev/null --upload-file ../cache-repack.tgz 'https://put-url.com'
exit`

  beforeEach(function () {
    getURLStub = sinon.stub(repo, 'getURL')
    putURLStub = sinon.stub(repo, 'putURL')
    dynoStub = sinon.stub(Dyno.prototype, 'start').callsFake(function () {
      // @ts-ignore
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
