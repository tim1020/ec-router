const Koa = require('koa')
const bodyParser    = require('koa-bodyparser')
const ecRouter    = require('../index')

const app = new Koa()

process.env.NODE_ENV = 'dev'

app.use(bodyParser())

/**
ecRouter.setConfig({
    dbConf:dbConf,
    tbPrefix:'',
    //allowMethod:['get','head']
})
*/

ecRouter.loadConfig(__dirname+'/ec-config.js')
app.use(ecRouter.dispatcher())

app.listen(3000)
console.log('[demo] listen at port 3000')