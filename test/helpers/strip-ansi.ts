import stripAnsi from 'strip-ansi'

export default function (text: string): string {
  return stripAnsi(text).replace(/[»›▸⬢]\s*/gm, '')
}
