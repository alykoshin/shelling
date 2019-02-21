const stringUtils = require('./stringUtils');
const Spawn = require('./spawn');


class SimpleActions {

  constructor(actions) {
    if (!actions) throw new Error('SimpleActions: Expecting actions object');
    this.actions = actions;
    this.spawn = new Spawn({ print: true, logging: 'none' });
  }

  addMethods(object) {
    for (let name in this.actions)
      if (this.actions.hasOwnProperty(name)) {
        if (object[ name ]) throw new Error(`SimpleActions: addMethods: object already has methods named ${name}`);
        object[ name ] = async (context) => {
          console.log(`\n* `, context);
          return await this.do(name, context);
        }
      }
  }

  _findAndPrepareAction(name, context) {
    const action = this.actions[ name ];
    if (!action) {
      const msg = `Action "${name}" not found`;
      console.error(msg);
      throw new Error(msg);
    }
    if (typeof action === 'string') {
      return {
        title:   name,
        command: stringUtils.templateLiteralsLike(action, context),
      }
    } else {
      action.command = stringUtils.templateLiteralsLike(action.action, context);
      return action;
    }
  }

  async do(name, context) {
    const action = this._findAndPrepareAction(name, context);
    if (action.title) console.log(`\n* ${action.title}`);
    return this.spawn._spawnCapturePrint(action.command)
      //.then(res => ensureFile(context.files[action.out]));
      .then(result => { return { action, result} })
    ;


  }

}

module.exports = SimpleActions;
