# ec-router
An auto router middleware for koa2 

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](http://opensource.org/licenses/MIT)


## feature
1. router middleware for koa2
2. auto route
    
    route by rule, route file、mapper table is No longer needed 
    
3. auto RESTful service
    
    build  RESTful Api server codeless

## install

```
npm install ec-router --save
```

or download from git  [https://github.com/tim1020/ec-router]

## route type

### type=1

route by Uri and request method like **RequestMethod /res/[:resourceId]**

**/res** is resource name (table name)

**RequestMethod** as controller action,like get,post,put,delete etc.

**eg.**

**[GET /res]**  route to controller=res.js ,  method=get

**[POST /user]** rote to controller=user.js, method=post

if controller not exists method named **[RequestMethod]**, then look for **[all]** method. 


### type=2

route by Path like **/controller/action**

**[/User/list]**  route to controller=User.js,method=list 

**[/User/add]**  route to controller=User.js,method=add

### type=3

route by QueryString like **/api?c=controller&a=action**

**[/?c=User&a=list]**  route to controller=User.js,method=list 

**[/?c=User&a=add]**  route to controller=User.js,method=add

## Usage

### koa app main

```
//index.js
const Koa = require('koa')
const app = new Koa()
const ecRouter = require('ec-router')

//use other middleware
//app.use(bodyParser())

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
    all: (ctx) => {
        //other method
    }
}
```

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
    allowMethod     : ['get','post','put','delete'] //allowed request method whitelist
}
```
## see

[mysql pool](https://github.com/mysqljs/mysql#pool-options)

## License

MIT is open-sourced software licensed under the [MIT license](http://opensource.org/licenses/MIT).

##
Forgot my ugly english, and enjoy it~!
