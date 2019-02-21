const path = require('path');
//
const SimpleActions = require('../../simpleActions');
const Spawn = require('../../spawn');
//

const MONGO_ACTIONS = {
  _backup:  'mongodump --host ${host} --port ${port}  --out "${dir}"',
  _restore: 'mongorestore --host ${host} --port ${port}  --dir "${dir}" ${ drop ? \"--drop\" : \"\"}',
};


class MongoUtils {

  constructor(options) {
    this.options = options || {};
    this.spawn = Spawn();
    this.simpleActions = new SimpleActions(MONGO_ACTIONS);
    this.simpleActions.addMethods(this);
  }

  _getBackupDir() {
    const nowStr = (new Date()).toISOString();
    return path.join(this.options.dir, nowStr);
  }

  /**
   *
   * @param {String} host
   * @param {Number} port
   * @param {String} dir
   * @returns {Promise<String>}
   * @private
   */
  //async _backup({ host, port, dir }) {
  //  const cmd = `mongodump --host ${host} --port ${port}  --out "${dir}"`;
  //  return await this.spawn._spawnExecutePromised(cmd);
  //}

  async backup() {
    const dir = this._getBackupDir();
    await this._backup({
      host: this.options.host,
      port: this.options.port,
      dir,
    });
    return dir;
  }


  /**
   *
   * @param {String} host
   * @param {Number} port
   * @param {String} dir
   * @param {Boolean} drop
   * @returns {Promise<String>}
   * @private
   */
  //async _restore({ host, port, dir, drop }) {
  //  const dropOption = drop ? '--drop' : '';
  //  const cmd = `mongorestore --host ${host} --port ${port}  --dir "${dir}" "${dropOption}"`;
  //  return await this.spawn._spawnExecutePromised(cmd);
  //}

  async restore(dir) {
    const result = await this._restore({
      host: this.options.host,
      port: this.options.port,
      dir,
      drop: this.options.drop_on_restore,// ? '--drop' : '',
    })
  }

}


module.exports = MongoUtils;
