/*global process, __dirname */
const nconf = require('nconf');
nconf.argv()
  .env({
    lowerCase: true
  })
  .file({
    file: `${__dirname}/config.json`
  });
module.exports = nconf;