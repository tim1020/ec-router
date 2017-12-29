module.exports = {
    get : async (ctx) => {
        ctx.body = "hello, from [/res/get] or [GET /res]"
    },
    lst : async (ctx) => {

    },
    _any: async (ctx) => {
        //match any other,if need auto RESTful,reomve this action
    }
}