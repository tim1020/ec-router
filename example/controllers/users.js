module.exports = {
    get : (ctx) => {
        ctx.myHeader += 'main'
        ctx.body = "get_users"
    },
    _any:(ctx) => {
        ctx.body = "all_users"
    }
}