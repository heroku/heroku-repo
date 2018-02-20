'use strict'

const cli = require('heroku-cli-util')
const co = require('co')

function * run (context) {
  const fs = require('fs')
  const mkdirp = require('mkdirp')
  const exec = require('child_process').execSync
  const repo = require('../lib/repo')

  let app = context.app
  let url = yield repo.getURL(app)
  let info = yield cli.heroku.get(`/apps/${app}`)

  if (fs.existsSync(app)) {
    cli.error(`${app} already exists in the filesystem. Aborting.`)
    cli.exit(1)
  }

  mkdirp.sync(`${app}/.git`)
  process.chdir(`${app}/.git`)
  exec(`curl '${url}' | tar xzf -`, {stdio: 'inherit'})
  process.chdir('..')
  exec('git init', {stdio: 'inherit'})
  exec('git reset --hard master', {stdio: 'inherit'})
  exec(`git remote add heroku ${info.git_url}`, {stdio: 'inherit'})
}

module.exports = {
  topic: 'repo',
  command: 'clone',
  description: 'set the bare repo for immediate consumption',
  needsAuth: true,
  needsApp: true,
  run: cli.command(co.wrap(run))
}
