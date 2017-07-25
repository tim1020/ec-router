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
        let f        = controllerFiles[k]
        let fullPath = directory+'/'+f
        let resource = path.basename(f,'.js')
        let resPath  = require.resolve(fullPath);
        require.cache[resPath] && (require.cache[resPath] = null);
        let actions = require(fullPath)
        //todo: check actions
        result[resource] = actions
    }
    log.d({result:result})
    return result
};