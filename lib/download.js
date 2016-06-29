'use strict'

function showProgress (rsp) {
  const progress = require('smooth-progress')
  const bytes = require('bytes')

  let bar = progress({
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

function download (url, path, opts) {
  const fs = require('fs')
  const https = require('https')

  return new Promise(function (resolve, reject) {
    let file = fs.createWriteStream(path)
    https.get(url, function (rsp) {
      if (opts.progress) showProgress(rsp)
      rsp.pipe(file)
        .on('error', reject)
        .on('close', resolve)
    })
  })
}

module.exports = download
