const axios = require('axios')
const URI = require('urijs')
const async = require('async')

const config = require('./config')
const lastSync = config.get('sync:lastSyncTime')

const CodeSystemTemplate = {
  "resourceType": "CodeSystem",
  "date": "2020-09-25T20:48:33.646Z",
  "publisher": "iHRIS Foundation",
  "contact": [
    {
      "telecom": [
        {
          "system": "url",
          "value": "http://ihris.org"
        }
      ]
    }
  ],
  "content": "complete",
  "concept": []
}

const populateJobs = () => {
  return new Promise((resolve) => {
    let jobCodeSystem = {}
    let cadreCodeSystem = {}
    async.parallel({
      job: (callback) => {
        getCodeSystem('ihris-job').then((codeSyst) => {
          if(!codeSyst.concept) {
            jobCodeSystem = CodeSystemTemplate
            jobCodeSystem.id = 'ihris-job'
            jobCodeSystem.url = 'http://ihris.org/fhir/CodeSystem/ihris-job'
            jobCodeSystem.name = 'iHRISJob'
            jobCodeSystem.title = 'iHRIS Job'
            jobCodeSystem.property = [{
              code: 'cadre',
              uri: 'http://ihris.org/fhir/ValueSet/ihris-cadre',
              description: 'The cadre of this job.',
              type: 'Coding'
            }]
          } else {
            jobCodeSystem = codeSyst
          }
          return callback()
        }).catch((err) => {
          console.log(err);
          return callback()
        })
      },
      cadre: (callback) => {
        getCodeSystem('ihris-cadre').then((codeSyst) => {
          if(!codeSyst.concept) {
            cadreCodeSystem = CodeSystemTemplate
            cadreCodeSystem.id = 'ihris-cadre'
            cadreCodeSystem.url = 'http://ihris.org/fhir/CodeSystem/ihris-cadre'
            cadreCodeSystem.name = 'iHRISCadre'
            cadreCodeSystem.title = 'iHRIS Cadre'
          } else {
            cadreCodeSystem = codeSyst
          }
          return callback()
        }).catch((err) => {
          console.log(err);
          return callback()
        })
      }
    }, () => {
      let url = URI(config.get('ihris5:baseURL'))
        .segment('Basic')
        .addQuery('_profile', 'http://ihris.org/fhir/StructureDefinition/iHRISPosition')
        .addQuery('_since', lastSync)
        .toString()

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
              username: config.get('ihris5:username'),
              password: config.get('ihris5:password')
            },
          }).then((response) => {
            const promises = []
            for(let pos of response.data.entry) {
              promises.push(new Promise((resolve) => {
                let posDet = pos.resource.extension && pos.resource.extension.find((ext) => {
                  return ext.url === 'http://ihris.org/fhir/StructureDefinition/iHIRSPositionDetails'
                })
                let jobExt = posDet.extension && posDet.extension.find((ext) => {
                  return ext.url === 'http://ihris.org/fhir/CodeSystem/ihris-job'
                })
                if(!jobExt) {
                  return resolve()
                }
                let jobName = jobExt.extension.find( ext => ext.url === 'name').valueString
                let jobCode = jobExt.extension.find( ext => ext.url === 'id').valueString
                let cadreExt = posDet.extension && posDet.extension.find((ext) => {
                  return ext.url === 'http://ihris.org/fhir/CodeSystem/ihris-cadre'
                })
                if(!cadreExt) {
                  return resolve()
                }
                let cadreName = cadreExt.extension.find( ext => ext.url === 'name').valueString
                let cadreCode = cadreExt.extension.find( ext => ext.url === 'id').valueString
                async.parallel({
                  job: (callback) => {
                    updateJobCodeSystem(jobCodeSystem, jobCode, jobName, cadreCode).then(() => {
                      return callback()
                    }).catch((err) => {
                      console.log(err);
                      return callback()
                    })
                  },
                  cadre: (callback) => {
                    updateCadreCodeSystem(cadreCodeSystem, cadreCode, cadreName).then(() => {
                      return callback()
                    }).catch((err) => {
                      console.log(err);
                      return callback()
                    })
                  }
                }, () => {
                  resolve()
                })
              }))
            }
            Promise.all(promises).then(() =>{
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
          }).catch((err) => {
            console.log(err);
          })
        },
        err => {
          let bundle = {};
          bundle.entry = [];
          bundle.type = 'batch';
          bundle.resourceType = 'Bundle';
          bundle.entry.push({
            resource: jobCodeSystem,
            request: {
              method: 'PUT',
              url: jobCodeSystem.resourceType + '/' + jobCodeSystem.id,
            },
          })
          bundle.entry.push({
            resource: cadreCodeSystem,
            request: {
              method: 'PUT',
              url: cadreCodeSystem.resourceType + '/' + cadreCodeSystem.id,
            },
          })
          const url = URI(config.get('ihris5:baseURL')).toString();
          axios({
            method: 'POST',
            url,
            auth: {
              username: config.get('ihris5:username'),
              password: config.get('ihris5:password')
            },
            data: bundle
          })
          .then(() => {
            console.log('Done');
            resolve()
          })
        }
      )
    })
  })
}

const updateJobCodeSystem = (codeSystem, code, display, cadre) => {
  return new Promise((resolve) => {
    let updated = false
    for(let index in codeSystem.concept) {
      let concept = codeSystem.concept[index]
      if(concept.code === code) {
        codeSystem.concept[index].display = display
        let propIndex = codeSystem.concept[index].property.findIndex((property) => {
          return property.code === 'cadre'
        })
        if(propIndex !== -1) {
          codeSystem.concept[index].property[propIndex].valueCoding = {
            system: 'http://ihris.org/fhir/CodeSystem/ihris-cadre',
            code: cadre
          }
        } else {
          codeSystem.concept[index].property.push({
            code: 'cadre',
            valueCoding: {
              system: 'http://ihris.org/fhir/CodeSystem/ihris-cadre',
              code: cadre
            }
          })
        }
        updated = true
        break
      }
    }
    if(!updated) {
      codeSystem.concept.push({
        code: code,
        display,
        property: [{
          code: 'cadre',
          valueCoding: {
            system: 'http://ihris.org/fhir/CodeSystem/ihris-cadre',
            code: cadre
          }
        }]
      })
    }
    return resolve()
  })
}

const updateCadreCodeSystem = (codeSystem, code, display) => {
  return new Promise((resolve) => {
    let updated = false
    for(let index in codeSystem.concept) {
      let concept = codeSystem.concept[index]
      if(concept.code === code) {
        codeSystem.concept[index].display = display
        updated = true
        break
      }
    }
    if(!updated) {
      codeSystem.concept.push({
        code: code,
        display
      })
    }
    return resolve()
  })
}

const getCodeSystem = (id) => {
  return new Promise((resolve) => {
    let url = URI(config.get('ihris5:baseURL'))
      .segment('CodeSystem')
      .segment(id)
      .toString()

    axios.get(url, {
      headers: {
        'Cache-Control': 'no-cache',
      },
      withCredentials: true,
      auth: {
        username: config.get('ihris5:username'),
        password: config.get('ihris5:password')
      },
    }).then((response) => {
      resolve(response.data)
    }).catch((err) => {
      console.log(err);
      resolve({})
    })
  })
}

populateJobs().catch((err) => {
  console.log(err);
})