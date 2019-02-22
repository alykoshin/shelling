const os = require('os');
const fs = require('fs');
const path = require('path');
const gitconfig = require('git-config');
const Octokit = require('@octokit/rest');
const _ = require('lodash');
//
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
    this.gitconfig = gitconfig.sync();
    this.octokit = this._createOctokit();
  }

  readGitCredentials() {
    const GIT_CREDENTIALS_FNAME = '.git-credentials';
    const fname = path.resolve(os.homedir(), GIT_CREDENTIALS_FNAME);
    const text = fs.readFileSync(fname, {encoding: 'utf8' });
    const lines = text.split(/\r?\n/);
    const credentials = [];
    lines.forEach(line => {
      // example: https://alykoshin:111111e61f359ab3f@github.com
      const matches = line.match(/^(\S+):\/?\/?(\S+):(\S+)@([-a-zA-Z0-9\.]+)$/)
      if (matches && matches.length===5) credentials.push({
        // match:  matches[0],
        protocol: matches[1],
        username: matches[2],
        password: matches[3],
        hostname: matches[4],
        // index: matches.index
        // input: matches.input
        // groups: matches.groups
      });
    });
    return credentials;
  }

  readSpecificGitCredentials({hostname, username}) {
    //console.log(`readSpecificGitCredentials():`, {hostname, username});
    const credentials = this.readGitCredentials();
    const found = credentials.find(cred =>
      cred.hostname === hostname &&
      cred.username === username
    );
    //console.log(`readSpecificGitCredentials():`, found);
    return found;
  }

  readGithubUsername() {
    const username = _.get(this.gitconfig, 'github.user');
    if (!username) throw new Error('Unable to read github.user from .git-config');
    //console.log(`readGithubUsername(): "${username}"`);
    return username;
  }

  readGithubToken() {
    const username = this.readGithubUsername();
    const credentials = this.readSpecificGitCredentials({hostname:'github.com', username});
    const token = credentials && credentials.password;
    if (!token) {
      throw new Error('Unable to read github token from .git-credentials');
    }
    //console.log(`readGithubToken(): "${token}"`);
    return token;
  }

  _createOctokit() {
    const GIT_DEBUG = false;
    const token = this.readGithubToken();
    const octokit = new Octokit ({
      auth: `token ${token}`,
      //auth: `token e6019da3a1d536369e61f359ab3fa91ddb5508f0`,
      /*
            auth: {
              username: 'alykoshin',
              password: 'alg12rk',
              async on2fa() {
                // example: ask the user
                return prompt('Two-factor authentication Code:')
              },
              },
      */
      log: GIT_DEBUG
           ? console
           : {
          debug: () => {},
          info: () => {},
          warn: console.warn,
          error: console.error
        },
    });
    return octokit;

  }

  async ensureClean() {
    const git_clean = await this.queryClean();
    if (!git_clean) {
      const m = '* ERROR: Git directory not clean. Please commit or stash the changes before the build.';
      console.error(m);
      throw new Error(m);
    }
  }

  _checkGithubError(e) {
    if (e.name === 'HttpError' && e.status === 401) {
      console.error('*');
      console.error('* This package uses:');
      console.error('*   github.user from ~/.git-config');
      console.error('*   token from ~/.git-credentials');
      console.error('*');
      console.error('* Please ensure they are still valid (may also be removed by Github automatically if found in public repository)');
      console.error('*');
      throw new Error('* Invalid Github credentials');
    } else {
      console.error(e);
    }
  }

  async createGithubRepo({ username, name, description }) {

    //console.log('createGithubRepo', { username, name, description })
    return await this.octokit.repos.createForAuthenticatedUser({
      user:        username,
      name,
      description,
      //type: 'public'
    }).then(({data, headers, status}) => {
      console.log('* repository successfully created');
      return true;
      //console.log(data,headers,status)
      // handle data
    }).catch(e => {
      this._checkGithubError(e);
      throw e;
    });
    //this.octokit.repos.create({
    //    user:        this.githubName,
    //    name:        this.pkgName,
    //    description: this.pkgDesc
    //  }, function (err, res) {
    //    console.log('github.repos.create(): err:', err, 'res:', JSON.stringify(res));

    //  //self._gitInitAndPush(self.githubName, self.pkgName);
    //});
  }


}


module.exports = GitActivity;
