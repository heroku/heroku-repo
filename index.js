'use strict'

exports.topic = {
  name: 'repo',
  description: 'repository manipulation'
}

exports.commands = [
  require('./commands/clone'),
  require('./commands/download'),
  require('./commands/gc'),
  require('./commands/purge_cache'),
  require('./commands/download_cache'),
  require('./commands/reset')
]
