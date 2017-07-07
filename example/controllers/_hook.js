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