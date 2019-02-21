const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

const stringUtils = require('../../stringUtils');
const sanitize = require('../../sanitize');
const SimpleActions = require('../../simpleActions');
const Spawn = require('../../spawn');
const spawn = new Spawn({ print: true, logging: 'none' });

const { ensureFile, ensureNoFile } = require('../../fileExistence');


const OPENSSL_ACTIONS = {
  gen_ca_private_key: {
    title: 'Generate CA private key',
    action: 'openssl genrsa -aes256 -out "${files.ca_key}" -passout pass:${password} 4096',
    out: 'ca_key'
  },
  gen_ca_public_key: {
    title: 'Generate CA public key',
    action: 'openssl req -new -x509 -days "${validity_days}" -key "${files.ca_key}" -sha256 -out "${files.ca}" -subj \"/C=${country}/ST=${state}/L=${locality}/O=${organization}/OU=${organizationalunit}/CN=${commonname}/emailAddress=${email}\" -passin pass:${password}',
    out: 'ca'
  },
  gen_server_key: {
    title: 'Create a server key',
    action: 'openssl genrsa -out "${files.server_key}" 4096',
    out: 'server_key'
  },
  gen_server_csr: {
    title: 'Create server certificate signing request (CSR)',
    action: 'openssl req -subj "/CN=${commonname}" -sha256 -new -key "${files.server_key}" -out "${files.server_csr}"',
    out: 'server_csr'
  },
  sign_server_public: {
    title: 'Sign server public key with our CA',
    action: 'openssl x509 -req -days "${validity_days}" -sha256 -in "${files.server_csr}" -CA "${files.ca}" -CAkey "${files.ca_key}" -CAcreateserial -out "${files.server_cert}" -extfile "${files.server_ext}"  -passin pass:${password}',
    out: 'server_cert'
  },
  gen_client_key: {
    title: 'Create a client key',
    action: 'openssl genrsa -out "${files.client_key}" 4096',
    out: 'client_key'
  },
  gen_client_csr: {
    title: 'Create a client certificate signing request',
    action: 'openssl req -subj "/CN=client" -new -key "${files.client_key}" -out "${files.client_csr}"',
    out: 'client_csr'
  },
  sign_client_public: {
    title: 'Sign client public key with our CA',
    action: 'openssl x509 -req -days "${validity_days}" -sha256 -in "${files.client_csr}" -CA "${files.ca}" -CAkey "${files.ca_key}" -CAcreateserial -out "${files.client_cert}" -extfile "${files.client_ext}"  -passin pass:${password}',
    out: 'server_cert'
  },
  chmod_keys: {
    title: 'Make secret keys only readable by you',
    action: 'chmod -v 0400 ${files.ca_key} ${files.client_key} ${files.server_key}',
  },
  chmod_public: {
    title: 'Make certificates world-readable (no write access)',
    action: 'chmod -v 0444 ${files.ca} ${files.server_cert} ${files.client_cert}',
  },
};


class OpensslActivity {

  constructor(options) {
    this.options = options || {};
    const simpleActions = new SimpleActions(OPENSSL_ACTIONS);
  }

  async writeFile(fname, text, encoding='utf8') {
    process.stdout.write(`\n* Writing file ${fname}... `);
    await fs.writeFileSync(fname, text, {encoding});
    process.stdout.write(`Done\n`);
    return await ensureFile(fname);
  }


  async cleanup(title, filenames) {
    filenames = sanitize.array(filenames);
    if (filenames.length>0) process.stdout.write(`\n* ${title} `);
    filenames.forEach(fname => {
      fs.unlinkSync(fname);
      process.stdout.write(`${fname} `);
    });
    process.stdout.write(`Done.`);
    return await ensureNoFile(filenames);
  }


  async doAction(name, context) {

    //const action = OPENSSL_ACTIONS[ name ];
    //const cmd = stringUtils.templateLiteralsLike( action.action, context);
    //console.log(`\n* ${action.title}`);
    //return spawn._spawnCapturePrint(cmd)
    //  .then(res => ensureFile(context.files[action.out]));
    //;
    return this.simpleActions.do(name, context)
      .then(({ action, result }) => ensureFile(context.files[action.out]))
      ;
  }

//async function gen_ca_private_key({ ca_key, password }) {
//  return await doAction('gen_ca_private_key', { ca_key, password });
//}
//
//async function gen_ca_public_key(c) {
//  return await doAction('gen_ca_public_key', { ca_key, password });
//}

//async function _gen_ca_private_key({ ca_key, password }) {
//  const action = OPENSSL_ACTIONS[ 'gen_ca_private_key' ];
//  const cmd = templateString( action.action, { ca_key, password });
//  console.log(`\n* ${action.title}`);
//  return spawn._spawnCapturePrint(cmd)
//    .then(res => ensureFile(ca_key));
//  ;
//}
//

  bye(context) {
    console.log(`
################################################################################  
#                                                                              #
  Certificates were successfully generated                                     
                                                                              
For the browser it is needed to add ${context.files.ca_key} key file to trusted certificate authorities in Chrome security settings:
Settings -> Advanced -> Privacy and security -> Manage certificates -> AUTHORITIES -> IMPORT
(may be needed to remove old cert named "org-{organization}"                 
Direct link: chrome://settings/certificates                                  
                                                                              
To copy to remote docker server host use following command:                  
$ scp ${context.dir}/{ca*,server*} root@${context.commonname}:~/.docker/       
                                                                             
To copy to client use following command:                                     
$ scp ${context.dir}/{ca*,client*} root@${context.commonname}:~/               
  
#                                                                              #
################################################################################  
`);
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

    await this.doAction('gen_ca_private_key', config);
    await this.doAction('gen_ca_public_key', config);
    await this.doAction('gen_server_key', config);
    await this.doAction('gen_server_csr', config);
    await this.writeFile(config.files.server_ext, config.serverExtFile);
    await this.doAction('sign_server_public', config);
    await this.doAction('gen_client_key', config);
    await this.doAction('gen_client_csr', config);
    await this.writeFile(config.files.client_ext, config.clientExtFile);
    await this.doAction('sign_client_public', config);
    await this.cleanup('Remove intermediate csr and extensions config files for client and server', [
      config.files.server_csr,
      config.files.client_csr,
      config.files.server_ext,
      config.files.client_ext,
    ]);
    await this.doAction('chmod_keys', config);
    await this.doAction('chmod_public', config);
    bye(config);
  }

}

module.exports = OpensslActivity;
