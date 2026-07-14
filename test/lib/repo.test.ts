import {APIClient} from '@heroku-cli/command'
import {Config} from '@oclif/core'
import nock from 'nock'
import {fileURLToPath} from 'node:url'
import {
  afterEach, beforeEach, describe, expect, it,
} from 'vitest'

import {
  getCacheURL, getURL, putCacheURL, putURL,
} from '../../src/lib/repo.js'

const root = fileURLToPath(new URL('../../', import.meta.url))

const getHerokuAPI = async () => {
  const config = await Config.load(root)
  return new APIClient(config)
}

describe('repo helper commands', () => {
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

  let api: nock.Scope
  let herokuAPI: APIClient

  beforeEach(async () => {
    api = nock('https://api.heroku.com')
    .get('/apps/myapp/build-metadata')
    .reply(200, metadataResponse)

    herokuAPI = await getHerokuAPI()
  })

  afterEach(() => {
    api.done()
    nock.cleanAll()
  })

  describe('getURL', () => {
    it('should return the repo_get_url', async () => {
      const url = await getURL('myapp', herokuAPI)
      expect(url).to.equal('https://repo-get-url.com')
    })
  })

  describe('putURL', () => {
    it('should return the repo_put_url', async () => {
      const url = await putURL('myapp', herokuAPI)
      expect(url).to.equal('https://repo-put-url.com')
    })
  })

  describe('getCacheURL', () => {
    it('should return the cache_get_url', async () => {
      const url = await getCacheURL('myapp', herokuAPI)
      expect(url).to.equal('https://cache-get-url.com')
    })
  })

  describe('putCacheURL', () => {
    it('should return the cache_put_url', async () => {
      const url = await putCacheURL('myapp', herokuAPI)
      expect(url).to.equal('https://cache-put-url.com')
    })
  })
})
