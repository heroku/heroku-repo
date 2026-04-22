import https from 'https'
import {createReadStream, statSync} from 'fs'
import {IncomingMessage} from 'node:http'

const bytes = require('bytes')
const progress = require('smooth-progress')

function showProgress(stats: {size: number}) {
  const bar = progress({
    tmpl: 'Uploading... :bar :percent :eta :data',
    total: stats.size,
    width: 25,
  })
  let total = 0
  return (chunk: Buffer | string) => {
    const length = typeof chunk === 'string' ? chunk.length : chunk.length
    total += length
    bar.tick(length, {data: bytes(total)})
  }
}

export async function upload(url: string, path: string, opts: {progress: boolean}) {
  const stats = statSync(path)
  const fileStream = createReadStream(path)
  const urlObj = new URL(url)

  return new Promise<void>((resolve, reject) => {
    const options: https.RequestOptions = {
      method: 'PUT',
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'Content-Length': stats.size,
      },
    }

    const req = https.request(options, (rsp: IncomingMessage) => {
      if (rsp.statusCode && rsp.statusCode >= 200 && rsp.statusCode < 300) {
        resolve()
      } else {
        reject(new Error(`Failed to upload: ${rsp.statusCode}`))
      }
    })

    req.on('error', reject)

    if (opts.progress) {
      const updateProgress = showProgress(stats)
      fileStream.on('data', updateProgress)
    }

    fileStream.pipe(req)
    fileStream.on('error', reject)
  })
}
