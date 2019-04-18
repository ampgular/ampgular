/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */


import {
  JsonParseMode, dirname, isJsonObject,
  join, json, logging, normalize, path, relative, resolve,
} from '@angular-devkit/core';
import {
  readFileSync,
} from 'fs';
import * as minimatch from 'minimatch';
import { Schema as AmpgularOptions } from '../lib/config/schema';
import { AmpPage } from '../models/amp-page';
import { AmpgularCommand } from '../models/ampgular-command';
import { BaseCommandOptions, Command } from '../models/command';
import {
  AmpDescription, AmpRoute, Arguments, CommandDescription,
  CommandDescriptionMap, CommandInterface, CommandWorkspace,
  DynamicSchema, StateSchema,
} from '../models/interface';
import { Schema as AmpOptions } from '../schemas/amp';
import { getWorkspaceDetails } from '../utilities/project';
import { getRoutes } from '../utilities/utils';
import { runOptionsBuild } from '../utilities/workspace-extensions';
import { Schema as DeployCommandSchema } from './deploy';
import { Schema as MeCommandSchema } from './me';
import { getCommandDescription } from './deploy-impl';
interface StateMap {

}
interface DynamicMap {

}

export class MeCommand extends AmpgularCommand<MeCommandSchema> {
  public readonly command = 'amp';
  public commandConfigOptions: AmpOptions;
  private ROUTES: string[];
  private _toAmpROUTES: string[];
  private _ampRoutesConfig: AmpRoute[];
  private stateFilesMap: StateMap = {
  };
  private dynamicFilesMap: DynamicMap = {
  };
  private pluginsFilesMap: DynamicMap = {
  };
  private _myPageState: StateSchema;
  private _myPageDynamic: DynamicSchema;
  private _myPagePlugins: any;
  private prerender: CommandInterface;

  public async initialize(options: MeCommandSchema & Arguments): Promise<void> {
    await super.initialize(options);
    this.commandConfigOptions = {
      ...this._ampgularConfig.amp, ...{
        host: this._ampgularConfig.host,
      },
      ...this.overrides,
    } as AmpOptions;
  }

