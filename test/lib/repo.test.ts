import {APIClient} from '@heroku-cli/command'
import {Config} from '@oclif/core'
import {expect} from 'chai'
import nock from 'nock'

import {getCacheURL, getURL, putCacheURL, putURL} from '../../src/lib/repo'

export const getConfig = async () => {
  const pjsonPath = require.resolve('../../package.json')
  const conf = new Config({root: pjsonPath})
  await conf.load()
  return conf
}

export const getHerokuAPI = async () => {
  const conf = await getConfig()
  return new APIClient(conf)
}

const metadataResponse = {
  app: {
    id: '123',
    name: 'myapp',
  },
  cache_delete_url: 'https://cache-delete-url.com',
  cache_get_url: 'https://cache-get-url.com',
  cache_put_url: 'https://cache-put-url.com',
  repo_delete_url: 'https://repo-delete-url.com',
  repo_get_url: 'https://repo-get-url.com',
  repo_put_url: 'https://repo-put-url.com',
}
describe('repo helper commands', function () {
  let api: nock.Scope
  let herokuAPI: APIClient

  beforeEach(async function () {
    api = nock('https://api.heroku.com')
      .get('/apps/myapp/build-metadata')
      .reply(200, metadataResponse)

    herokuAPI = await getHerokuAPI()
  })

  afterEach(function () {
    api.done()
    nock.cleanAll()
  })

  describe('getURL', function () {
    it('should return the repo_get_url', async function () {
      const url = await getURL('myapp', herokuAPI)
      expect(url).to.equal('https://repo-get-url.com')
    })
  })

  describe('putURL', function () {
    it('should return the repo_put_url', async function () {
      const url = await putURL('myapp', herokuAPI)
      expect(url).to.equal('https://repo-put-url.com')
    })
  })

  describe('getCacheURL', function () {
    it('should return the cache_get_url', async function () {
      const url = await getCacheURL('myapp', herokuAPI)
      expect(url).to.equal('https://cache-get-url.com')
    })
  })

  describe('putCacheURL', function () {
    it('should return the cache_put_url', async function () {
      const url = await putCacheURL('myapp', herokuAPI)
      expect(url).to.equal('https://cache-put-url.com')
    })
  })
})
