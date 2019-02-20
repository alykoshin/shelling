const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

const stringUtils = require('./stringUtils');
const Spawn = require('./spawn');
const spawn = new Spawn({ print: true, logging: 'none' });


const sanitizeArray = (array) => {
  if (!array) array = [];
  if (!Array.isArray(array)) array = [array];
  return array;
};

async function ensureFile(filenames) {
  filenames = sanitizeArray(filenames);
  if (filenames.length>0) process.stdout.write(`* Checking files... `);
  filenames.forEach(fname => {
    process.stdout.write(`"${fname}" `);
    const fd    = fs.openSync(fname, 'r');
    const stats = fs.fstatSync(fd);
    if (stats.isFile() && stats.size > 0) {
      console.log(`[${stats.size} bytes] `);
      return fname;
    } else {
      const msg = `Error checking result file "${fname}"`;
      console.error(msg, stats);
      throw new Error(msg);
    }
  });
}


async function ensureNoFile(filenames) {
  filenames = sanitizeArray(filenames);
  if (filenames.length>0) process.stdout.write(`* Checking files... `);
  filenames.forEach(fname => {
    process.stdout.write(`"${fname}" `);
    if (!fs.existsSync(fname)) {
      console.log(`[Not exists]`);
      return fname;
    } else {
      const msg = `File "${fname}" must not exists`;
      console.error(msg, stats);
      throw new Error(msg);
    }
  });
}


async function writeFile(fname, text, encoding='utf8') {
  process.stdout.write(`\n* Writing file ${fname}... `);
  await fs.writeFileSync(fname, text, {encoding});
  process.stdout.write(`Done\n`);
  return await ensureFile(fname);
}


async function cleanup(title, filenames) {
  filenames = sanitizeArray(filenames);
  if (filenames.length>0) process.stdout.write(`\n* ${title} `);
  filenames.forEach(fname => {
    fs.unlinkSync(fname);
    process.stdout.write(`${fname} `);
  });
  process.stdout.write(`Done.`);
  return await ensureNoFile(filenames);
}


const actions = {
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

async function doAction(name, context) {
  const action = actions[ name ];
  const cmd = stringUtils.templateLiteralsLike( action.action, context);
  console.log(`\n* ${action.title}`);
  return spawn._spawnCapturePrint(cmd)
    .then(res => ensureFile(context.files[action.out]));
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
//  const action = actions[ 'gen_ca_private_key' ];
//  const cmd = templateString( action.action, { ca_key, password });
//  console.log(`\n* ${action.title}`);
//  return spawn._spawnCapturePrint(cmd)
//    .then(res => ensureFile(ca_key));
//  ;
//}
//

function bye(context) {
  console.log(`
#
# Certificates were successfully generated
#
# For the browser it is needed to add ${context.files.ca_key} key file to trusted certificate authorities in Chrome security settings:
# Settings -> Advanced -> Privacy and security -> Manage certificates -> AUTHORITIES -> IMPORT
# (may be needed to remove old cert named "org-{organization}"
# Direct link: chrome://settings/certificates
#
# To copy to remote docker server host use following command:
# scp ${context.dir}/{ca*,server*} root@${context.commonname}:~/.docker/
#
# To copy to client use following command:
# scp ${context.dir}/{ca*,client*} root@${context.commonname}:~/
#
`);
}

async function gen_certs(configPath) {
  const configPathname = path.resolve(process.cwd(), configPath);
  const config = require(configPathname);

  mkdirp.sync(config.dir);

  // add `dir` to each filename
  for(let filename in config.files) {
    config.files[filename] = path.join(config.dir, config.files[filename])
  }

  await doAction('gen_ca_private_key', config);
  await doAction('gen_ca_public_key', config);
  await doAction('gen_server_key', config);
  await doAction('gen_server_csr', config);
  await writeFile(config.files.server_ext, config.serverExtFile);
  await doAction('sign_server_public', config);
  await doAction('gen_client_key', config);
  await doAction('gen_client_csr', config);
  await writeFile(config.files.client_ext, config.clientExtFile);
  await doAction('sign_client_public', config);
  await cleanup('Remove intermediate csr and extensions config files for client and server', [
    config.files.server_csr,
    config.files.client_csr,
    config.files.server_ext,
    config.files.client_ext,
  ]);
  await doAction('chmod_keys', config);
  await doAction('chmod_public', config);
  bye();
}


module.exports = {
  gen_certs,
};
