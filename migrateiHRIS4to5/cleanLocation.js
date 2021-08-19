const axios = require('axios')
const async = require('async')

let url = 'http://localhost:8081/hapi/fhir/Location?_count=200'
let bundle = {};
bundle.entry = [];
bundle.type = 'batch';
bundle.resourceType = 'Bundle';
async.whilst(
  callback => {
    return callback(null, url !== false);
  },
  callback => {
    axios.get(url, {
      headers: {
        'Cache-Control': 'no-cache',
      },
      withCredentials: true,
      auth: {
        username: '',
        password: ''
      },
    }).then((response) => {
      const promises = []
      if(!response.data.entry || response.data.entry.length === 0) {
        url = false
        return callback(null, false);
      }
      for(let res of response.data.entry) {
        promises.push(new Promise((resolve) => {
          if(!res.resource.name) {
            console.log('Deleting location id ' + res.resource.id);
            axios.delete(`http://localhost:8081/hapi/fhir/Location/${res.resource.id}`, {}).then(() => {
              console.log('Deleted location id ' + res.resource.id);
              return resolve()
            }).catch((err) => {
              console.log(err);
              return resolve()
            })
          }
          return resolve()
        }))
      }
      Promise.all(promises).then(() => {
        url = false
        const next = response.data.link && response.data.link.find(link => link.relation === 'next');
        if (next) {
          url = next.url;
        }
        return callback(null, url);
      }).catch((err) => {
        console.log(err);
        return callback(null, url);
      })
    })
  },
  err => {
    console.log('Done');
  }
)