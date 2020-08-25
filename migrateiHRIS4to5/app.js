const cron = require('node-cron');
const pulliHRIS = require('./pulliHRIS')
const config = require('./config')

// run every 15 minutes
let time = config.get("sync:cronTime")
cron.schedule(time, () => {
  console.log('Tasks scheduled to run with cron time ' + time);
  pulliHRIS.sync().then(() => {
    console.log('Done running cron job')
  })
})

pulliHRIS.sync().then(() => {
  console.log('Done running cron job')
})