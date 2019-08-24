type WritableStream = NodeJS.WritableStream
import { Writable } from 'stream'
import { Console } from 'console'
import { ILogger, IPipelineLogger } from '../index'

export class Logger implements ILogger {
  public stdout: WritableStream
  private ignoreFunction: Function
  private pipelineLogger: IPipelineLogger
  private errorLogger: Console

  private buffer: Array<Buffer> = []

  constructor(readonly name: string, readonly color: string) {
    this.initStream()
    this.errorLogger = new Console(this.stdout)
  }

  private initStream() {
    const self = this
    this.stdout = new Writable({
      write(chunk, encoding, callback) {
        self.buffer.push(chunk)
        if (chunk.toString().includes('\n')) {
          self.info(Buffer.concat(self.buffer).toString(encoding === 'buffer' ? undefined : encoding))
          self.buffer = []
        }
        callback()
      },
    })
    this.stdout.on('finish', () => {
      // Reopen stream
      // This statement is needed because unpipe method close all streams
      // what causes an error 'write after end' while electron relaunching
      this.initStream()
    })
  }

  info(text: string) {
    if (this.ignoreFunction !== undefined && this.ignoreFunction(text)) return
    this.pipelineLogger.log(this.name, this.color, text)
  }

  error(text: Error | string) {
    this.errorLogger.error(text)
  }

  ignore(ignoreFunc) {
    this.ignoreFunction = ignoreFunc
  }

  setPipelineLogger(pipelineLogger: IPipelineLogger) {
    this.pipelineLogger = pipelineLogger
  }
}
