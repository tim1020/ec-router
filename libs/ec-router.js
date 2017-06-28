/**
 * ec-Router
 * @Author: Tim<tim8670@gmail.com>
 * An auto & easy router for koa2
 */

const path        = require('path')
const log         = require('./log')
const controller  = require('./controller')
const mysql       = require('mysql')

//default config
let config = {
    /**
     * route type
     * 1(default) [Auto RESTful] -- [GET/POST/PUT/DELETE] /uriPrefix/resourceName/[resourceId]
     * 2 [Path] -- /uriPrefix/controllerName/actionName
     * 3 [QueryString] -- /uriPrefix/uriApiName?c=controllerName&a=actionName (use uriCParam,uriAParam set param key)
     */
    type            : 1,
    uriApiName      : 'index',
    uriCParam       : 'c',
    uriAParam       : 'a',
    uriPrefix       : '', //start with "/",or empty string
    uriDefault      : '/index',
    controllerPath  : 'controllers', //set controller files path (relative app root), default is 'controllers'
    allowMethod     : ['get','post','put','delete'],
    tbPrefix        : 'res_',
    /**
     * db config,set if need auto RESTful service 
     * @type {[object]}
     * {
     *  driver: 'mysql' //or mongodb...
     *  //other conf see driver package
     * }
     */
    dbConf          : {}, 
}

class EcRouter {
    constructor(config){
        this.config = config
    }
    //modify default config
    setConfig(conf){
        log.d("--setConfig--")
        for(let c in conf){
            if(this.config[c] != undefined){
                let val =  conf[c]
                if(c == 'allowMethod'){ 
                    val = []
                    for(let m in conf.allowMethod){
                        val.push(conf.allowMethod[m].toLowerCase())
                    }
                }
                this.config[c] = val
            }
        }
        log.d(this.config)
    }
    // dispatch route, koa2 middleware method
    dispatcher(){
        log.d("--dispatcher--")
        if([1,2,3].indexOf(this.config.type) == -1){ //not supported type,throw error
            throw new Error('route type unexpected',500);
        }
        let cDir        = path.dirname(require.main.filename) + '/'+ this.config.controllerPath;
        let controllers = controller.load(cDir)
        let dbUtil = null
        if(this.config.type == 1 && this.config.dbConf.driver){
            log.d("--db init--")
            log.d({dbconf:this.config.dbConf})
            dbUtil = require('./dbUtil').init(this.config.dbConf)
        }

        return async (ctx, next) => {
            log.d("--on request--")
            let uri = ctx.request.path == '/' ? this.config.uriDefault : ctx.request.path
            let reqMethod = ctx.request.method.toLowerCase()
            log.d({method:reqMethod,uri:uri})

            if(this.config.allowMethod.indexOf(reqMethod) == -1){ 
                ctx.response.status  = 405
                ctx.response.message = 'Method Not Allowed -- '+ ctx.request.method
                log.d("method not allowed")
                await next()
                return
            }

            if(this.config.uriPrefix != ''){ //remove prefix if uriPrefix】not empty
                if(uri.indexOf(this.config.uriPrefix) !== 0){ //404 prefix not found
                    ctx.response.status  = 404
                    ctx.response.message = 'Not Found -- uri prefix('+this.config.uriPrefix+') not exists'
                    await next()
                    return
                }else{ 
                    uri = uri.replace(this.config.uriPrefix,'')
                }
            }
            
            let path      = uri.split("/")
            let resource  = path[1] || ""  //resource or controllerName
            let action    = path[2] || ""  //action or resourceId

            if(this.config.type == 1){
                log.d('--RESTful route--')
                log.d({method:reqMethod,res:resource,resId:action})
                let resourceId = action || 0
                ctx.req.resourceId = resourceId //set resourceId
                ctx.req.resource   = resource   //set resource

                if(controllers[resource]){ 
                    log.d("found controller file")
                    let c = controllers[resource]
                    if(c[reqMethod]){
                        c[reqMethod](ctx)
                        log.d("route ok")
                        log.d({controller:resource,action:reqMethod})
                        await next()
                        return
                    }else if(c.all){
                        c.all(ctx)
                        log.d("route ok")
                        log.d({controller:resource,action:'all'})
                        await next()
                        return
                    }
                }
                log.d("custom controller not match")
                //not custom, auto RESTful service
                if(dbUtil){
                    log.d("--auto RESTful service handler--")
                    let tbName = this.config.tbPrefix + resource
                    try{
                        log.d('--query begin--')
                        log.d({db:this.config.dbConf.driver})
                        let data = await dbUtil.exec(reqMethod, tbName, resourceId, ctx.request)
                        log.d('--query finished--')
                        ctx.body = {code:0, data:data}
                    }catch(e){
                        log.d('sql error:'+ e.toString())
                        //ctx.response.status = 500
                        ctx.response.body = {code: "0x"+e.errno,error:e.code}
                    }
                }else{
                    log.d('!!! db init fail !!!')
                    log.d("!!! auto RESTful service not work !!!")
                }
            }else{ //Path or QueryString
                if(this.config.type == 3){ //querystring,reParse resource,action
                    if(path.length != 2 || resource != this.config.uriApiName){
                        ctx.response.status  = 404
                        ctx.response.message = 'Not Found -- api name('+this.config.uriApiName+') not exists'
                        await next()
                        return
                    }
                    let params = ctx.request.query
                    resource   = params[this.config.uriCParam] || ''
                    action     = params[this.config.uriAParam] || ''
                }
                log.d("--normal route type--")
                log.d({resource:resource, action:action})
                if(controllers[resource]){ 
                    let c = controllers[resource]
                    if(c[action]){
                        c[action](ctx)
                        log.d("route ok")
                        log.d({controller:resource,action:action})
                    }else{
                        ctx.response.status  = 404
                        ctx.response.message = 'Not Found -- action('+action+') not exists'
                        log.d("action not exists")
                    }
                }else{
                    ctx.response.status  = 404
                    ctx.response.message = 'Not Found -- controller('+resource+') not exists'
                    log.d("controller not exists")
                }
                //Path and QueryString not support auto service
            }
            await next()
        }
    }
}


module.exports = new EcRouter(config)