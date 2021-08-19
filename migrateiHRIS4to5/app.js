const cron = require('node-cron');
const moment = require('moment')
const fs = require("fs");
const pulliHRIS = require('./pulliHRIS')
const addRelatedGroup = require('./addRelatedGroup')
const populateCodeSystems = require('./populateCodeSystems')
const config = require('./config')
// run every 15 minutes
let time = config.get("sync:cronTime")
cron.schedule(time, () => {
  if(config.get('sync:isrunning')) {
    return
  }
  console.log('Tasks scheduled to run with cron time ' + time);
  let runsLastSync = moment().format('Y-MM-DDTHH:mm:ss');
  updateConfigFile(["sync", "isrunning"], true)
  pulliHRIS.sync().then(() => {
    Promise.all([addRelatedGroup(), populateCodeSystems()]).then(() => {
      console.log('Done running cron job')
      updateConfigFile(["sync", "lastSyncTime"], runsLastSync)
      updateConfigFile(["sync", "isrunning"], false)
    }).catch(() => {
      updateConfigFile(["sync", "isrunning"], false)
    })
  }).catch(() => {
    updateConfigFile(["sync", "isrunning"], false)
  })
})

function updateConfigFile (path, newValue) {
  const pathString = path.join(':');
  config.set(pathString, newValue);
  console.log('Updating config file');
  const configFile = `${__dirname}/config.json`;
  const configData = require(configFile);
  setNestedKey(configData, path, newValue, () => {
    fs.writeFile(configFile, JSON.stringify(configData, 0, 2), (err) => {
      if (err) {
        throw err;
      }
      console.log('Done updating config file');
    });
  });
}