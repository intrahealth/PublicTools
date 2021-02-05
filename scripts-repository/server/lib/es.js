const config = require('./config')

function getESDocument(index, query, callback) {
  let error = false
  let documents = []
  if(!query) {
    query = {}
  }
  query.size = 10000
  let url = URI(config.get('elasticsearch:base'))
    .segment(index)
    .segment('_search')
    .addQuery('scroll', '1m')
    .toString()
  let scroll_id = null
  async.doWhilst(
    (callback) => {
      axios({
        method: 'POST',
        url,
        data: query,
        auth: {
          username: config.get('elasticsearch:username'),
          password: config.get('elasticsearch:password')
        }
      }).then((response) => {
        if(response.data.hits && response.data.hits.hits && Array.isArray(response.data.hits.hits)) {
          documents = documents.concat(response.data.hits.hits)
        }
        if(response.data.hits.hits.length === 0 || !response.data._scroll_id) {
          scroll_id = null
        } else {
          scroll_id = response.data._scroll_id
          url = URI(config.get('elasticsearch:base')).segment('_search').segment('scroll').toString()
          query = {
            scroll: '1m',
            scroll_id: scroll_id
          }
        }
        return callback(null)
      }).catch((err) => {
        error = err
        logger.error(err);
        scroll_id = null
        return callback(null)
      })
    },
    (callback) => {
      return callback(null, scroll_id !== null)
    },
    () => {
      return callback(error, documents)
    }
  )
}

module.exports = {
  getESDocument
}