/**
 * ec-Router
 * @Author: Tim<tim8670@gmail.com>
 * An auto & easy router for koa2
 */

const path        = require('path')
const log         = require('./log')
const controller  = require('./controller')

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
    allowMethod     : ['get','post','put','delete']
}

class EcRouter {
    constructor(config){
        this.config = config
    }
    //modify default config
    setConfig(conf){
        log.d(">>setConfig")
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
        if([1,2,3].indexOf(this.config.type) == -1){ //not supported type,throw error
            throw new Error('route type unexpected',500);
        }
        let cDir        = path.dirname(require.main.filename) + '/'+ this.config.controllerPath;
        let controllers = controller.load(cDir)

        return async (ctx, next) => {
            let uri         = ctx.request.path == '/' ? this.config.uriDefault : ctx.request.path
            log.d('uri='+uri)
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
            log.d('resource='+resource+",action="+action)

            if(this.config.type == 1){
                let resourceId = action || 0
                action = ctx.request.method.toLowerCase()
                if(controllers[resource]){ 
                    let c = controllers[resource]
                    if(c[action]){
                        c[action](ctx)
                        await next()
                        return
                    }else if(c.all){
                        c.all(ctx)
                        await next()
                        return
                    }
                }
                //not custom, auto RESTful service
                log.d("not custom,default handler -- method="+action+",resource="+resource)
                if(this.config.allowMethod.indexOf(action) == -1){ 
                    ctx.response.status  = 405
                    ctx.response.message = 'Method Not Allowed -- '+ ctx.request.method
                }else{
                    ctx.response.status = 404
                    ctx.response.message = 'Not Found'
                    //todo: auto RESTful service
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
                log.d("normal -- resource="+resource+",action="+action)
                if(controllers[resource]){ 
                    let c = controllers[resource]
                    if(c[action]){
                        c[action](ctx)
                    }else{
                        ctx.response.status  = 404
                        ctx.response.message = 'Not Found -- action('+action+') not exists'
                    }
                }else{
                    ctx.response.status  = 404
                    ctx.response.message = 'Not Found -- controller('+resource+') not exists'
                }
                //Path and QueryString not support auto service
            }
            await next()
        }
    }
}


module.exports = new EcRouter(config)