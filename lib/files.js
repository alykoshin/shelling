const fs = require('fs');

const sanitize = require('./sanitize');


const writeTextFile = async (fname, text, encoding='utf8') => {
  process.stdout.write(`\n* Writing file ${fname}... `);
  await fs.writeFileSync(fname, text, {encoding});
  process.stdout.write(`Done\n`);
  return await ensureFile(fname);
};


const cleanup = async (title, filenames) => {
  filenames = sanitize.array(filenames);
  if (filenames.length>0) process.stdout.write(`\n* ${title} `);
  filenames.forEach(fname => {
    fs.unlinkSync(fname);
    process.stdout.write(`${fname} `);
  });
  process.stdout.write(`Done.`);
  return await ensureNoFile(filenames);
};


const iterateFiles = (filenames, title, fn) => {
  filenames = sanitize.array(filenames);
  if (filenames.length>0) process.stdout.write(title);
  filenames.forEach(fname => {
    process.stdout.write(`"${fname}" `);
    fn(fname);
  });
};

const fileCheckError = (fname, moreData) => {
  const msg = `Error checking file "${fname}"`;
  console.error(msg, moreData);
  throw new Error(msg);
};

async function ensureFile(filenames) {
  iterateFiles(filenames, `* Checking files exist... `, fname => {
    const fd    = fs.openSync(fname, 'r');
    const stats = fs.fstatSync(fd);
    if (stats.isFile() && stats.size > 0) {
      console.log(`[${stats.size} bytes] `);
      return fname;
    } else {
      return fileCheckError(fname, stats);
    }
  });
}


async function ensureNoFile(filenames) {
  iterateFiles(filenames, `* Checking file doesn't exist... `, fname => {
    if (!fs.existsSync(fname)) {
      console.log(`[Not exists]`);
      return fname;
    } else {
      return fileCheckError(fname, stats);
    }
  });
}



module.exports = {
  writeTextFile,
  cleanup,
  ensureFile,
  ensureNoFile,
};
