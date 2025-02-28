import https from 'https'
import {IncomingMessage} from 'node:http'
import {pipeline} from 'node:stream/promises'

import {createWriteStream} from './file-helper'

const bytes = require('bytes')
const progress = require('smooth-progress')

function showProgress(rsp: IncomingMessage) {
  const bar = progress({
    tmpl: 'Downloading... :bar :percent :eta :data',
    total: Number.parseInt(rsp.headers['content-length'] as string, 10),
    width: 25,
  })
  let total = 0
  rsp.on('data', (chunk: string) => {
    total += chunk.length
    bar.tick(chunk.length, {data: bytes(total)})
  })
}

export function download(url: string, path: string, opts: {progress: boolean}) {
  const file = createWriteStream(path)
  https.get(url, async (rsp: IncomingMessage) => {
    if (opts.progress) showProgress(rsp)
    await pipeline(rsp, file)
  })
}
