module.exports = {
    get : (ctx) => {
        ctx.body = "hello, from [/res/get] or [GET /res]"
    },
    all:(ctx) => {
        //match all other,if need auto RESTful,reomve this action
    }
}