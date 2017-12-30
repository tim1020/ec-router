# ec-router [![License](https://img.shields.io/badge/license-MIT-blue.svg)](http://opensource.org/licenses/MIT)

一个简单易用的koa2路由中间件，提供规则路由功能，不再需要复杂无趣的路由文件，路由影射表等。


## feature

1. koa2路由中间件

2. 根椐请求方法及URI进行自动路由

3. 控制器钩子，支持before,after,error

4. 配置文件及控制器热重载

## change log

如果你之前使用过ec-router，请注意新版本为了保持router的功能单一性，相对旧版本，作了比较大的简化，修改如下：

1. 去掉了自动装载数据库进行自动RESTful的功能,如果你需要此功能，请参考本文档后面的使用例子自行实现。

2. 增加_any控制器，处理无法匹配的的resource

3. 在hook中增加error方法，处理路由过程抛出的错误

4. 默认的控制器方法名称由all改为_any

5. 将resource、resourceId和action注入到 ctx.ecRouter

## install

```
npm install ec-router --save
npm test

```

也可从 [git仓库](https://github.com/tim1020/ec-router) 中下载源码，放到你项目的node_modules目录

## URI格式说明

```
 http://domain[:port]/[prefix]/[apiver]/path
 ```


**[prefix]** : 表示路径前缀（可为空），可在config中设置

**[apiver]** : 表示api的版本，在config中设置 apiVer 为true时生效，
版本规则由apiVeRegex定义，默认规则为两位版本号，比如v1.0,v11,v2,11,12.22

**path** : 为具体资源路径，根椐不同的路由类型有不同


ec-router根椐请求的方法、路径或查询参数，自动分析得出controller(resource)和action，再调用相应的方法来处理。

如果对应的controller没有找到，会在controllers目录查找_any.js来代替（使用者可在此控制器内用_any方法来实现自动处理RESTful请求）

如果对应的action没有找到，则查找_any方法代替。

如果都找不到，则抛出异常，进入_hook的error方法处理（如果有的话）


## route type

### type=1, RESTful方式

本方式使用RESTful访问，根椐请求方法和请求的资源名称、ID来处理，比如：

```
GET /res/12    // => controller=res,method=get
POST /User     // => controller=user,method=post
PUT /user/11   // => controller=user,method=put
```

其中的"res"和"user"表示资源名称


### type=2,Path方式

本方式根椐路径匹配控制器和控制器方法, path的格式为： /controller/action


如:

```
/res/list      // => controller=res, method=list
/user/add      // => controller=user, method=add
/user          // => controller=user, method=any
```


该方式不区分请求方法，可在实现控制器时根椐需求自行判断


### type=3,QueryString方式

本方式使用请求字符串进行路由判断，比如：**/apiName?c=controller&a=action**,查找controller及action的方式同type=2

(其中c,a为参数名称，可在config中修改)

如：

```
/index?c=user&a=list  // => controller=uer, method=list 
/index?c=user&a=add   // => controller=user, method=add
/index?c=user&a=      // => controller=user, method=any
```

此方法同样不区分请求方法，可在实现控制器时根椐需求自行判断


## Usage


### koa app main

```
//index.js
const Koa = require('koa')
const app = new Koa()
const ecRouter = require('ec-router')

process.env.NODE_ENV = 'dev' //开启debug log

//加载其它中间件
//如果需要自动RESTful服务，需要使用bodyParser之类的请求内容解释中间件来预处理请求参数
app.use(bodyParser())

//修改ec-router的默认配置
ecRouter.loadConfig(__dirname+'/ec-config.js')
app.use(ecRouter.dispatcher())

//use other middleware

app.listen(3000)

```

### 热加载

当在配置文件中设置了hotLoad=true(缺省值)时，ec-router支持配置文件及controller的热加载(hotLoad配置的修改不支持热更新)

如果需要使用热加载，请将配置独立成模块，再使用 ```ecRouter.loadConfig('./config.js')``` 代替 ```ecRouter.setConfig(conf)```

### controller

ec-router通过dispatch将不同的请求路由到不同的控制器方法，默认地，需要将控制器文件放置在APP根目录下的controllers目录（可在配置中修改)


1. 控制器文件名、控制器方法、资源名称等大小写敏感

2. 控制器方法的函数原型是 async (ctx) =>{} 

