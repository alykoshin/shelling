const stringUtils = require('./stringUtils');
const Spawn = require('./spawn');


class SimpleActions {

  constructor(actions, options={}) {
    const { beforeEach, afterEach } = options;
    if (!actions) throw new Error('SimpleActions: Expecting actions object');
    this.actions = actions;
    this.beforeEach = beforeEach;
    this.afterEach = afterEach;
    this.spawn = new Spawn({ print: true, logging: 'none' });
  }

  addMethods(object) {
    for (let name in this.actions)
      if (this.actions.hasOwnProperty(name)) {
        if (object[ name ]) throw new Error(`SimpleActions: addMethods: object already has methods named ${name}`);

        object[ name ] = async (context) => await this.do({
          name,
          context,
          result: null ,
        });

      }
  }

  _findAndSanitizeAction(name) {
    let action = this.actions[ name ];
    if (!action) {
      const msg = `Action "${name}" not found`;
      console.error(msg);
      throw new Error(msg);
    }
    if (typeof action === 'string' || Array.isArray(action) ) {
      action = {
        title:   name,
        action,
      }
    }
    return action;
  }

  async _executeActionCommand({
                                action,
                                context,
                                result,
                              }) {
    const command = stringUtils.templateLiteralsLike(action.action, context);
    return await this.spawn._spawnCapturePrint(command)
    //.then(res => ensureFile(context.files[action.out]));
      .then(result => { return result })
      ;
  }

  async _executeActionFn({action, context, result}) {
    const fn = action.action;
    return await fn(context, result)
    //.then(res => ensureFile(context.files[action.out]));
      .then(result => { return result })
      ;
  }

  async _executeAction({
                         name,
                         context,
                         result=null,
                       }) {
    let action = this._findAndSanitizeAction(name);
    if (action.title) console.log(`\n* ${action.title}`);

    if (typeof (this.beforeEach) === 'function') await this.beforeEach({
      action,
      context,
    });

    if (Array.isArray(action.action)) {
      const actionNames = action.action;
      for (let i = 0; i < actionNames.length; i++) {
        await this._executeAction({
          name: actionNames[i],
          context,
          result,
        });
      }

    } else if (typeof action.action === 'string') {
      result = await this._executeActionCommand({ action, context, result });

    } else if (typeof action.action === 'function') {
      result = await this._executeActionFn({ action, context, result });
    }

    if (typeof this.afterEach === 'function') await this.afterEach({
      action,
      context,
      result,
    });

    return result;
  }

  async do({
             name,
             context,
             result=null,
           }) {
    return await this._executeAction({
      name,
      context,
      result,
    });
  }

}

module.exports = SimpleActions;
