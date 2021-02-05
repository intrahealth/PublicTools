const axios = require('axios')
const URI = require('urijs');
const async = require('async')
const fs = require('fs')
const express = require('express')
const router = express.Router()
const config = require('../config')
const logger = require('../winston')
const fhir = require('../fhir')

router.get('/getContactsSharingPhone', (req, res) => {
  let contactsSharingPhone = require('../contactsSharingPhone.json')
  return res.json(contactsSharingPhone)
})

router.get('/populateContactsSharingPhone', (req, res) => {
  res.send()
  let processed = []
  fhir.getResource({resource: 'Practitioner', query: '_elements=telecom,name,identifier'}, (err, resources) => {
    let dirtyRec = []
    for(let pract of resources.entry) {
      if(!pract.resource.telecom || !Array.isArray(pract.resource.telecom)) {
        continue
      }
      let exist = processed.find((id) => {
        return id === pract.resource.id
      })
      if(exist) {
        continue
      }
      let telecom = pract.resource.telecom
      let dirty = {}
      for(let compPract of resources.entry) {
        if(compPract.resource.id === pract.resource.id) {
          continue
        }
        if(!compPract.resource.telecom || !Array.isArray(compPract.resource.telecom)) {
          continue
        }
        let compTelecom = compPract.resource.telecom
        for(let phone of telecom) {
          for(let compPhone of compTelecom) {
            if(phone.value.substr(-9) === compPhone.value.substr(-9)) {
              processed.push(compPract.resource.id)
              if(!dirty.shares) {
                dirty.shares = []
                dirty.name = pract.resource.name[0].text
                dirty.phone = []
                dirty.id = pract.resource.id
                dirty.isFromRP = isFromRP(pract.resource)
              }
              let share = {}
              share.name = compPract.resource.name[0].text
              share.id = compPract.resource.id
              share.isFromRP = isFromRP(compPract.resource)
              share.phone = []
              for(let ph of compPract.resource.telecom) {
                share.phone.push(ph.value)
              }
              dirty.shares.push(share)
              break;
            }
          }
        }
      }
      if(Object.keys(dirty).length > 0) {
        for(let ph of pract.resource.telecom) {
          dirty.phone.push(ph.value)
        }
        logger.error(JSON.stringify(dirty,0,2));
        dirtyRec.push(dirty)
      }
    }
    fs.writeFileSync('./contactsSharingPhone.json', JSON.stringify(dirtyRec))
  })

  function isFromRP(resource) {
    if(resource.identifier) {
      for(let ident of resource.identifier) {
        if(ident.system === "http://app.rapidpro.io/contact-uuid" && ident.value === resource.id) {
          return 'Yes'
        }
      }
    }
    return 'No'
  }
})

router.post('/deletePractitioners', (req, res) => {
  let practitioners = req.body.practitioners
  let query = ''
  for(let practitioner of practitioners) {
    if(!query) {
      query = practitioner
    } else {
      query += ',' + practitioner
    }
  }
  let url = URI(config.get('fhir:base')).segment('Practitioner').addQuery('_id', query).toString()
  const options = {
    method: 'GET',
    url,
    auth: {
      username: config.get('fhir:username'),
      password: config.get('fhir:password'),
    }
  };
  axios(options).then((practRes) => {
    let rapidproIDs = []
    if(practRes.data.entry) {
      for(let entry of practRes.data.entry) {
        let identifier = entry.resource.identifier && entry.resource.identifier.find((ident) => {
          return ident.system === 'http://app.rapidpro.io/contact-uuid'
        })
        if(identifier) {
          rapidproIDs.push(identifier.value)
        }
      }
    }
    async.series({
      deleteFromFHIR: (callback) => {
        let promises = []
        for(let practitioner of practitioners) {
          promises.push(new Promise((resolve) => {
            let url = URI(config.get('fhir:base')).segment('Practitioner').segment(practitioner).toString()
            const options = {
              method: 'DELETE',
              url,
              auth: {
                username: config.get('fhir:username'),
                password: config.get('fhir:password'),
              }
            };
            axios(options).then((practRes) => {
              logger.info(JSON.stringify(practRes.data,0,2));
              return resolve()
            }).catch((err) => {
              logger.error(err);
              return resolve()
            })
          }))
        }
        Promise.all(promises).then(() => {
          return callback(null)
        })
      },
      deleteFromES: (callback) => {
        let query = {
          query: {
            bool: {
              should: []
            }
          }
        }
        for(let practitioner of practitioners) {
          let match = {}
          match['mheropractitioner.keyword'] = 'Practitioner/' + practitioner
          query.query.bool.should.push({
            match
          })
        }
        let url = URI(config.get('elasticsearch:base')).segment('mheropractitioner').segment('_delete_by_query').toString()
        const options = {
          method: 'POST',
          url,
          auth: {
            username: config.get('elasticsearch:username'),
            password: config.get('elasticsearch:password'),
          },
          data: query,
          headers: {
            'Content-Type': 'application/json',
          }
        };
        axios(options).then((esdelete) => {
          logger.info(JSON.stringify(esdelete.data,0,2));
          return callback(null)
        }).catch((err) => {
          logger.error(err);
          return callback(null)
        })
      },
      deleteFromRP: (callback) => {
        let promises = []
        for(let uuid of rapidproIDs) {
          promises.push(new Promise((resolve) => {
            let url = URI(config.get('rapidpro:base'))
              .segment('api')
              .segment('v2')
              .segment('contacts.json')
              .addQuery('uuid', uuid)
              .toString();
            const options = {
              method: 'DELETE',
              url,
              headers: {
                Authorization: `Token ${config.get('rapidpro:token')}`,
              },
            };
            axios(options).then((rpdelete) => {
              logger.info(JSON.stringify(rpdelete.data,0,2));
              return resolve()
            }).catch((err) => {
              logger.error(err);
              return resolve()
            })
          }))
        }
        Promise.all(promises).then(() => {
          return callback(null)
        })
      }
    }, () => {
      return res.send()
    })
  })
})

module.exports = router