3. type=1时,使用get,post,put,delete来命名对应的控制器方法，type非1时，可以自行定义（对应path或querystring中的action命称），可以定义_any方法来适配不存在的方法。


```

// controllers/user.js
module.exports = {
    get : async (ctx) => {
        //ctx.req.resourceId  //effective when type=1,
        //ctx.req.resource
        ctx.body = "get User"
    },
    post: async (ctx) => {
        ctx.body = "post user"
    },
    //当action无法匹配以上方法时，会自动匹配为此方法
    _any: async (ctx) => {
        //other method
    }
}

```

### api version

对于是否应该在URI中添加api的version，不同的人有不同的看法，ec-router建议的方式在你需要版本控制时，在URI中添加。

1. 配置中设置 apiVer为true
2. 需在controllers目录下创建版本目录，并将控制文件放到相应的版本目录，如 : 路径/v1/res，会路由到 controllers/v1/res.js。

> 如果你希望使用Accept的media type或其它header来控制版本，可以在_any控制器的_any方法中，判断并依靠获得的版本号及注入到ctx.ecRouter的resource,action来require相应版本的控制器


### 通用controller

> 通用controller需要使用者自行定义并放置在controller目录，该节说明通用控制器的用途及实现方法。

#### before和after钩子

如果需要在每个控制器方法执行之前或之行都执行一些逻辑，可以使用钩子，方法是：

1. 在 controllers目录下放置控制器钩子,文件名为 _hook.js
2. 在_hook.js中实现并导出before或after方法(可同时或单独前后添加钩子)，方法原型与普通controller方法一样


```
module.exports = {
    //do before all controller action
    before : async (ctx) => {
        ctx.set("Access-Control-Allow-Origin", "*") 
        ctx.set("Access-Control-Allow-Headers", "Origin, Content-Type") 
    },

    //do after all controller action
    after: async (ctx) => {
        console.log('controller finish')
    },
    //路由时抛错的处理
    error: async(ctx,err) =>{

    }
}
```

注意：只有控制器能正常执行，before和after才能被执行，如果在调用控制器之前抛错或返回了，before和after也不会执行。

#### 默认控制器

当找不到指定的controller时，ec-router会去查找controller目录下的_any.js作为默认控制器。

使用该特性，可以实现自动的RESTful服务:

```
//_any.js
module.exports = {
    get : async (ctx) => {
        //根椐ctx.ecRouter.resource ，ctx.ecRouter.resourceId及其它query参数自动从数据库获取内容输出
    },
    post: async (ctx) => {
        //实现更新数据
    },
}
```

#### 错误控制器

在碰到无法正常处理的请求时，ec-router会抛出异常，并在最后catch这些异常，传递给_hook.js控制器的error方法处理（如果没有则只输出到控制台）

### config

可以在调用ec-router.dispatcher之前使用loadConfig来修改默认配置（config文件只需定义不使用默认值的项）

```
{
    type            : 1,                //路由方式
    uriApiName      : 'index',          //使用querystring方式时，指定API文件名，即/apiName?c=xx&m=xx
    uriCParam       : 'c',              //使用querystring方式时，指定控制器的参数名
    uriAParam       : 'a',              //使用querystring方式时，指定控制器方法的参数名
    uriPrefix       : '',               //API路径前缀，如: /prefix/controller/action
    uriDefault      : '/index',         //默认uri path
    apiVer          : false,            //是否支持版本声明
    apiVeRegex      : /^v?(\d){1,2}(\.[\d]{1,2})?$/, //版本规则,
    controllerPath  : 'controllers',    //控制器文件所在目录，相对于app根目录
    allowMethod     : ['get','post','put','delete','options'] //允许的请求方法
}
```

### 数据访问

ec-router并不包括数据访问的处理，以下只是一些建议：

1. 通过koa的middleware,建立一个数据连接的中间件，建立和获取连接，并将连接句柄注入为ctx.dbconn，然后可以在controller中使用
2. 通过_hook的before建立数据连接获取，注入ctx.dbconn
3. 建立dao基类，然后在其之上实现各对象的dao,直接使用dao调用

## License

MIT is open-sourced software licensed under the [MIT license](http://opensource.org/licenses/MIT).

## Author

Tim<tim8670@gmail.com>