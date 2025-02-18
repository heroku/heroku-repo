import * as bytes from 'bytes'
import fs from 'fs'
import https from 'https'

const progress = require('smooth-progress')

function showProgress(rsp) {
  const bar = progress({
    tmpl: 'Downloading... :bar :percent :eta :data',
    width: 25,
    total: parseInt(rsp.headers['content-length'])
  })
  let total = 0
  rsp.on('data', function (chunk) {
    total += chunk.length
    bar.tick(chunk.length, {data: bytes(total)})
  })
}

export default function download(url: string, path: string, opts) {
  return new Promise(function (resolve, reject) {
    const file = fs.createWriteStream(path)
    https.get(url, function (rsp) {
      if (opts.progress) showProgress(rsp)
      rsp.pipe(file)
        .on('error', reject)
        .on('close', resolve)
    })
  })
}
