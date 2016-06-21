'use strict'

exports.topic = {
  name: 'repo',
  description: 'slug manipulation'
}

exports.commands = [
  require('./commands/purge_cache'),
  require('./commands/gc'),
  require('./commands/download')
]
