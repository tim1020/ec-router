//auto load controller
const fs    = require("fs")
const path  = require("path")
const log   = require('./log')

exports.load = function (directory) {
    log.d("--loadController--")
    log.d({dir: directory})
    let controllerFiles =  fs.readdirSync(directory).filter(f => {
        return f.endsWith('.js')
    })
    log.d({files:controllerFiles})
    let result = {} 
    for (let k in controllerFiles) {
        let f = controllerFiles[k]
        let resource = path.basename(f,'.js')
        let actions = require(directory+'/'+f)
        result[resource] = actions
    }
    log.d({result:result})
    return result
};