const request = require('request');
const async = require('async');
const URI = require('urijs');
const isJSON = require('is-json');
const moment = require('moment')
const fs = require("fs");
const config = require('./config')
const lastSync = config.get('sync:lastSyncTime')

module.exports = {
  sync: () => {
    return new Promise((resolve, reject) => {

      let resources = [
//        'Basic',
//        'Practitioner',
//        'PractitionerRole',
        // 'Organization',
        'Location'
      ];
      let errorOccured = false
      async.eachSeries(resources, (resource, nxtResource) => {
        let bundle = {};
        bundle.entry = [];
        bundle.type = 'batch';
        bundle.resourceType = 'Bundle';
        getResourceFromiHRIS(resource, (err, resourceData) => {
          console.log(`Processing ${resourceData.entry.length} of resource ${resource}`)
          let counter = 1;
          async.eachSeries(resourceData.entry, (data, nxtEntry) => {
            console.log(`Processing ${counter} of ${resourceData.entry.length} for resource ${resource}`)
            counter++
            if (!data.resource || !data.resource.resourceType) {
              return nxtEntry();
            }
            bundle.entry.push({
              resource: data.resource,
              request: {
                method: 'PUT',
                url: data.resource.resourceType + '/' + data.resource.id,
              },
            });
            if (bundle.entry.length >= config.get("sync:maxBundleSize")) {
              let tmpBundle = {
                ...bundle,
              };
              bundle.entry = [];
              saveResource(tmpBundle, (err) => {
                if(err) {
                  errorOccured = true
                }
                return nxtEntry()
              });
            } else {
              return nxtEntry()
            }
          }, () => {
            if (bundle.entry.length > 0) {
              saveResource(bundle, (err) => {
                if(err) {
                  errorOccured = true
                }
                return nxtResource();
              });
            } else {
              return nxtResource();
            }
          })
        });
      }, () => {
        if(errorOccured) {
          return reject()
        }
        let runsLastSync = moment()
          .subtract('10', 'minutes')
          .format('Y-MM-DDTHH:mm:ss');
        updateConfigFile(["sync", "lastSyncTime"], runsLastSync, () => {
          console.log('Done Synchronizing data');
          return resolve()
        })
      });
    })
  }
}

function getResourceFromiHRIS(resource, callback) {
  const resourceData = {};
  resourceData.entry = [];
  let url = URI(config.get('ihris4:baseURL')).segment(resource).segment('_history');
  url.addQuery('_since', lastSync)
  url.addQuery('_format', 'json');
  url = url.toString();
  console.info(
    `Getting data for resource ${resource} from server ${config.get('ihris4:baseURL')}`
  );
  url = 'http://localhost:8081/dhis2/fhir/Location?_id=7709f587-103e-4450-b42f-4839570a412c&_revinclude:recurse=Location:partof'
  async.whilst(
    callback => {
      return callback(null, url !== false);
    },
    callback => {
      const options = {
        url,
        withCredentials: true,
        auth: {
          username: config.get('ihris4:username'),
          password: config.get('ihris4:password')
        },
      };
      request.get(options, (err, res, body) => {
        url = false;
        if (err) {
          console.error(err);
        }
        if (!isJSON(body)) {
          console.error(
            'Non JSON has been returned while getting data for resource ' +
            resource
          );
          return callback(true, false);
        }
        if (res.statusCode && (res.statusCode < 200 || res.statusCode > 399)) {
          return callback(true, false);
        }
        body = JSON.parse(body);
        if (!body.entry) {
          console.error('Invalid resource data returned by FHIR server');
          return callback(true, false);
        }
        if (body.total === 0 && body.entry && body.entry.length > 0) {
          console.error('Non resource data returned for resource ' + resource);
          return callback(true, false);
        }
        if (body.entry && body.entry.length > 0) {
          resourceData.entry = resourceData.entry.concat(body.entry);
        }
        const next =
          body.link && body.link.find(link => link.relation === 'next');
        if (next) {
          url = next.url;
        }
        return callback(null, url);
      });
    },
    err => {
      console.info(`Done Getting data for resource ${resource} from server ${config.get('ihris4:baseURL')}`);
      return callback(err, resourceData);
    }
  );
}

function saveResource(bundle, callback) {
  const url = URI(config.get('ihris5:baseURL')).toString();
  const options = {
    url,
    withCredentials: true,
    auth: {
      username: config.get('ihris5:username'),
      password: config.get('ihris5:password'),
    },
    headers: {
      'Content-Type': 'application/json',
    },
    json: bundle,
  };
  request.post(options, (err, res, body) => {
    if (err) {
      console.error(err);
      return callback(err);
    }
    if (!res.statusCode || (res.statusCode && (res.statusCode < 200 || res.statusCode > 299))) {
      console.log(JSON.stringify(bundle, 0, 2))
      console.log(JSON.stringify(body, 0, 2))
      return callback(true);
    }
    callback(err, body);
  });
}

function setNestedKey(obj, path, value, callback) {
  if (path.length === 1) {
    obj[path] = value;
    return callback();
  }
  setNestedKey(obj[path[0]], path.slice(1), value, () => {
    return callback();
  });
}

function updateConfigFile (path, newValue, callback) {
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
      return callback();
    });
  });
}
