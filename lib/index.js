'use strict';

const confirm = require('./confirm');
const keypress = require('./keypress');
const archiving = require('./archiving');
const Spawn = require('./spawn');
const spawn = new Spawn({ print: true, logging: 'none' });


module.exports = {
  _spawnExecutePromised: spawn._spawnExecutePromised.bind(spawn),
  spawnCapture: spawn.spawnCapture.bind(spawn),
  zipDirectory: archiving.zipDirectory,
  confirm: confirm.confirm,
  keypress: keypress.keypress,
};
