//debug log for dev mode

exports.d = function (msg) {
    if(process.env.NODE_ENV && process.env.NODE_ENV == 'dev'){
        console.log(msg)
    }
}