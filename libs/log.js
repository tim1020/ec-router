//debug log for dev mode

exports.d = function (msg) {
    if(process.env.NODE_ENV && process.env.NODE_ENV == 'dev'){
        if(typeof msg == 'object') msg = JSON.stringify(msg)
        msg = "[ec-router] "+msg
        console.log(msg)
    }
}