module.exports = {
    get : (ctx) => {
        ctx.body = "hello, from [/res/get] or [GET /res]"
    },
    lst : (ctx) => {
        ctx.go('get')
    },
    all:(ctx) => {
        //match all other,if need auto RESTful,reomve this action
    }
}