import bytes from 'bytes'
import {IncomingMessage} from 'node:http'
import https from 'node:https'
import progress from 'smooth-progress'

import {createWriteStream} from './file-helper.js'

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

export async function download(url: string, path: string, opts: {progress: boolean}) {
  const fileStream = createWriteStream(path)

  return new Promise<void>((resolve, reject) => {
    const req = https.get(url, (rsp: IncomingMessage) => {
      if (opts.progress) {
        showProgress(rsp)
      }

      rsp.on('error', (err: Error) => {
        reject(err)
      })

      rsp.pipe(fileStream)
    })

    req.on('error', reject)
    fileStream.on('error', reject)
    fileStream.on('finish', () => {
      resolve()
    })
  })
}
