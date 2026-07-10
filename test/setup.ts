import {settings} from '@oclif/core'
import nock from 'nock'

// Under NODE_ENV=test oclif tries to auto-transpile command source (src/*.ts),
// which the vitest node loader cannot import (ERR_UNKNOWN_FILE_EXTENSION).
// Disable it so command discovery uses the compiled dist/*.js instead.
settings.enableAutoTranspile = false

process.env.HEROKU_API_KEY = 'test-api-key'
process.stdout.columns = 120
process.stderr.columns = 120
nock.disableNetConnect()
