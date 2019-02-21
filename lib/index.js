'use strict';

const lookupError = require('./lookupError');
const confirm = require('./confirm');
const keypress = require('./keypress');
const archiving = require('./archiving');
const Spawn = require('./spawn');
const spawn = new Spawn({ print: true, logging: 'none' });
const GitActivity = require('./activities/git/');
const MongoActivity = require('./activities/mongo/');
const OpensslActivity = require('./activities/openssl/');

module.exports = {
  _spawnExecutePromised: spawn._spawnExecutePromised.bind(spawn),
  spawnCapture: spawn.spawnCapture.bind(spawn),
  zipDirectory: archiving.zipDirectory,
  confirm,
  keypress,
  lookupError,
  GitActivity,
  MongoActivity,
  OpensslActivity,
};
