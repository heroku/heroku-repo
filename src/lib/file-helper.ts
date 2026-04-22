import {ExecSyncOptions, execSync} from 'child_process'
import * as fs from 'fs'

export const existsSync = (path: string) => fs.existsSync(path)
export const mkdirSync = (path: string, options: fs.MakeDirectoryOptions) => fs.mkdirSync(path, options)
export const mkdtempSync = (prefix: string) => fs.mkdtempSync(prefix)
export const rmSync = (path: string, options?: fs.RmOptions) => fs.rmSync(path, options)
export const execSyncHelper = (command: string, options: ExecSyncOptions) => execSync(command, options)
export const createWriteStream = (path: string) => fs.createWriteStream(path)
