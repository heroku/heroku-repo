import {HTTP} from '@heroku/http-call'
import color from '@heroku-cli/color'
import {APIClient} from '@heroku-cli/command'
import {IOptions} from '@heroku-cli/command/lib/api-client'
import {Notification, notify} from '@heroku-cli/notifications'
import {Dyno as APIDyno} from '@heroku-cli/schema'
import {ux} from '@oclif/core'
import {spawn} from 'child_process'
import debugFactory from 'debug'
import * as https from 'https'
import * as net from 'net'
import {Duplex, Transform} from 'stream'
import * as tls from 'tls'
import * as tty from 'tty'
import {URL, parse} from 'url'

const debug = debugFactory('heroku:run')
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(() => resolve(), ms))

function buildEnvFromFlag(flag: string) {
  const env = {}
  for (const v of flag.split(';')) {
    const m = v.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    // @ts-expect-error
    if (m) env[m[1]] = m[2]
    else ux.warn(`env flag ${v} appears invalid. Avoid using ';' in values.`)
  }

  return env
}

interface HerokuApiClientRun extends APIClient {
  options: {
    rejectUnauthorized?: boolean;
  } & IOptions;
}

interface DynoOpts {
  app: string;
  attach?: boolean;
  command: string;
  dyno?: string;
  env?: string;
  'exit-code'?: boolean;
  heroku: APIClient;
  listen?: boolean;
  'no-tty'?: boolean;
  notify?: boolean;
  showStatus?: boolean;
  size?: string;
  type?: string;
}

export default class Dyno extends Duplex {
  dyno?: APIDyno

  heroku: HerokuApiClientRun

  input: any

  legacyUri?: {[key: string]: any}

  p: any

  reject?: (reason?: any) => void

  resolve?: (value?: unknown) => void

  unpipeStdin: any

  uri?: URL

  useSSH: any

  private _notified?: boolean

  private _startedAt?: number

  constructor(public opts: DynoOpts) {
    super()
    this.cork()
    this.opts = opts
    this.heroku = opts.heroku

    if (this.opts.showStatus === undefined) {
      this.opts.showStatus = true
    }
  }

  // Attaches stdin/stdout to dyno
  attach() {
    this.pipe(process.stdout)
    if (this.dyno && this.dyno.attach_url) {
      this.uri = new URL(this.dyno.attach_url)
      this.legacyUri = parse(this.dyno.attach_url)
    }

    this.p = this._useSSH ? this._ssh() : this._rendezvous()

    return this.p.then(() => {
      this.end()
    })
  }

  /**
   * Starts the dyno
   */
  async start() {
    this._startedAt = Date.now()
    if (this.opts.showStatus) {
      ux.action.start(`Running ${color.cmd(this.opts.command)} on ${color.app(this.opts.app)}`)
    }

    await this._doStart()
  }

