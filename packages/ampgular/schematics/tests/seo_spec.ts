/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
// import { Schema as ApplicationOptions, Style } from '../application/schema';
// import { Schema as WorkspaceOptions } from '../workspace/schema';
// import { Schema as UniversalOptions } from './schema';

describe('Seo Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@ampgular/seo',
    require.resolve('../seo/collection.json'),
  );
  const defaultOptions: any = {
    // clientProject: 'bar',
  };


  const workspaceOptions: any = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '6.0.0',

  };

  const appOptions: any = {
    name: 'bar',
    inlineStyle: false,
    inlineTemplate: false,
    routing: false,
    style: 'css',
    skipTests: false,
    skipPackageJson: false,

  };

  const initialWorkspaceAppOptions: any = {
    name: 'workspace',
    projectRoot: '',
    inlineStyle: false,
    inlineTemplate: false,
    routing: false,
    style: 'css',
    skipTests: false,
    skipPackageJson: false,

  };

  let appTree: UnitTestTree;

  beforeEach(() => {
    appTree = schematicRunner.runExternalSchematic
    ('@schematics/angular', 'workspace', workspaceOptions);
    appTree = schematicRunner.runExternalSchematic
    ('@schematics/angular', 'application', initialWorkspaceAppOptions, appTree);
    appTree = schematicRunner.runExternalSchematic
    ('@schematics/angular', 'application', appOptions, appTree);

    // const configText = appTree.readContent('angular.json');
    // const config = JSON.parse(configText);
    // config.defaultProject = "bar";
    // appTree.overwrite('angular.json', JSON.stringify(config, null, 2));

  });


  // it('should configure properly the ampgular.json file', (done) => {
  //     defaultOptions.target = 'browser';
  //     defaultOptions.clientProject = 'bar';

  //     schematicRunner.runSchematicAsync('ng-add', defaultOptions, appTree)
  //     .toPromise().then(tree => {
  //     const configText = tree.readContent('/ampgular/ampgular.json');
  //     const configAmpgular = JSON.parse(configText);
  //     const targetConfig = configAmpgular.target;
  //     expect(targetConfig).toEqual('browser');
  //     done();
  //   }, done.fail);
  // });

  it('should add the enviroment files to the angular.json file', (done) => {
    defaultOptions.target = 'browser';
    defaultOptions.clientProject = 'bar';
    const tree = schematicRunner.runSchematic('ng-add', defaultOptions, appTree);
    const configText = tree.readContent('angular.json');
    const configAmpgular = JSON.parse(configText);

    const configurations = configAmpgular.projects.bar.architect.build.configurations;
    expect(configurations.seo).toBeDefined();
    expect(configurations.seo.fileReplacements).toBeDefined();
    const fileReplacements = configurations.seo.fileReplacements;
    expect(fileReplacements.length).toEqual(1);
    expect(fileReplacements[0].replace).toEqual('src/environments/environment.ts');
    expect(fileReplacements[0].with).toEqual('src/environments/environment.seo.ts');
    done();

});

// it('should add the seo configuration flag to environment.prod.ts', (done) => {
//   defaultOptions.target = "node";
//   defaultOptions.clientProject = 'bar';
//   const tree = schematicRunner.runSchematic('ng-add', defaultOptions, appTree)
//   const envProd= tree.readContent('src/environment/environment.server.ts');
//   const enProdConfig = JSON.parse(envProd);
//   expect(enProdConfig.seo).toBeDefined();
//   expect(enProdConfig.seo).toBeFalsy();


//   const envSeo= tree.readContent('src/environment/environment.seo.ts');
//   const enSeoConfig = JSON.parse(envSeo);
//   expect(enSeoConfig.seo).toBeDefined();
//   expect(enSeoConfig.seo).toBeTruthy();


//   done();

// });


});

describe('Seo Interface with Universal', () => {
  const schematicRunner = new SchematicTestRunner(
    '@ampgular/seo',
    require.resolve('../seo/collection.json'),
  );
  const defaultOptions: any = {

  };


  const workspaceOptions: any = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '6.0.0',

  };

  const appOptions: any = {
    name: 'bar',
    inlineStyle: false,
    inlineTemplate: false,
    routing: false,
    style: 'css',
    skipTests: false,
    skipPackageJson: false,

  };

  const initialWorkspaceAppOptions: any = {
    name: 'workspace',
    projectRoot: '',
    inlineStyle: false,
    inlineTemplate: false,
    routing: false,
    style: 'css',
    skipTests: false,
    skipPackageJson: false,

  };

  let appTree: UnitTestTree;

  beforeEach(() => {
    appTree = schematicRunner.runExternalSchematic('@schematics/angular', 'workspace', workspaceOptions);
    appTree = schematicRunner.runExternalSchematic('@schematics/angular', 'application', initialWorkspaceAppOptions, appTree);
    appTree = schematicRunner.runExternalSchematic('@schematics/angular', 'application', appOptions, appTree);

    // const configText = appTree.readContent('angular.json');
    // const config = JSON.parse(configText);
    // config.defaultProject = "bar";
    // appTree.overwrite('angular.json', JSON.stringify(config, null, 2));

  });

  it('should throw when no clientproject provided and not default in congif', () => {
   const myDefaultOptions = {
    target: 'browser',
  };
   const configText = appTree.readContent('angular.json');
   const config = JSON.parse(configText);
   delete config.defaultProject;
   appTree.overwrite('angular.json', JSON.stringify(config, null, 2));


   expect((() => schematicRunner.runSchematic('ng-add', myDefaultOptions, appTree))).toThrow();
});


  it('should no throw when no clientproject provided but default is existing', () => {
  const myDefaultOptions = {
   target: 'node',
 };
  const configText = appTree.readContent('angular.json');
  const config = JSON.parse(configText);
  config.defaultProject = 'bar';
  appTree.overwrite('angular.json', JSON.stringify(config, null, 2));


  expect((() => schematicRunner.runSchematic('ng-add', myDefaultOptions, appTree))).not.toThrow();
});


});
