'use strict'

exports.topic = {
  name: 'repo',
  description: 'slug manipulation'
}

exports.commands = [
  require('./commands/download'),
  require('./commands/gc'),
  require('./commands/purge_cache'),
  require('./commands/reset')
]
