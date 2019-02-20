const fs = require('fs');
const archiver = require('archiver');

/**
 * @param {String} source
 * @param {String} out
 * @returns {Promise}
 */
async function zipDirectory(source, out) {
  const archive = archiver('zip', { zlib: { level: 9 }});
  const lambdaStream = fs.createWriteStream(out);

  return new Promise((resolve, reject) => {
    archive
      //.directory(source, false)
      .glob(source)
      .on('error', err => reject(err))
      // https://archiverjs.com/docs/global.html#EntryData
      .on('entry', entryData => {
        console.log('>>> ', entryData.name);
      })
      .on('progress', progressData => {
        console.log(`>>> ${progressData.entries.processed} of ${progressData.entries.total} files (${progressData.fs.processedBytes} of approx ${progressData.fs.totalBytes} bytes) `);
      })
      .on('close', () => console.log(`total bytes: ${archive.pointer}`))
      .pipe(lambdaStream)
    ;

    lambdaStream.on('close', () => resolve());
    archive.finalize();
  });
}

module.exports = {
  zipDirectory,
};
