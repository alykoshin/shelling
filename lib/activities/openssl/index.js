const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

const {templateLiteralsLike} = require('../../stringUtils');
const sanitize = require('../../sanitize');
const SimpleActions = require('../../simpleActions');
const Spawn = require('../../spawn');
const spawn = new Spawn({ print: true, logging: 'none' });

const { ensureFile, ensureNoFile } = require('../../files');

const BYE_BANNER =
        '\n' +
        '################################################################################\n'+
        'Certificates were successfully generated\n'+
        '\n'+
        'For the browser it is needed to add "${files.ca_key}" key file to trusted certificate authorities in Chrome security settings:\n'+
        'Settings -> Advanced -> Privacy and security -> Manage certificates -> AUTHORITIES -> IMPORT\n'+
        '(may be needed to remove old cert named "org-{organization}"\n'+
        'Direct link: chrome://settings/certificates\n'+
        '\n'+
        'To copy to remote docker server host use following command:\n'+
        '$ scp ${dir}/{ca*,server*} root@${commonname}:~/.docker/\n'+
        '\n'+
        'To copy to client use following command:\n'+
        '$ scp ${dir}/{ca*,client*} root@${commonname}:~/\n'+
        '\n'+
        '################################################################################\n'
;


const OPENSSL_ACTIONS = {
  gen_ca_private_key: {
    title: 'Generate CA private key',
    action: 'openssl genrsa -aes256 -out "${files.ca_key}" -passout pass:${password} 4096',
    ensureFile: 'ca_key'
  },
  gen_ca_public_key: {
    title: 'Generate CA public key',
    action: 'openssl req -new -x509 -days "${validity_days}" -key "${files.ca_key}" -sha256 -out "${files.ca}" -subj \"/C=${country}/ST=${state}/L=${locality}/O=${organization}/OU=${organizationalunit}/CN=${commonname}/emailAddress=${email}\" -passin pass:${password}',
    ensureFile: 'ca'
  },
  gen_ca: {
    title: 'Generate CA private and public key',
    action: [
      'gen_ca_private_key',
      'gen_ca_public_key',
    ]
  },
  gen_server_key: {
    title: 'Create a server key',
    action: 'openssl genrsa -out "${files.server_key}" 4096',
    ensureFile: 'server_key'
  },
  gen_server_csr: {
    title: 'Create server certificate signing request (CSR)',
    action: 'openssl req -subj "/CN=${commonname}" -sha256 -new -key "${files.server_key}" -out "${files.server_csr}"',
    ensureFile: 'server_csr'
  },
  write_server_ext: {
    action: 'node -e "const fs=require(\'fs\'); fs.writeFileSync(\'${files.server_ext}\', \'${serverExtFile}\', {encoding:\'utf8\'});"',
    ensureFile:    'server_ext',
  },
  sign_server_public: {
    title: 'Sign server public key with our CA',
    action: 'openssl x509 -req -days "${validity_days}" -sha256 -in "${files.server_csr}" -CA "${files.ca}" -CAkey "${files.ca_key}" -CAcreateserial -out "${files.server_cert}" -extfile "${files.server_ext}"  -passin pass:${password}',
    ensureFile: 'server_cert'
  },
  gen_server: [
    'gen_server_key',
    'gen_server_csr',
    'write_server_ext',
    'sign_server_public',
  ],

  gen_client_key: {
    title: 'Create a client key',
    action: 'openssl genrsa -out "${files.client_key}" 4096',
    ensureFile: 'client_key'
  },
  gen_client_csr: {
    title: 'Create a client certificate signing request',
    action: 'openssl req -subj "/CN=client" -new -key "${files.client_key}" -out "${files.client_csr}"',
    ensureFile: 'client_csr'
  },
  write_client_ext: {
    action: 'node -e "const fs=require(\'fs\'); fs.writeFileSync(\'${files.client_ext}\', \'${clientExtFile}\', {encoding:\'utf8\'});"',
    ensureFile:    'server_ext',
  },
  sign_client_public: {
    title: 'Sign client public key with our CA',
    action: 'openssl x509 -req -days "${validity_days}" -sha256 -in "${files.client_csr}" -CA "${files.ca}" -CAkey "${files.ca_key}" -CAcreateserial -out "${files.client_cert}" -extfile "${files.client_ext}"  -passin pass:${password}',
    ensureFile: 'server_cert'
  },
  gen_client: [
    'gen_client_key',
    'gen_client_csr',
    'write_client_ext',
    'sign_client_public',
  ],

  cleanup: {
    title:  'Remove intermediate csr and extensions config files for client and server',
    action: 'rm ${files.server_csr} ${files.client_csr} ${files.server_ext} ${files.client_ext}',
    ensureNoFile: [ 'server_csr', 'client_csr', 'server_ext', 'client_ext' ],
  },

  chmod_keys: {
    title: 'Make secret keys only readable by you',
    action: 'chmod -v 0400 ${files.ca_key} ${files.client_key} ${files.server_key}',
  },
  chmod_public: {
    title: 'Make certificates world-readable (no write access)',
    action: 'chmod -v 0444 ${files.ca} ${files.server_cert} ${files.client_cert}',
  },
  chmod: [
    'chmod_keys',
    'chmod_public',
  ],

  finalize: [
    'cleanup',
    'chmod',
  ],

};


class OpensslActivity {

  constructor(options) {
    this.options = options || {};
    this.simpleActions = new SimpleActions(
      OPENSSL_ACTIONS,
      {
        afterEach: async ({ action, context, result }) => {
          await ensureFile(context.files[ action.ensureFile ]);
          await ensureNoFile(context.files[ action.ensureNoFile ])
        }
      }
    );
    this.simpleActions.addMethods(this);
  }

  async doAction(name, context) {

    //const action = OPENSSL_ACTIONS[ name ];
    //const cmd = stringUtils.templateLiteralsLike( action.action, context);
    //console.log(`\n* ${action.title}`);
    //return spawn._spawnCapturePrint(cmd)
    //  .then(res => ensureFile(context.files[action.out]));
    //;

    return await this.simpleActions.do({
      name,
      context,
    });

    //return this.simpleActions.do(name, context)
    //  .then(({ action, result }) => ensureFile(context.files[action.out]))
    //  ;
  }

  bye(context) {
    console.log(templateLiteralsLike(BYE_BANNER,context));
  }

  async gen_certs(configPath) {
    if (!configPath) throw new Error('Expected path to config file');
    const configPathname = path.resolve(process.cwd(), configPath);
    const config = require(configPathname);

    mkdirp.sync(config.dir);

    // add `dir` to each filename
    for(let filename in config.files)
      if (config.files.hasOwnProperty(filename)) {
        config.files[filename] = path.join(config.dir, config.files[filename])
      }

    await this.gen_ca(config);

    await this.gen_server(config);

    await this.gen_client(config);

    await this.finalize(config);

    this.bye(config);
  }

}

module.exports = OpensslActivity;
