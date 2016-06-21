'use strict'

const cli = require('heroku-cli-util')
const co = require('co')

function * run (context) {
  const download = require('../lib/download')
  const app = context.app

  let releases = yield cli.heroku.request({
    path: `/apps/${app}/releases`,
    headers: {Range: 'version ..; order=desc'}
  })
  let id = releases.filter((r) => r.slug)[0].slug.id
  let slug = yield cli.heroku.get(`/apps/${app}/slugs/${id}`)
  let filename = context.args.filename || `${app}-repo.tgz`
  console.error(`Downloading slug to ${filename}`)
  yield download(slug.blob.url, filename, {progress: true})
}

module.exports = {
  topic: 'repo',
  command: 'download',
  description: 'download the repo',
  needsAuth: true,
  needsApp: true,
  args: [{name: 'filename', optional: true}],
  run: cli.command(co.wrap(run))
}
