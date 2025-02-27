import https from 'https'
import {IncomingMessage} from 'node:http'
import {createWriteStream} from './file-helper'
import {pipeline} from 'node:stream/promises'

const bytes = require('bytes')
const progress = require('smooth-progress')

function showProgress(rsp: IncomingMessage) {
  const bar = progress({
    tmpl: 'Downloading... :bar :percent :eta :data',
    width: 25,
    total: parseInt(rsp.headers['content-length'] as string)
  })
  let total = 0
  rsp.on('data', function (chunk: string) {
    total += chunk.length
    bar.tick(chunk.length, {data: bytes(total)})
  })
}

export function download(url: string, path: string, opts: {progress: boolean}) {
    const file = createWriteStream(path)
    https.get(url, async function (rsp: IncomingMessage) {
      if (opts.progress) showProgress(rsp)
      await pipeline(rsp, file)
    })
}
