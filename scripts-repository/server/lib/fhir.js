const axios = require('axios')
const URI = require('urijs');
const async = require('async')
const logger = require('./winston')
const config = require('./config')


function getResource({
  resource,
  url,
  id,
  query,
  count,
  noCaching = false,
}, callback) {
  let resourceData = {};
  if (!id) {
    resourceData.entry = [];
  }
  if (!url) {
    url = URI(config.get('fhir:base')).segment(resource);
    if (id) {
      id = id.toString();
      url.segment(id);
    }
    if (count && !isNaN(count)) {
      url.addQuery('_count', count);
    } else if(!id) {
      count = 0;
      url.addQuery('_count', 200);
    }
    if (query) {
      const queries = query.split('&');
      for (const qr of queries) {
        const qrArr = qr.split('=');
        if (qrArr.length !== 2) {
          logger.error('Invalid query supplied, stop getting resources');
          return callback(resourceData);
        }
        url.addQuery(qrArr[0], qrArr[1]);
        if (qrArr[0] === '_count') {
          count = true;
        }
      }
    }
    url = url.toString();
  } else {
    count = true;
  }
  let headers = {};
  if (noCaching) {
    headers = {
      'Cache-Control': 'no-cache',
    };
  }
  let errCode;
  logger.info(`Getting data for resource from server ${config.get('fhir:base')}`);
  async.whilst(
    callback => {
      return callback(null, url !== false);
    },
    callback => {
      const options = {
        withCredentials: true,
        auth: {
          username: config.get('fhir:username'),
          password: config.get('fhir:password'),
        },
        headers
      };
      axios.get(url, options).then((resp) => {
        url = false;
        if (resp.statusCode && (resp.statusCode < 200 || resp.statusCode > 399)) {
          errCode = resp.statusCode;
          logger.error(resp.data);
          logger.error('Getting resource Err Code ' + resp.statusCode);
          return callback(true, false);
        }
        if (!id && !resp.data.entry) {
          logger.error('Invalid resource data returned by FHIR server');
          logger.error(resp.data);
          return callback(true, false);
        }
        if (id && resp.data) {
          resourceData = resp.data;
        } else if (resp.data.entry && resp.data.entry.length > 0) {
          if (count) {
            resourceData = {
              ...resp.data
            };
          } else {
            resourceData.entry = resourceData.entry.concat(resp.data.entry);
          }
        }
        const next = resp.data.link && resp.data.link.find(link => link.relation === 'next');
        if (!count || (count && !isNaN(count) && resourceData.entry.length < count)) {
          if (next) {
            url = next.url;
          }
        }
        return callback(null, url);
      });
    }, (err) => {
      if (err) {
        err = errCode;
      }
      logger.info(`Done Getting data for resource ${resource} from server ${config.get('fhir:base')} and returning ${resourceData.entry.length} data`);
      return callback(err, resourceData);
    }
  );
}

module.exports = {
  getResource
}