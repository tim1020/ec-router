module.exports = {
    //do before all controller action
    before : (ctx) => {
        ctx.myHeader = 'before_'
    },

    //do after all controller action
    after: (ctx) => {
        ctx.myHeader += '_after'
        ctx.set('_hook',ctx.myHeader)
    },

    error:(ctx,err) =>{
    	ctx.status = err.code
    	ctx.body = err.error
    	//console.log(err)
    }
}