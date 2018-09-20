const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const compression = require('compression')
const methodOverride = require('method-override')
const logger = require('simple-json-logger')
const fp = require('lodash/fp')

const asyncMiddleware = fn =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .catch(next)
  }

const byBody = apiHandler =>
  async function handler (req, res, next) {
    const body = req.body
    const result = await apiHandler(body)
    res.json(result)
  }

const asyncMiddlewareByBody = fp.compose(asyncMiddleware, byBody)

const errorLogger = (err, req, res, next) => {
  logger.error(err)
  next(err)
}

const errorHandler = (err, req, res, next) => {
  const {name, message} = err
  res.status(500)
  res.json({error: {name, message}})
}

const noop = () => {}

function buildHTTPServer (routes, options = {onInit: noop}) {
  const {onInit} = options
  const app = express()
  onInit(app)
  app.use(cors())
  app.use(compression())
  app.use(bodyParser.json({limit: '50mb'}))
  app.use(bodyParser.urlencoded({limit: '50mb', extended: true}))

  // register
  Object.keys(routes).forEach(routeKey => {
    app.use(`/${routeKey}`, routes[routeKey])
    logger.info(`Route '/${routeKey}' registered`)
  })

  // over ride error handler see https://expressjs.com/en/guide/error-handling.html for details
  app.use(methodOverride())
  app.use(errorLogger)
  app.use(errorHandler)

  return app
}

module.exports = {
  buildHTTPServer,
  asyncMiddleware,
  asyncMiddlewareByBody,
  ...express
}
