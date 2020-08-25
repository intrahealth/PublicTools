const cron = require('node-cron');
const pulliHRIS = require('./pulliHRIS')

// run every 15 minutes
let time = '*/1 * * * *';
cron.schedule(time, () => {
  console.log('Tasks scheduled to run with cron time ' + time);
  pulliHRIS.sync().then(() => {
    console.log('Done running cron job')
  })
})

pulliHRIS.sync().then(() => {
  console.log('Done running cron job')
})