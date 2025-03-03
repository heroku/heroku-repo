import nock from 'nock'

globalThis.setInterval = () => ({unref: () => {}})
const tm = globalThis.setTimeout
globalThis.setTimeout = cb => {
  return tm(cb)
}

process.stdout.columns = 120                    // Set screen width for consistent wrapping
process.stderr.columns = 120                    // Set screen width for consistent wrapping

nock.disableNetConnect()
