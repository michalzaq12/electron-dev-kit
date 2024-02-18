import { webpack } from 'webpack'
import type { Configuration, Compiler, Watching, Stats as WebpackStats } from 'webpack'
import { getBaseConfig, IWebpackConfigBase } from './configBase'
import { getTypescriptConfig, IWebpackConfigTypescript } from './configTypescript'
import { ILogger, Logger, IStep, ILauncher, PipelineError } from '@xpda-dev/core'

export interface IWebpackOptions {
  webpackConfig: Configuration
  logger?: ILogger
  launcher?: ILauncher
}

export class Webpack implements IStep {
  readonly logger: ILogger
  readonly webpackConfig: Configuration
  private compiler: Compiler
  private watching: Watching = null
  private readonly launcher: ILauncher = null

  constructor(options: IWebpackOptions) {
    this.logger = options.logger || new Logger('Webpack', 'olive')
    this.webpackConfig = options.webpackConfig
    this.launcher = options.launcher
  }

  async build(isDev: boolean) {
    this.webpackConfig.mode = isDev ? 'development' : 'production'
    this.webpackConfig.node = {
      __filename: isDev,
      __dirname: isDev,
    } // => resolve paths before compilation in dev and run-time on production
    this.compiler = webpack(this.webpackConfig)
    return isDev ? this.watch() : this.run()
  }

  async terminate() {
    return new Promise<void>(resolve => {
      if (this.watching === null) resolve()
      else
        this.watching.close(() => {
          this.watching = null
          resolve()
        })
    })
  }

  private logStats(stats: WebpackStats) {
    this.logger.info(
      stats.toString({
        colors: true,
        chunks: false,
      })
    )
  }

  private async watch() {
    return new Promise<void>(resolve => {
      this.watching = this.compiler.watch({ ignored: /node_modules/, aggregateTimeout: 3000 }, (err, stats) => {
        if (err) this.logger.error(err.message)
        else {
          this.logStats(stats)
          if (this.launcher) this.launcher.relaunch()
        }
        resolve()
      })
    })
  }

  private async run() {
    return new Promise<void>((resolve, reject) => {
      this.compiler.run((err, stats) => {
        this.logStats(stats)
        if (err || stats.hasErrors()) reject(new PipelineError('Webpack stats contains error'))
        resolve()
      })
    })
  }

  static getBaseConfig(config: IWebpackConfigBase) {
    return getBaseConfig(config)
  }

  static getTypescriptConfig(config: IWebpackConfigTypescript) {
    return getTypescriptConfig(config)
  }
}