  _connect() {
    return new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject

      // @ts-expect-error
      const options: { rejectUnauthorized?: boolean } & https.RequestOptions = this.legacyUri
      options.headers = {Connection: 'Upgrade', Upgrade: 'tcp'}
      options.rejectUnauthorized = false
      const r = https.request(options)
      r.end()

      r.on('error', this.reject)
      r.on('upgrade', (_, remote) => {
        const s = net.createServer(client => {
          client.on('end', () => {
            s.close()
            // @ts-expect-error
            this.resolve()
          })
          client.on('connect', () => s.close())

          client.on('error', () => this.reject)
          remote.on('error', () => this.reject)

          client.setNoDelay(true)
          remote.setNoDelay(true)

          remote.on('data', (data: any) => client.write(data))
          client.on('data', data => remote.write(data))
        })

        s.listen(0, 'localhost', () => this._handle(s))
        // abort the request when the local pipe server is closed
        s.on('close', () => {
          r.abort()
        })
      })
    })
  }

  async _doStart(retries = 2): Promise<HTTP<unknown> | undefined> {
    const command = this.opts['exit-code'] ? `${this.opts.command}; echo "\uFFFF heroku-command-exit-status: $?"` : this.opts.command

    try {
      const dyno = await this.heroku.post(this.opts.dyno ? `/apps/${this.opts.app}/dynos/${this.opts.dyno}` : `/apps/${this.opts.app}/dynos`, {
        body: {
          attach: this.opts.attach,
          command,
          env: this._env(),
          force_no_tty: this.opts['no-tty'],
          size: this.opts.size,
          type: this.opts.type,
        },
        headers: {
          Accept: 'application/vnd.heroku+json; version=3.sdk',
        },
      })
      // @ts-expect-error
      this.dyno = dyno.body
      if (this.opts.attach || this.opts.dyno) {
        // @ts-expect-error
        if (this.dyno.name && this.opts.dyno === undefined) {
          // @ts-expect-error
          this.opts.dyno = this.dyno.name
        }

        await this.attach()
      } else if (this.opts.showStatus) {
        ux.action.stop(this._status('done'))
      }
    } catch (error: any) {
      // Currently the runtime API sends back a 409 in the event the
      // release isn't found yet. API just forwards this response back to
      // the client, so we'll need to retry these. This usually
      // happens when you create an app and immediately try to run a
      // one-off dyno. No pause between attempts since this is
      // typically a very short-lived condition.
      if (error.statusCode === 409 && retries > 0) {
        return this._doStart(retries - 1)
      }

      throw error
    } finally {
      ux.action.stop()
    }
  }

  _env() {
    const c: {[key: string]: any} = this.opts.env ? buildEnvFromFlag(this.opts.env) : {}
    c.TERM = process.env.TERM
    if (tty.isatty(1)) {
      c.COLUMNS = process.stdout.columns
      c.LINES = process.stdout.rows
    }

    return c
  }

  _handle(localServer: net.Server) {
    const addr = localServer.address() as net.AddressInfo
    const host = addr.address
    const {port} = addr
    let lastErr = ''

    // does not actually uncork but allows error to be displayed when attempting to read
    this.uncork()
    if (this.opts.listen) {
      ux.log(`listening on port ${host}:${port} for ssh client`)
    } else {
      const params = [host, '-p', port.toString(), '-oStrictHostKeyChecking=no', '-oUserKnownHostsFile=/dev/null', '-oServerAliveInterval=20']

      // Debug SSH
      if (this._isDebug()) {
        params.push('-vvv')
      }

      const stdio: Array<('pipe' | number)> = [0, 1, 'pipe']
      if (this.opts['exit-code']) {
        stdio[1] = 'pipe'
        if (process.stdout.isTTY) {
          // force tty
          params.push('-t')
        }
      }

      const sshProc = spawn('ssh', params, {stdio})

      // only receives stdout with --exit-code
      if (sshProc.stdout) {
        sshProc.stdout.setEncoding('utf8')
        sshProc.stdout.on('data', this._readData())
      }

      sshProc.stderr?.on('data', data => {
        lastErr = data.toString()

        // suppress host key and permission denied messages
        const messages = [
          "Warning: Permanently added '[127.0.0.1]",
        ]

        const killMessages = [
          'too many authentication failures',
          'No more authentication methods to try',
          'Permission denied (publickey).',
        ]
        if (this._isDebug() || [...killMessages, ...messages].some(message => data.includes(message))) {
          process.stderr.write(data)
        }

        if (killMessages.some(message => data.includes(message))) {
          sshProc.kill()
          localServer.close()
          this.reject?.(lastErr)
        }
      })
      sshProc.on('close', () => {
        // there was a problem connecting with the ssh key
        if (lastErr.length > 0 && lastErr.includes('Permission denied')) {
          const msgs = ['There was a problem connecting to the dyno.']
          if (process.env.SSH_AUTH_SOCK) {
            msgs.push('Confirm that your ssh key is added to your agent by running `ssh-add`.')
          }

          msgs.push('Check that your ssh key has been uploaded to heroku with `heroku keys:add`.')
          // eslint-disable-next-line unicorn/no-array-push-push
          msgs.push(`See ${color.url('https://devcenter.heroku.com/articles/one-off-dynos#shield-private-spaces')}`)
          ux.error(msgs.join('\n'))
        }

        // cleanup local server
        localServer.close()
      })
      this.p
        .then(() => sshProc.kill())
        .catch(() => sshProc.kill())
    }

    this._notify()
  }

  _isDebug() {
    const debug = process.env.HEROKU_DEBUG
    return debug && (debug === '1' || debug.toUpperCase() === 'TRUE')
  }

  _notify() {
    try {
      if (this._notified) return
      this._notified = true
      if (!this.opts.notify) return
      // only show notifications if dyno took longer than 20 seconds to start
      // @ts-expect-error
      if (Date.now() - this._startedAt < 1000 * 20) return

      const notification: { subtitle?: string } & Notification = {
        message: 'dyno is up',
        subtitle: `heroku run ${this.opts.command}`,
        title: this.opts.app,
        // sound: true
      }

      notify(notification)
    } catch (error: any) {
      ux.warn(error)
    }
  }

  _read() {
    if (this.useSSH) {
      throw new Error('Cannot read stream from ssh dyno')
    }
    // do not need to do anything to handle Readable interface
  }

  _readData(c?: tls.TLSSocket) {
    let firstLine = true
    return (data: string) => {
      debug('input: %o', data)
      // discard first line
      if (c && firstLine) {
        if (this.opts.showStatus) ux.action.stop(this._status('up'))
        firstLine = false
        this._readStdin(c)
        return
      }

      this._notify()

      // carriage returns break json parsing of output
      if (!process.stdout.isTTY) {
        // eslint-disable-next-line no-control-regex, prefer-regex-literals
        data = data.replaceAll(new RegExp('\r\n', 'g'), '\n')
      }

      const exitCode = data.match(/\uFFFF heroku-command-exit-status: (\d+)/m)
      if (exitCode) {
        debug('got exit code: %d', exitCode[1])
        this.push(data.replace(/^\uFFFF heroku-command-exit-status: \d+$\n?/m, ''))
        const code = Number.parseInt(exitCode[1], 10)
        if (code === 0) {
          // @ts-expect-error
          this.resolve()
        } else {
          const err: { exitCode?: number } & Error = new Error(`Process exited with code ${color.error(code.toString())}`)
          err.exitCode = code
          // @ts-expect-error
          this.reject(err)
        }

        return
      }

      this.push(data)
    }
  }

  _readStdin(c: tls.TLSSocket) {
    this.input = c
    const {stdin} = process
    stdin.setEncoding('utf8')

    // without this the CLI will hang on rake db:migrate
    // until a character is pressed
    if (stdin.unref) {
      stdin.unref()
    }

    if (!this.opts['no-tty'] && tty.isatty(0)) {
      stdin.setRawMode(true)
      stdin.pipe(c)
      let sigints: any[] = []
      stdin.on('data', c => {
        if (c.toString() === '\u0003') {
          sigints.push(Date.now())
        }

        sigints = sigints.filter(d => d > Date.now() - 1000)

        if (sigints.length >= 4) {
          ux.error('forcing dyno disconnect', {exit: 1})
        }
      })
    } else {
      stdin.pipe(new Transform({
        // eslint-disable-next-line unicorn/no-hex-escape
        flush: done => c.write('\x04', done),
        objectMode: true,
        transform: (chunk, _, next) => c.write(chunk, next),
      }))
    }

    this.uncork()
  }

  _rendezvous() {
    return new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject

      if (this.opts.showStatus) {
        ux.action.status = this._status('starting')
      }

      // @ts-expect-error
      const c = tls.connect(Number.parseInt(this.uri.port, 10), this.uri.hostname, {
        rejectUnauthorized: this.heroku.options.rejectUnauthorized,
      })
      c.setTimeout(1000 * 60 * 60)
      c.setEncoding('utf8')
      c.on('connect', () => {
        debug('connect')
        // @ts-expect-error eslint-disable-next-line no-unsafe-optional-chaining
        const pathnameWithSearchParams = this.uri.pathname + this.uri.search
        c.write(pathnameWithSearchParams.slice(1) + '\r\n', () => {
          if (this.opts.showStatus) {
            ux.action.status = this._status('connecting')
          }
        })
      })
      c.on('data', this._readData(c))
      c.on('close', () => {
        debug('close')
        // @ts-expect-error
        this.opts['exit-code'] ? this.reject('No exit code returned') : this.resolve()
        if (this.unpipeStdin) {
          this.unpipeStdin()
        }
      })
      c.on('error', this.reject)
      c.on('timeout', () => {
        debug('timeout')
        c.end()
        // @ts-expect-error
        this.reject(new Error('timed out'))
      })
      process.once('SIGINT', () => c.end())
    })
  }

  async _ssh(retries = 20): Promise<unknown> {
    const interval = 1000

    try {
      const {body: dyno} = await this.heroku.get(`/apps/${this.opts.app}/dynos/${this.opts.dyno}`)
      // @ts-expect-error
      this.dyno = dyno
      // @ts-expect-error
      ux.action.stop(this._status(this.dyno.state))

      // @ts-expect-error
      if (this.dyno.state === 'starting' || this.dyno.state === 'up') {
        return this._connect()
      }

      await wait(interval)
      return this._ssh()
    } catch (error: any) {
      // the API sometimes responds with a 404 when the dyno is not yet ready
      if (error.http.statusCode === 404 && retries > 0) {
        return this._ssh(retries - 1)
      }

      throw error
    }
  }

  _status(status: string | undefined) {
    // @ts-expect-error
    const size = this.dyno.size > 0 ? ` (${this.dyno.size})` : ''
    // @ts-expect-error
    return `${status}, ${this.dyno.name || this.opts.dyno}${size}`
  }

  get _useSSH() {
    if (this.uri) {
      /* tslint:disable:no-http-string */
      return this.uri.protocol === 'http:' || this.uri.protocol === 'https:'
      /* tslint:enable:no-http-string */
    }
  }

  _write(chunk: any, encoding: any, callback: any) {
    if (this.useSSH) {
      throw new Error('Cannot write stream to ssh dyno')
    }

    if (!this.input) throw new Error('no input')
    this.input.write(chunk, encoding, callback)
  }
}
