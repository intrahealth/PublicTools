const axios = require('axios')
const URI = require('urijs')
const async = require('async')

const config = require('./config')
const lastSync = config.get('sync:lastSyncTime')

const addRelatedGroup = () => {
  return new Promise((resolve, reject) => {
    let url = URI(config.get('ihris5:baseURL'))
      .segment('PractitionerRole')
      .addQuery('_include', 'PractitionerRole:practitioner')
      .addQuery('_count', 100)
      .addQuery('_lastUpdated', 'ge' + lastSync)
      .toString()
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
          let practitioners = response.data.entry.filter((entry) => {
            return entry.resource.resourceType === 'Practitioner'
          })
          let practitionerRoles = response.data.entry.filter((entry) => {
            return entry.resource.resourceType === 'PractitionerRole'
          })
          for(let role of practitionerRoles) {
            promises.push(new Promise((resolve) => {
              let exist = role.resource.extension.find((ext) => {
                return ext.url === 'http://ihris.org/fhir/StructureDefinition/ihris-related-group'
              })
              if(exist || !role.resource.location) {
                return resolve()
              }
              let locaUrl = URI(config.get('ihris5:baseURL'))
                .segment('Location')
                .addQuery('_id', role.resource.location[0].reference.split('/')[1])
                .addQuery('_include:iterate', 'Location:partof')
                .toString()
              axios.get(locaUrl, {
                headers: {
                  'Cache-Control': 'no-cache',
                },
                withCredentials: true,
                auth: {
                  username: '',
                  password: ''
                },
              }).then((locations) => {
                let practitioner = practitioners.find((pract) => {
                  return role.resource.practitioner && pract.resource.id === role.resource.practitioner.reference.split('/')[1]
                })
                let extension = []
                for(let location of locations.data.entry) {
                  extension.push({
                    url: 'location',
                    valueString: `Location/${location.resource.id}`
                  })
                }
                if(practitioner) {
                  if(!practitioner.resource.extension) {
                    practitioner.resource.extension = []
                  }
                  practitioner.resource.extension.push({
                    url: 'http://ihris.org/fhir/StructureDefinition/ihris-related-group',
                    extension
                  })
                  bundle.entry.push({
                    resource: practitioner.resource,
                    request: {
                      method: 'PUT',
                      url: practitioner.resource.resourceType + '/' + practitioner.resource.id,
                    },
                  })
                }

                if(!role.resource.extension) {
                  role.resource.extension = []
                }
                role.resource.extension.push({
                  url: 'http://ihris.org/fhir/StructureDefinition/ihris-related-group',
                  extension
                })
                bundle.entry.push({
                  resource: role.resource,
                  request: {
                    method: 'PUT',
                    url: role.resource.resourceType + '/' + role.resource.id,
                  },
                })
                return resolve()
              })
            }))
          }
          Promise.all(promises).then(() => {
            url = false
            const next = response.data.link && response.data.link.find(link => link.relation === 'next');
            if (next) {
              url = next.url;
            }
            if(bundle.entry.length >= 100) {
              const posturl = URI(config.get('ihris5:baseURL')).toString();
              axios({
                method: 'POST',
                url: posturl,
                auth: {
                  username: '',
                  password: ''
                },
                data: bundle
              })
              .then(() => {
                bundle.entry = []
                console.log('Saved');
                return callback(null, url);
              }).catch((err) => {
                console.log(err);
                return callback(null, url);
              })
            } else {
              return callback(null, url);
            }
          }).catch((err) => {
            console.log(err);
            return callback(null, url);
          })
        })
      },
      err => {
        if(bundle.entry.length > 0) {
          const url = URI(config.get('ihris5:baseURL')).toString();
          axios({
            method: 'POST',
            url,
            auth: {
              username: '',
              password: ''
            },
            data: bundle
          })
          .then(() => {
            bundle.entry = []
            console.log('Saved and Done');
            resolve()
          }).catch((err) => {
            console.log(err);
            reject()
          })
        } else {
          resolve()
        }
      }
    )
  })
}

module.exports = addRelatedGroup