  public async run(options: MeCommandSchema & Arguments): Promise<0 | 1> {
    await super.run(options);

    this.ROUTES = this._getRoutes();

    this._ampRoutesConfig = this._getAmpRoutesConfig();

    this._toAmpROUTES = this.ROUTES.filter(route => {
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

    for (const stateFilePath of this.commandConfigOptions.stateFiles) {
      const stateContent: StateMap = this._readFile(stateFilePath) as StateMap;
      this.stateFilesMap = {
        ...this.stateFilesMap,
        ...stateContent,
      };
    }

    for (const dynamicFilePath of this.commandConfigOptions.dynamicFiles) {
      const dynamicContent: StateMap = this._readFile(
        dynamicFilePath,
      ) as StateMap;
      this.dynamicFilesMap = {
        ...this.dynamicFilesMap,
        ...dynamicContent,
      };
    }

    for (const plugginsFilePath of this.commandConfigOptions.pluginsFiles) {
      const plugginContent: StateMap = this._readFile(
        plugginsFilePath,
      ) as StateMap;
      this.pluginsFilesMap = {
        ...this.dynamicFilesMap,
        ...plugginContent,
      };
    }

    if (this.commandConfigOptions.build) {
      //// run amp build
      await runOptionsBuild(
        { configuration: 'amp', target: this._ampgularConfig.target }, this.logger);
    }


    await this._callPrerender();

    for (const ampRoute of this._toAmpROUTES) {

      // create state associated to Route
      this._myPageState = await this._buildPageStateSpec(ampRoute);

      // create dynamic associated to Route
      this._myPageDynamic = await this._buildDynamicSpec(ampRoute);

      // create pluggin associated to routes
      this._myPagePlugins = await this._buildPluginsSpec(ampRoute);

         ///// Prerender AMP ROUTES


      // create an instance of AMP PAGE
      const myAMPPage = new AmpPage(ampRoute, '');

      myAMPPage.initialize(this.commandConfigOptions,
        this._myPageState, this._myPageDynamic, this._myPagePlugins);

      await myAMPPage.AmpToSpec();


    }


    return 0;
  }

  _getRoutes() {
    return getRoutes(this.basedir);
  }

  _getAmpRoutesConfig() {
    return JSON.parse(
      readFileSync(join(this.basedir, 'ampgular/amp_routes.json')).toString(
        'utf-8',
      ),
    ).ampRoutes;
  }


  _readFile = (path: string): Object => {

    const file = JSON.parse(
      readFileSync(join(normalize(process.cwd()), path)).toString('utf-8'),
    );

    return delete file['$schema'];
  }


  private _buildDynamicSpec = async (route: string): Promise<DynamicSchema> => {
    const dynamic = this.dynamicFilesMap as DynamicSchema;
    const myPageDynamic: DynamicSchema = {};
    Object.keys(dynamic).forEach(singleDynamic => {
      if (
        dynamic[singleDynamic].routes.length == undefined &&
        dynamic[singleDynamic].routes['match'].some((patternAr: string) =>
          minimatch(route, patternAr, {}),
        )
      ) {
        myPageDynamic[singleDynamic] = dynamic[singleDynamic];
      } else if (
        dynamic[singleDynamic].routes['match'].some((patternAr: string) =>
          minimatch(route, patternAr, {}),
        ) &&
        route.split('/').length == dynamic[singleDynamic].routes['length']
      ) {
        myPageDynamic[singleDynamic] = dynamic[singleDynamic];
      }
    });

    return myPageDynamic;
  }


  private _buildPageStateSpec = async (route: string,
  ): Promise<StateSchema> => {
    /// READ STATE
    const state = this.stateFilesMap as StateSchema;
    const myPageState: StateSchema = {};
    Object.keys(state).forEach((singleState: string) => {
      if (
        state[singleState].routes.length == undefined &&
        state[singleState].routes['match'].some((patternAr: string) =>
          minimatch(route as string, patternAr, {}),
        )
      ) {
        myPageState[singleState] = state[singleState];
      } else if (
        state[singleState].routes['match'].some((patternAr: string) =>
          minimatch(route as string, patternAr, {}),
        ) &&
        (route as string).split('/').length ==
        state[singleState].routes['length']
      ) {
        myPageState[singleState] = state[singleState];
      }
    });

    return myPageState;
  }


  private _buildPluginsSpec = async (route: string,
  ): Promise<StateSchema> => {

    const plugin = this.pluginsFilesMap as any;
    const myPagePlugin: any = {};
    Object.keys(plugin).forEach(singlePlugin => {


      if (plugin[singlePlugin].routes.length == undefined && plugin[singlePlugin]
        .routes['match'].some((patternAr: string) =>
          minimatch(route, patternAr, {}))) {
        myPagePlugin[singlePlugin] = plugin[singlePlugin];
      } else if (plugin[singlePlugin].routes['match'].some((patternAr: string) =>
        minimatch(route, patternAr, {})) && route.split('/').length ==
        plugin[singlePlugin].routes['length']) {
        myPagePlugin[singlePlugin] = plugin[singlePlugin];
      }


    });


    return myPagePlugin;

  }


  async _callPrerender() {
    const workspace: CommandWorkspace = getWorkspaceDetails() as CommandWorkspace;
    const descriptionPrerender = await getCommandDescription('prerender', this._registry);
    this.prerender =
      new descriptionPrerender.impl({ workspace }, descriptionPrerender, this.logger);

    return await this.prerender.validateAndRun(
      { configuration: 'amp', target: this._ampgularConfig.target,
        routes: this._toAmpROUTES, path: 'src' });
  }
}
