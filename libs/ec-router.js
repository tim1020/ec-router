/**
 * ec-Router
 * @Author: Tim<tim8670@gmail.com>
 * An auto & easy router for koa2
 */

const log         = require('./log')
const controller  = require('./controller')
const mysql       = require('mysql')
const fs          = require('fs');

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
    controllerHook  : '_hook', //controller hook name
    allowMethod     : ['get','post','put','delete'],
    tbPrefix        : 'res_',
    /**
     * db config,set if need auto RESTful service 
     * @type {[object]}
     * {
     *  driver: 'mysql' 
     *  //other conf see driver package
     *  connectionLimit : ,
     *   host            : '',
     *   port            : ,
     *   user            : '',
     *   password        : '',
     *   database        : ''
     * }
     */
    dbConf          : {},
    hotLoad         : true
}

class EcRouter {
    constructor(){
    }
    //modify default config
    setConfig(conf){
        log.d("--setConfig--")
        for(let c in conf){
            if(config[c] != undefined){
                let val =  conf[c]
                if(c == 'allowMethod'){ 
                    val = []
                    for(let m in conf.allowMethod){
                        val.push(conf.allowMethod[m].toLowerCase())
                    }
                }
                config[c] = val
            }
        }
        log.d(config)
    }
    //hotLoad
    loadConfig(cf){
        log.d('--loadConfig--')
        let conf = require(cf)
        let setConfig = this.setConfig
        setConfig(conf)
        //to be fix: will call twice on win
        if(config.hotLoad){
            fs.watch(cf, (event,filename) => {
                log.d('--config hot reload--')
                try{
                    if(event !== 'change'){
                        throw new Error(event+" event,skip...")
                    }
                    let path = require.resolve(cf);
                    require.cache[path] && (require.cache[path] = null);
                    conf = require(cf)
                    setConfig(conf)
                }catch(e){
                    log.d('[err] loadConfig fail, '+ e.toString())
                }
            })
        }
    }
    // dispatch route, koa2 middleware method
    dispatcher(){
        log.d("--dispatcher--")
        if([1,2,3].indexOf(config.type) == -1){ //not supported type,throw error
            throw new Error('route type unexpected',500);
        }
        let cDir     = process.cwd() + '/'+ config.controllerPath;
        let controllers  = controller.load(cDir)
        //hot load
        if(config.hotLoad){
            fs.watch(cDir, {recursive:true}, (event,filename) => {
                log.d('--controller hot reload--')
                try{
                    controllers = controller.load(cDir)
                }catch(e){
                    log.d('[err] loadController fail, '+ e.toString())
                }
            })
        }

        let dbUtil = null

        return async (ctx, next) => {
            log.d("--on request--")
            log.d(config)
               
            let uri = ctx.request.path == '/' ? config.uriDefault : ctx.request.path
            let reqMethod = ctx.request.method.toLowerCase()
            log.d({method:reqMethod,uri:uri})
            
            if(uri.toLowerCase()  == '/favicon.ico'){
                return
            }

            if(config.allowMethod.indexOf(reqMethod) == -1){ 
                ctx.response.status  = 405
                ctx.response.message = 'Method Not Allowed -- '+ ctx.request.method
                log.d("method not allowed")
                return
            }

            if(config.uriPrefix != ''){ //remove prefix if uriPrefix】not empty
                if(uri.indexOf(config.uriPrefix) !== 0){ //404 prefix not found
                    log.d('uri prefix not exists -- '+ config.uriPrefix)
                    return
                }else{ 
                    uri = uri.replace(config.uriPrefix,'')
                }
            }
            
            let path      = uri.split("/")
            let [, resource, action] = path
            //inter redirect
            ctx.go = ( ...params) => {
                log.d("ctx.go called, params="+params.join(","))
                if(params.length == 1){
                    action = params[0]
                }else if(params.length == 2){
                    resource = params[0]
                    action   = params[1]
                }else{
                    throw new Error('ctx.go params error, except go(action) or go(control,action)',500);
                }
                if(controllers[resource]){ 
                    let c = controllers[resource]
                    if(c[action]){
                        c[action](ctx)
                        return
                    }
                }
                log.d("ctx.go target not found -- controller="+resource+",action="+action)
            }

            if(config.type == 1){
                log.d('--RESTful route--')
                log.d({method:reqMethod,res:resource,resId:action})
                let resourceId = action || 0
                ctx.req.resourceId = resourceId //set resourceId
                ctx.req.resource   = resource   //set resource

                if(controllers[resource]){ 
                    log.d("found controller file")
                    let c = controllers[resource]

                    if(c[reqMethod] || c.all){
                        if(!c[reqMethod]){ //not reqMethod,match "all"
                            log.d("reqMethod "+reqMethod+" rewrite to 'all'")
                            reqMethod = 'all'
                        }
                        log.d("route ok")
                        log.d({controller:resource,action:reqMethod})

                        if(controllers[config.controllerHook].before){ //hook before
                            log.d('--onbefore controller--')
                            controllers[config.controllerHook].before(ctx)
                        }
                        log.d('--call controller action--')
                        c[reqMethod](ctx)
                        if(controllers[config.controllerHook].after){ //hook after
                            log.d('--onafter controller--')
                            controllers[config.controllerHook].after(ctx)
                        }
                        await next()
                        return
                    } 
                }

                log.d("custom controller not match")
                if(config.dbConf.driver){ //auto RESTful on
                    log.d("--Auto RESTful on "+config.dbConf.driver+"--")
                    try{
                        if(dbUtil == null){
                            log.d("--db init--")
                            log.d({dbconf:config.dbConf})
                            dbUtil = await require('./dbUtil').init(config.dbConf)
                            log.d("--db init finished--")
                        }
                        let tbName = config.tbPrefix + resource
                        log.d('--query begin--')
                        log.d({tbname:tbName})
                        let data = await dbUtil.exec(reqMethod, tbName, resourceId, ctx.request)
                        log.d('--query finished--')
                        ctx.body = {code:0, data:data}
                    }catch(e){
                        log.d('sql error:'+ e.toString())
                        //ctx.response.status = 500
                        ctx.response.body = {code: "0x"+ e.errno, error:e.code}
                    }
                }
            }else{ //Path or QueryString
                if(config.type == 3){ //querystring,reParse resource,action
                    if(path.length != 2 || resource != config.uriApiName){
                        log.d('api name not exists -- '+ config.uriApiName)
                        return
                    }
                    let params = ctx.request.query
                    resource   = params[config.uriCParam] || ''
                    action     = params[config.uriAParam] || ''
                }
                log.d("--normal route type--")
                log.d({resource:resource, action:action})
                if(controllers[resource]){ 
                    let c = controllers[resource]
                    if(c[action] || c.all){
                        if(!c[action]){ //action not found, rewrite to "all"
                            log.d("action "+action+" not found, rewrite to 'all'")
                            action = 'all'
                        }
                        log.d("route ok")
                        log.d({controller:resource,action:action})
                        if(controllers[config.controllerHook].before){ //hook before
                            log.d('--onbefore controller--')
                            controllers[config.controllerHook].before(ctx)
                        }
                        log.d('--call controller--')
                        c[action](ctx)
                        if(controllers[config.controllerHook].after){ //hook after
                            log.d('--onafter controller--')
                            controllers[config.controllerHook].after(ctx)
                        }                      
                    }else{ //404
                        log.d("action not exists -- "+ action)
                    }
                }else{
                    log.d("controller not exists -- " + resource)
                }
                //Path and QueryString not support auto service
            }
            await next()
        }
    }
}


module.exports = new EcRouter(config)