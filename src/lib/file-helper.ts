import * as fs from 'fs';
import {execSync, ExecSyncOptions} from 'child_process';

export const existsSync = (path: string) => fs.existsSync(path)
export const mkdirSync = (path: string, options: fs.MakeDirectoryOptions) => fs.mkdirSync(path, options)
export const execSyncHelper = (command: string, options: ExecSyncOptions) => execSync(command, options)
export const createWriteStream = (path: string) => fs.createWriteStream(path)
