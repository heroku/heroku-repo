'use strict'

const cli = require('heroku-cli-util')
const co = require('co')

function * run (context, heroku) {
  let r = heroku.request({
    method: 'DELETE',
    path: `/${context.app}.git`,
    host: `git.${context.gitHost}`,
    parseJSON: false
  })

  yield cli.action(`Resetting Git repository for ${cli.color.app(context.app)}`, r)
}

module.exports = {
  topic: 'repo',
  command: 'reset',
  description: 'reset the repo',
  needsAuth: true,
  needsApp: true,
  run: cli.command(co.wrap(run))
}
