"use strict";
const express = require('express');
const bodyParser = require('body-parser');

const esRouter = require('./routes/es')
const cleaningRouter = require('./routes/cleaning')
const logger = require('./winston');
const config = require('./config')

const app = express();
app.use(bodyParser.urlencoded({
  extended: true,
}));
app.use(bodyParser.json());
app.use('/es', esRouter)
app.use('/cleaning', cleaningRouter)
app.use('/', express.static(`${__dirname}/../gui`));
const server = require('http').createServer(app);


server.listen(config.get("server:port"));
logger.info(`Server is running and listening on port ${config.get("server:port")}`);