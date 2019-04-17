import {
  Path,
  experimental,
  join,
  logging,
  normalize,
  virtualFs,
} from '@angular-devkit/core';
import { NgClass } from '@angular/common';
import { ApplicationRef, NgZone, enableProdMode } from '@angular/core';
import { renderModuleFactory } from '@angular/platform-server';
import * as child_process from 'child_process';
import { readFileSync } from 'fs';
import 'reflect-metadata';
import 'zone.js/dist/zone-node';
import { Schema as AmpgularSpaceSchema } from '../lib/config/schema';
import { loadJsonFile } from './utils';
const puppeteer = require('puppeteer');
import { test } from 'packages/angular_devkit/core/src/_golden-api';
import { ArgumentOutOfRangeError } from 'rxjs';
import { connectableObservableDescriptor } from 'rxjs/internal/observable/ConnectableObservable';
import { BuildCommand } from '../commands/build-impl';
import {
  Arguments,
  CommandContext,
  CommandDescription,
  CommandScope,
} from '../models/interface';
import { parseArguments } from '../models/parser';
import { Workspace } from '../models/workspace';
import { Launchserver } from './expressserver';
import { webpackRun } from './webpack';
import { getProjectName, runOptionsBuild } from './workspace-extensions';

interface BrowserRenderOptions {
  url: string;
}

export class RenderEngine {
  private _browser: any;
  private _page: any;
  private _target: string;
  private _host: virtualFs.Host<{}>;
  private _ampgularConfig: AmpgularSpaceSchema;
  private _command: string;
  private _logger: logging.Logger;
  private _workspace: Workspace;
  appServerNew: any;
  newCrome: ChromeRenderer;
  _context: CommandContext;
  projectName: any;
  localhost: any;
  _bundlePath: string;
  public _options: any;
  constructor(
    ampgularConfig: AmpgularSpaceSchema,
    host: virtualFs.Host<{}>,
    command: string,
    logger: logging.Logger,
    context: CommandContext,
    workspace: Workspace,
    options: any,
    bundlePath: string,
  ) {
    this._ampgularConfig = ampgularConfig;
    this._target = ampgularConfig.target;
    this._host = host;
    this._command = command;
    this._logger = logger;
    this._context = context;

    this._workspace = workspace;
    this._options = options;
    this._bundlePath = bundlePath;
  }

  public async initialize() {

    const basedir = normalize(process.cwd());


    if (this._options.build) {
      if (this._target == 'browser') {
        await this.runBuildClient();

        return;
      } else {
        await this.runBuildServer();
      }
    }

    if (this._target == 'browser') {
        this.newCrome = new ChromeRenderer();
        // Launchin PUOETTER  FOR ALTER RENDER
        this.appServerNew = await Launchserver();

        await this.newCrome.initialize();
      }


    if (this._target == 'node' && this._options.webpack) {
      //
      await webpackRun('render', this._logger);
      if (this._options.localhost) {
        await webpackRun('server', this._logger);
        const serverClass = require(basedir + '/ampgular/seo/server_webpack');
        this.localhost = new serverClass.ExpressNodeServer();
        await this.localhost.bootstrapServer(this._bundlePath);

        require(basedir + '/ampgular/seo/server_webpack');
      }
    }
    if (this._target == 'node' && this._options.localhost) {
      //
      const serverClass = require(basedir + '/ampgular/seo/server');
      this.localhost = new serverClass.ExpressNodeServer();
      await this.localhost.bootstrapServer(this._bundlePath);

      // await this.renderWepack(basedir + '/ampgular/seo/server')
    }


  }


  async runBuildClient() {
    if (!this.projectName) {
      this.projectName = await getProjectName(this._workspace);
    }

    const newOptions = {
      target: 'browser',
      configuration: this._options.configuration,
      projectName: this.projectName,
    };

    await runOptionsBuild(newOptions, this._logger);
  }

  async runBuildServer() {
    this.projectName = await getProjectName(this._workspace);

    const newOptions = {
      target: 'node',
      configuration: 'seo',
      projectName: this.projectName,
    };

    await runOptionsBuild(newOptions, this._logger);
  }

  public async renderUrl(): Promise<Function> {
    switch (this._target) {
      case 'browser':
        return await this.renderclient();
        break;
      case 'node':

        return await this.renderserver();
        break;
      default:
        return await this.renderclient();
        break;
    }
  }

  async renderserver(): Promise<Function> {
    const basedir = normalize(process.cwd());
    if (this._options.webpack) {

      return require(basedir + '/ampgular/seo/render_webpack').renderserver;
    } else {

      return require(basedir + '/ampgular/seo/render').renderserver;
    }

  }

  async renderclient(): Promise<Function> {

    return async (options: BrowserRenderOptions): Promise<string> => {
      const html = await this.newCrome.render({
        url: 'http://localhost:4200' + options.url,
      });

      return html;
    };
  }

  public async clenUp() {
    switch (this._target) {
      case 'browser':
        this._browser.close();
        this.appServerNew.CloseServer();
        break;
      case 'node':
        if (this._options.localhost) { this.localhost.shutdown(); }
    }
  }
}

class ChromeRenderer {
  private browser: any;
  private page: any;

  public async initialize() {
    this.browser = await puppeteer.launch();
    this.page = await this.browser.newPage();
  }

  public async render(options: BrowserRenderOptions) {
    await this.page.goto(options.url, { waitUntil: 'networkidle2' });

    return await this.page.evaluate(() => document.documentElement.outerHTML);
  }

  async close() {
    this.browser.close();
  }
}

function _exec(
  command: string,
  args: string[],
  opts: { cwd?: string },
  logger: logging.Logger,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const { status, error, stderr, stdout, output } = child_process.spawnSync(
      command,
      args,
      {
        stdio: 'inherit',
        ...opts,
      },
    );

    resolve(output[0]);


    if (status != 0) {
      logger.error(
        `Command failed: ${command} ${args
          .map(x => JSON.stringify(x))
          .join(', ')}`,
      );
      if (error) {
        logger.error('Error: ' + (error ? error.message : 'undefined'));
      } else {
        logger.error(`STDOUT:\n${stdout}`);
        logger.error(`STDERR:\n${stderr}`);
      }
      throw error;
    }
  });
}

 // OLD SPAWN to EXECUTE SERVER
  // async renderWepack(path:string):Promise<boolean> {
  //   const { spawn } = require("child_process");
  //   return new Promise((resolve,reject) =>{
  //     let child = spawn('ts-node',['ampgular/seo/server.ts']);

  //     child.stdout.on("data", (data:any) => {
  //     this._logger.info(data.toString('utf-8'))
  //     resolve(true)

  //     });


  //   })
  // }