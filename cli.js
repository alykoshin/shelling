#!/usr/bin/env node
'use strict';

const path = require('path');
const argv = require('minimist')(process.argv.slice(2));

const pkg = require('./package.json');
const shelling = require('./');


function help() {
  console.log([
    '',
    '  Package name: ' + pkg.name,
    '',
    '  Package description: ' + pkg.description,
    '',
    '  Example:',
    '    node node_modules/' + pkg.name + '/cli.js',
    '',
    '  spawn:',
    '    node node_modules/' + pkg.name + '/cli.js spawn {command}',
    '  lookup:',
    '    node node_modules/' + pkg.name + '/cli.js lookup NOENT',
    '  gen_certs:',
    '    node node_modules/' + pkg.name + '/cli.js gen_certs ./demo/gen-certs-config.json',
    '  keypress:',
    '    node node_modules/' + pkg.name + '/cli.js keypress "Press any key"',
    '  confirm:',
    '    node node_modules/' + pkg.name + '/cli.js keypress "Confirm [Y/N]?"',
    '',
    '  mongo backup:',
    '    node node_modules/' + pkg.name + '/cli.js mongo backup ./demo/mongo-backup.json',
    '  mongo backup+restore:',
    '    node node_modules/' + pkg.name + '/cli.js mongo backup ./demo/mongo-backup.json ./demo/mongo-restore.json',
    '  mongo restore:',
    '    node node_modules/' + pkg.name + '/cli.js mongo restore ./demo/mongo-restore.json ',
    '',
  ].join('\n'));
}

function version() {
  console.log([
    '* version info:',
    '* package.json version: ' + pkg.version,
    '* process.version: ' + process.version,
    ''
  ].join('\n'));
}

async function handleArgv() {
  if (argv.h || argv.help) {
    help();
    process.exit(0);
  } else if (argv.v || argv.version) {
    version();
    process.exit(0);

  } else if (process.argv[ 2 ] === 'gen_certs') {
    const opensslActivity = new shelling.OpensslActivity();
    const res = await opensslActivity.gen_certs(process.argv[3]);
    //console.log('*', res);
    process.exit(0);

  } else if (process.argv[ 2 ] === 'git') {
    const gitActivity = new shelling.GitActivity();
    const action = process.argv[3];
    if (!action) throw new Error('Expecting GitActivity action');
    if (!gitActivity[action]) throw new Error('Invalid GitActivity action');
    let args = {};
    try {
      //console.log('process.argv[4]:', process.argv[4])
      args = JSON.parse(process.argv[ 4 ]);
    } catch(e) {}
    const res = await gitActivity[ action ](args);
    console.log('* RESULT:', res);
    process.exit(0);

  } else if (process.argv[ 2 ] === 'lookup') {
    const code = process.argv[ 3 ];
    console.log('* RESULT:', shelling.lookupError(code));
    process.exit(0);

  } else if (process.argv[ 2 ] === 'keypress') {
    const msg = process.argv[ 3 ] || 'Press any key...';
    console.log('* RESULT:', await shelling.keypress(msg));
    process.exit(0);

  } else if (process.argv[ 2 ] === 'confirm') {
    const msg = process.argv[ 3 ] || 'Confirm [Y/N]?';
    console.log('* RESULT:', await shelling.confirm(msg));
    process.exit(0);

  } else if (process.argv[2] === 'mongo' && process.argv[3] === 'backup') {
    const backupConfigFile = process.argv[4];
    const backupConfig = require(path.resolve(backupConfigFile));
    const mongoUtils = new shelling.MongoActivity(backupConfig);

    const backupDir = await mongoUtils.backup();

    if (process.argv[5]) {
      if (await shelling.confirm('Restore [Y/N]?')) {
        const restoreConfigFile = process.argv[ 5 ];
        const restoreConfig     = require(path.resolve(restoreConfigFile));
        const mongoUtils        = new shelling.MongoActivity(restoreConfig);

        await mongoUtils.restore(backupDir);
      } else {
        console.log('Skipped');
      }
    }

    process.exit(0);

  } else if (process.argv[2] === 'mongo' && process.argv[3] === 'restore') {
    const configFile = process.argv[4];
    const config = require(path.resolve(configFile));
    const mongoUtils = new shelling.MongoActivity(config);

    await mongoUtils.restore();
    process.exit(0);

  } else if (process.argv[ 2 ] === 'spawn') {
    const cmd = process.argv.slice(3);
    console.log('* COMMAND: "' + cmd + '"');
    await shelling.spawnCapture(cmd)
      .then(result => {
        console.log('* RESULT: "' + result + '"');
        process.exit(0);
      })
      .catch(e => {
        console.log('* ERROR:');
        if (e.code) {
          const description = lookup(e.code);
          if (!description.notFound) {
            console.error('* ' + description.short);
            console.error('* ' + description.long);
          }
        }
        console.error('* ', e);
        process.exit(-1);
      })
    ;
  } else {
    throw new Error('Invalid command');
  }
}

handleArgv();

//var main = require('./');
//
//main.exec(argv[0], function() {
//
//});
