
import {
    getSystemPath,
    join,
    json,
    logging,
    normalize,
    virtualFs,

  } from '@angular-devkit/core';
import * as child_process from 'child_process';
import { readFileSync } from 'fs';
import { Schema as AmpgularConfig } from '../lib/config/schema';
import { Arguments } from '../models/interface';
import { Workspace } from '../models/workspace';
import { WorkspaceLoader } from '../models/workspace-loader';
import { Schema as BuildOptions } from '../schemas/build';


export async function loadWorkspaceAndAmpgular(
  workspacePath: string, host: virtualFs.Host,
  registry: json.schema.CoreSchemaRegistry): Promise<[Workspace, AmpgularConfig ]> {

    const workspaceLoader = new WorkspaceLoader(host, registry);
    const workspace = await workspaceLoader.loadWorkspace(workspacePath);

    const basedir = getSystemPath(workspace.root);
    const ampgularPath = join(normalize(basedir), 'ampgular', 'ampgular.json');
    // const ampgularConfig = await loadJsonFile(
    //   ampgularPath,
    //   host,
    // ).toPromise();

    const ampgularConfig = JSON.parse(
      readFileSync(ampgularPath).toString('utf-8')) as AmpgularConfig;

    return [workspace , ampgularConfig ];
  }

export async function getProjectName(workspace: Workspace): Promise<string> {
    const maybeProjectNames = workspace.listProjectNames();
    let projectName;
    switch (maybeProjectNames.length) {
      case 0:
        throw new Error(`No projects founds in workspace`);
        break;
      case 1:
        projectName = maybeProjectNames[0];
        break;
      default:
        const defaultProjectName = workspace.getDefaultProjectName();
        const projectNameFilter = maybeProjectNames.filter(
          name => name == defaultProjectName,
        );
        switch (projectNameFilter.length) {
          case 1:
           projectName = projectNameFilter[0];
           break;
          default:
          throw new Error(`No default project found in workspace`);
          break;
        }
    }

    return projectName;

  }

export async function runOptionsBuild(
  options: any, logger: logging.Logger ): Promise<0|1> {

    if (options.target == 'node') {

      logger.warn(`....starting BUILDDING SERVER APPLICATON..... this may take several minutes`);
      logger.warn(`Target is ${options.target}  configuration is ${options.configuration} `);

      await _exec('ng', ['run', options.projectName + ':server',
                        '--configuration=' + options.configuration], {}, logger);

      if(options.configuration == 'amp'){
       // await _exec('npm',['run', 'node-sass',join(normalize(process.cwd()),'src/styles.scss'), '-o', join(normalize(process.cwd()),'dist/amp/css')],{},logger)
      }


      return  0;

  } else {
    logger.warn(`....starting BUILDDING CLEINT APPLICATON..... this may take several minutes`);
    logger.warn(`Target is ${options.target}  configuration is ${options.configuration} `);
    await _exec('ng', ['build', '--configuration=' + options.configuration], {}, logger);

    return 0;
  }
  }

function _exec(
    command: string,
    args: string[],
    opts: { cwd?: string },
    logger: logging.Logger,
  ): Promise<string> {
    return new Promise((resolve) => {
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
