const Koa = require('koa')
const bodyParser    = require('koa-bodyparser')
const ecRouter    = require('ec-router')

const app = new Koa()

process.env.NODE_ENV = 'dev'

let dbConf = {
    driver          : 'mysql',
    connectionLimit : 2,
    host            : '127.0.0.1',
    port            : 3306,
    user            : 'root',
    password        : '',
    database        : 'ec_demo'
}

app.use(bodyParser())



ecRouter.setConfig({
    dbConf:dbConf,
    tbPrefix:'',
    //allowMethod:['get','head']
})
app.use(ecRouter.dispatcher())

app.listen(3000)
console.log('[demo] listen at port 3000')