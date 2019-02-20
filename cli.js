#!/usr/bin/env node
'use strict';

var argv = require('minimist')(process.argv.slice(2));
var pkg = require('./package.json');
var shelling = require('./');
var {lookup } = require('./lib/lookupError');
var {gen_certs } = require('./lib/genSelfSignedCerts');


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
    '    node node_modules/' + pkg.name + '/cli.js gen_certs ./demo/config.json',
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
    const res = await gen_certs(process.argv[3]);
    //console.log('*', res);
    process.exit(0);

  } else if (process.argv[ 2 ] === 'lookup') {
    const code = process.argv[ 3 ];
    console.log('*', lookup(code));
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
  }
}

handleArgv();

//var main = require('./');
//
//main.exec(argv[0], function() {
//
//});
