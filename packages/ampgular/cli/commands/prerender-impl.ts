/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Path, basename, dirname, join, normalize, resolve, terminal } from '@angular-devkit/core';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import minimatch = require('minimatch');
import { runInThisContext } from 'vm';
import { prepareCss } from '../helpers-seo/optimize-css';
import { BaseCommandOptions } from '../models/command';
import { AmpRoute, Arguments } from '../models/interface';
import { RenderCommand } from '../models/render-command';
import { Configuration, Schema as PrerenderOptions } from '../schemas/prerender';
import { getRoutes } from '../utilities/utils';
import { Schema as PrerenderCommandSchema } from './prerender';
import { Mode } from '../schemas/amp';
import { ExpressServer } from '../utilities/expressserver';
const open = require('open');

export class PrerenderCommand<T extends BaseCommandOptions = BaseCommandOptions>
  extends RenderCommand<PrerenderCommandSchema> {
  public readonly command = 'prerender';
  private _commandptions: PrerenderOptions;
  private ROUTES: string[];
  private _ampRoutesConfig: AmpRoute[];
  private PRERENDER_PATH: Path;
  private _cssString:string;
  appServerNew: ExpressServer;
  public async run(options: PrerenderOptions & Arguments): Promise<number> {
    this.commandConfigOptions = {
      ...{ mode: 'render' },
      ...this._ampgularConfig.prerender as PrerenderOptions,
      ...this.commandConfigOptions, ...this.overrides
    } as PrerenderOptions;
    await super.run(options);
    await this.validateAndLaunch();


    if (this.commandConfigOptions.routes != undefined) {
      this.ROUTES = this.commandConfigOptions.routes;
    } else {
      this.ROUTES = this._getRoutes();
      if (this.commandConfigOptions.configuration == Configuration.Amp) {
        this._ampRoutesConfig = this._getAmpRoutesConfig();
        this.ROUTES = this.ROUTES.filter(route => {
          return this._ampRoutesConfig.some((config: AmpRoute) => {
            if (config['length'] == undefined) {
              return config['match'].some((patternAr: string) =>
                minimatch(route, patternAr, {}),
              );
            } else {
              return (
                config['match'].some((patternAr: string) =>
                  minimatch(route, patternAr, {}),
                ) && route.split('/').length == config['length']
              );
            }
          });
        });
      }

    }


    if (this.commandConfigOptions.configuration == Configuration.Amp) {
      this.PRERENDER_PATH = this.AMP_PATH;
    } else {
      if (this.commandConfigOptions.mode == Mode.Deploy) {
        this.PRERENDER_PATH = this.PUBLIC_PATH;
      } else {
        this.PRERENDER_PATH = this.SERVER_PATH;
      }


    }


    this.logger.info(`Starting Prerendering of ${this.ROUTES.length} routes/paths`);


    if (!existsSync(this.PRERENDER_PATH)) {
      mkdirSync(this.PRERENDER_PATH);
    }
    let i = 1;

    if (this.commandConfigOptions.configuration != 'amp') {

    if (this.commandConfigOptions.mode == 'deploy') {
      this._cssString =  readFileSync(join(this.PUBLIC_PATH, 'styles.css')).toString();
    }
      this._cssString =  readFileSync(join(this.PRERENDER_PATH, 'styles.css')).toString();
    }



    for (const route of this.ROUTES) {

      let html = await this.renderUrl(route);

        html = await prepareCss(html,this.commandConfigOptions.cssOptimize,
          this._cssString,this.commandConfigOptions.mode as Mode, this.commandConfigOptions.configuration);

      /// writing index
      if (route == '' || route == '/') {
        this._prepareWriting(route, 'index.html', html);
      } else if ((this.commandConfigOptions as PrerenderOptions).namedFiles) {

        const nameFile = basename(normalize(route));
        const routeSplit = route.split('/');
        routeSplit.pop();
        const newRoute = routeSplit.join('/');
        this._prepareWriting(newRoute, nameFile + '.html', html);
      } else {
        this._prepareWriting(route, 'index.html', html);
      }
      this.loggingSameLine(terminal.blue(`Rendering Path  number ${i}: ${route}`));

      i++;

    }

    if (this.ROUTES.length>0 && this.commandConfigOptions.serve && this.commandConfigOptions.mode == Mode.Render) {

      if (this.commandConfigOptions.configuration== 'amp'){
        this.appServerNew = new ExpressServer(normalize('dist/amp'));
        await this.appServerNew.LaunchServer();
      }
      else {
        this.appServerNew = new ExpressServer(normalize('dist/server'));
        await this.appServerNew.LaunchServer();
      }
      await open('http://localhost:5000');

      return 55;
    }



    return 0;
  }

  _getRoutes() {
    return getRoutes(this.basedir);
  }

  _prepareWriting(route: string, nameFile: string, html: string) {
    this._ensuredirp(join(this.PRERENDER_PATH, normalize(route)));
    this._writefile(join(this.PRERENDER_PATH, normalize(route), nameFile), html);

  }

  _writefile(p: string, html: string) {
    writeFileSync(
      p,
      html,
    );
  }

  _ensuredirp(p: string) {
    while (!existsSync(p)) {
      this._mkdirp(p);
    }
  }

  _mkdirp(p: string) {
    // Create parent folder if necessary.
    if (!existsSync(dirname(normalize(p)))) {
      this._mkdirp(dirname(normalize(p)));
    }
    if (!existsSync(p)) {
      mkdirSync(p);
    }
  }

  _getAmpRoutesConfig() {
    return JSON.parse(
      readFileSync(join(this.basedir, 'ampgular/amp/amp_routes.json')).toString(
        'utf-8',
      ),
    ).ampRoutes;
  }

}
