# ec-router [![License](https://img.shields.io/badge/license-MIT-blue.svg)](http://opensource.org/licenses/MIT)

An auto router middleware for koa2 [中文版文档点这里](https://github.com/tim1020/ec-router/blob/master/README_CN.md)

## feature

1. router middleware for koa2
2. auto route
    
    route by rule of uri, route file、mapper table is No longer needed 
    
3. auto RESTful service
    
    build  RESTful Api server auto, use mysql or mongeodb

4. hook before or after controller 

## install

```
npm install ec-router --save
```

or download from git  [https://github.com/tim1020/ec-router]

## route type

### [RESTful] type=1

route by Uri and request method like **RequestMethod /res/[:resourceId]**

**/res** is resource name (table name or mongodb's collection with [tbPrefix])

**RequestMethod** as controller action,like get,post,put,delete etc.

**eg.**

**[GET /res]**  route to controller=res.js ,  method=get

**[POST /user]** rote to controller=user.js, method=post

if controller not exists method named **[RequestMethod]**, then look for **[all]** method. 


### [by Path] type=2

route by Path like **/controller/action**, if controller not exists method named **[action]**, then look for **[all]** method. 

**[/User/list]**  route to controller=User.js,method=list 

**[/User/add]**  route to controller=User.js,method=add

### [by QueryString] type=3

route by QueryString like **/apiName?c=controller&a=action**, if controller not exists method named **[action]**, then look for **[all]** method. 

**[/?c=User&a=list]**  route to controller=User.js,method=list 

**[/?c=User&a=add]**  route to controller=User.js,method=add


## Usage


### koa app main

```
//index.js
const Koa = require('koa')
const app = new Koa()
const ecRouter = require('ec-router')

process.env.NODE_ENV = 'dev' //open debug log

//use other middleware
//if need auto RESTful service, bodyParser is required before ec-router
app.use(bodyParser())

//change default config
ecRouter.setConfig({
    type:1,
    allowMethod:['Get','POST']
})
app.use(ecRouter.dispatcher())

//use other middleware

app.listen(3000)

```

### controller

> put controller file into [AppRoot]/controllers/ 
	
	(can modify in config)

> controller filename、action Uri and table resource Name is Case Sensitive 

```
//user.js
module.exports = {
    get : (ctx) => {
		//ctx.req.resourceId  //effective when type=1,
        //ctx.req.resource
        ctx.body = "get User"
    },
    post: (ctx) => {
        ctx.body = "post user"
    },
    //You can call an other action use ctx.go()
    go: (ctx) => {
        //ctx.go('user','get') //ctx.go('controller','action')
        ctx.go('get') //ctx.go('action')

        //other code will go on
    },
    //method "all" will match all of action
    all: (ctx) => {
        //other method
    }
}
```


### controller hook

if you want to do something before or after every controller action, build a hook controller name  "_hook.js", and exported method "before"、"after" 

```
//_hook.js
module.exports = {
    //do before all controller action
    before : (ctx) => {
        console.log('controller start')
    },

    //do after all controller action
    after: (ctx) => {
        console.log('controller finish')
    },
}
```

> "_hook" can be modify use confing **[controllerHook]** 


### config

> You can change default config by ***ecRouter.setConfig*** method

```
{
    type            : 1,                //route type 1(by requestMethod Uri),2 (by path),3 (by querystring)
    uriApiName      : 'index',          //apiname?c=xx&a=x ,effective when type=3
    uriCParam       : 'c',              //controller param key, effective when type=3
    uriAParam       : 'a',              //action param key,effective when type=3
    uriPrefix       : '',               //the Uri prefix,eg. [/api]/resource,if set,start with "/"
    uriDefault      : '/index',         //reset Uri when path="/"
    controllerPath  : 'controllers',    //set controller files path (relative app root)
    controllerHook  : '_hook',			//controller hook name
	allowMethod     : ['get','post','put','delete'] //allowed request method whitelist
    tbPrefix        : 'res_',           //the tableName prefix of RESTful service's resrouce
    dbConf          : {                 //auto RESTful service db
        driver: 'mysql',				//mysql or mongodb
        connectionLimit : ,
        host            : '',
        port            : ,
        user            : '',
        password        : '',
        database        : ''
    }
    //see [mysql pool](https://github.com/mysqljs/mysql#pool-options) for more
}


```

## auto RESTful service

if need auto RESTful service, set config of:

```
type:1
dbConf:{
    
}
```

the RESTful request handle:

1. search controller and action, exec this action and return if found
2. If not found, build SQL by request param、request method、querystring ,then exec this SQL and return results

SQL build examples :

**[GET /task]**  

SELECT * FROM res_task

**[GET /task/12]** 

SELECT * FROM res_task WHERE id=12

**[POST /task]**

INSERT INTO res_task SET k=v,k=v (k,v is the request.body key paris)

**[PUT /task/12]**

UPDATE res_task SET k=v,k=v WHERE id=12

**[DELETE /task/12]**

DELETE res_task WHERE id=12


> PUT,DELETE must set /resurce/[:resourceId]

> PUT,POST need request.body key paris, so you need to use bodyParser before ec-router



GET can set WHERE,ORDER,LIMIT,FIELDS by querystring like:

```
GET /task/?where=xxx&order=xxx&limit=xxx

```

>

> order=field1,field2 desc

> limit=[offset,]nums  //if not limit,default 100 is set

> fields=a,b alias_b,c as alias_c   //alias only for mysql


>where="cond1 and cond2 [or] cond3 [and] cond4 or cond5" // (cond1 and cond2) or cond3 and (cond4 or cond5)

> for mongodb,where=cond1,cond2,cond3 // "，" means "and"



## License

MIT is open-sourced software licensed under the [MIT license](http://opensource.org/licenses/MIT).

##
Forgot my ugly english, and enjoy it~!
