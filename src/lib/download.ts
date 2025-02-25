import fs from 'fs'
import https from 'https'
import {pipeline} from "node:stream";
import {IncomingMessage} from "node:http";

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

export function download(url: string, path: string, opts: {progress: boolean}): Promise<void> {
  return new Promise(function (resolve, reject) {
    const file = fs.createWriteStream(path)
    https.get(url, function (rsp) {
      if (opts.progress) showProgress(rsp)
      pipeline(rsp, file)
    })
  })
}
