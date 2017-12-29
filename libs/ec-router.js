/**
 * ec-Router
 * @Author: Tim<tim8670@gmail.com>
 * An auto & easy router for koa2
 */

const log         = require('./log')
const controller  = require('./controller')
const fs          = require('fs');

//default config
let config = {
    /**
     * route type
     * 1(default) [RESTful] -- [GET/POST/PUT/DELETE] /uriPrefix/resourceName/[resourceId]
     * 2 [Path] -- /uriPrefix/controllerName/actionName
     * 3 [QueryString] -- /uriPrefix/uriApiName?c=controllerName&a=actionName (use uriCParam,uriAParam set param key)
     */
    type            : 1,
    uriApiName      : 'index',
    uriCParam       : 'c',
    uriAParam       : 'a',
    uriPrefix       : '', //start with "/",or empty string
    uriDefault      : '/index',
    apiVer          : false, //api version required ?
    apiVeRegex      : /^v?(\d){1,2}(\.[\d]{1,2})?$/, //api version regex
    controllerPath  : 'controllers', //set controller files path (relative app root), default is 'controllers'
    allowMethod     : ['get','post','put','delete','options'],
    hotLoad         : true
}

class EcRouter {
    constructor(){}
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
            throw new Error('route type unexpected');
        }
        let apiVerRegex = null
        
        let cDir     = process.cwd() + '/'+ config.controllerPath;
        let cFiles  = controller.load(cDir)
        //hot load
        if(config.hotLoad){
            fs.watch(cDir, {recursive:true}, (event,filename) => {
                log.d('--controller hot reload--')
                try{
                    cFiles = controller.load(cDir)
                }catch(e){
                    log.d('[err] loadController fail, '+ e.toString())
                }
            })
        }
        let controllers = cFiles
        return async (ctx, next) => {
            log.d("--on request--")
            log.d(config)
            try{
                let uri = ctx.request.path == '/' ? config.uriDefault : ctx.request.path
                let reqMethod = ctx.request.method.toLowerCase()
                log.d({method:reqMethod,uri:uri})
                
                if(config.allowMethod.indexOf(reqMethod) == -1){ 
                    log.d("method not allowed")
                    throw {code:405,error:'method '+reqMethod+ ' not allowed'}
                }

                if(reqMethod == 'options'){ //_hook not load yet
                    ctx.status = 204
                    await next()
                    return
                }

                if(config.uriPrefix != ''){ //remove prefix if uriPrefix not empty
                    if(uri.indexOf(config.uriPrefix) !== 0){ //404 prefix not found
                        log.d('uri prefix not exists -- '+ config.uriPrefix)
                        throw {code:404,error:'Not Found: uri prefix not exists'}
                    }else{ 
                        uri = uri.replace(config.uriPrefix,'')
                    }
                }
                let path        = uri.split("/")
                let apiVer      = ''
                path.shift()
                if(config.apiVer && config.apiVeRegex){
                    if(!config.apiVeRegex.test(path[0])){
                        log.d("api version not match")
                        throw {code:404,error:'Not Found: api version not match'}
                    }
                    //test ok
                    apiVer = path.shift()
                    if(!cFiles[apiVer]){
                        log.d("this version api not found")
                        throw {code:404,error:'Not Found: api version not exists'}
                    }
                    controllers = cFiles[apiVer]
                }
                log.d('api ver = '+apiVer)
                let [resource, action] = path
                let resourceId = 0
                if(config.type == 1){
                    log.d('--RESTful route--')
                    log.d({res:resource,resId:action,action:reqMethod})
                    resourceId = action || 0
                    ctx.req.resourceId = resourceId //set resourceId
                    ctx.req.resource   = resource   //set resource
                    action = reqMethod
                } else if(config.type == 3){ //querystring,reParse resource,action
                    if(path.length != 1 || resource != config.uriApiName){
                        log.d('api name not exists -- '+ config.uriApiName)
                        throw {code:404,error:'Not Found: miss api name'}
                    }
                    let params = ctx.request.query
                    resource   = params[config.uriCParam] || ''
                    action     = params[config.uriAParam] || ''
                }
                ctx.ecRouter = {resource,action,resourceId}

                let c = controllers[resource] || controllers['_any']
                if(c != undefined){ 
                    log.d("found controller file: "+ ( controllers[resource]? resource:  '_any'))
                    if(c[action] || c._any){
                        if(!c[action]){ //not action,match "all"
                            log.d('forward to action: _any')
                            action = '_any'
                        }
                        log.d("route ok")
                        log.d({controller:resource,action:action})

                        if(controllers['_hook'].before){ //hook before
                            log.d('--onbefore controller--')
                            await controllers['_hook'].before(ctx)
                        }
                        log.d('--call controller action--')
                        await c[action](ctx)
                        if(controllers['_hook'].after){ //hook after
                            log.d('--onafter controller--')
                            await controllers['_hook'].after(ctx)
                        }
                        await next()
                        log.d('--request finished--')
                        return
                    }
                }
                throw {code:404,error:'Not Found: controller or action not found'}
            } catch(err) {
                log.d('exception: '+err)
                if(controllers['_hook'].error){
                    await controllers['_hook'].error(ctx,err)
                }
                await next()
                log.d('--request finished--')
                return
            }
        }
    }
}


module.exports = new EcRouter()