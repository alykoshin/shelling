const Spawn = require('../../spawn');
const SimpleActions = require('../../simpleActions');


const GIT_ACTIONS = {
  queryClean:      'git status --untracked-files=no --porcelain',
  queryCommitHash: 'git rev-parse --short HEAD',
  queryBranch:     'git rev-parse --abbrev-ref HEAD',
  checkoutBranch:  'git checkout "${branch}"',
  add:             'git add "${filename}"',
  commit:          'git commit -m "${message}"',
  tag:             'git commit -m "${message}"',
  push:            'git push --follow-tags',
};


class GitActivity {

  constructor(options) {
    this.options = options || {};
    this.spawn = Spawn();
    this.simpleActions = new SimpleActions(GIT_ACTIONS);
    this.simpleActions.addMethods(this);
  }

  //async queryClean() {
  //  const cmd = `git status -untracked-files=no --porcelain`;
  //  const result = await this.spawn.spawnCapture(cmd);
  //  console.log(`* GitActivity: queryClean: "${result}"`);
  //  return result.length === 0; // if directory clean, empty output
  //}


  async ensureClean() {
    const git_clean = await this.queryClean();
    if (!git_clean) {
      const m = '* ERROR: Git directory not clean. Please commit or stash the changes before the build.';
      console.error(m);
      throw new Error(m);
    }
  }


  //async queryCommitHash(options) {
  //  const cmd = `git rev-parse --short HEAD`;
  //  const result = await this.spawn.spawnCapture(cmd);
  //  console.log(`* GitActivity: queryCommitHash: "${result}"`);
  //  return result;
  //}


  //async queryBranch() {
  //  const cmd = `git rev-parse --abbrev-ref HEAD`;
  //  const result = await this.spawn.spawnCapture(cmd);
  //  console.log(`* GitActivity: queryBranch: "${result}"`);
  //  return result;
  //}


  //async checkoutBranch({branch}) {
  //  const cmd = `git checkout "${branch}"`;
  //  const result = await this.spawn.spawnCapture(cmd);
  //  console.log(`* GitActivity: checkoutBranch: "${result}"`);
  //  return result;
  //}


  //async add({
  //            filename,
  //          }) {
  //  const cmd = `git add "${filename}"`;
  //  const result = await this.spawn.spawnCapture(cmd);
  //  console.log(`* GitActivity: add: "${result}"`);
  //  return result;
  //}
  //
  //
  //async commit(options) {
  //  const { message } = options;
  //  const cmd = `git commit -m "${message}"`;
  //  const result = await this.spawn.spawnCapture(cmd);
  //  console.log(`* GitActivity: commit: "${result}"`);
  //  return result;
  //}
  //
  //
  //async tag(options) {
  //  const { tag, message } = options;
  //  const cmd = `git commit -m "${message}"`;
  //  const result = await this.spawn.spawnCapture(cmd);
  //  console.log(`* GitActivity: tag: "${result}"`);
  //  return result;
  //}
  //
  //
  //async push(options) {
  //  const cmd = `git push --follow-tags`;
  //  const result = await this.spawn.spawnCapture(cmd);
  //  console.log(`* GitActivity: push: "${result}"`);
  //  return result;
  //}


}


module.exports = GitActivity;
