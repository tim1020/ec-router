//auto load controller
const fs    = require("fs")
const path  = require("path")
const log   = require('./log')

let result = {}

const addControlFile = (dir,f,ver) =>{
    if(!f.endsWith('.js')) return
    let fullPath = dir+'/'+f
    let resource = path.basename(f,'.js')
    let resPath  = require.resolve(fullPath);
    require.cache[resPath] && (require.cache[resPath] = null);
    let actions = require(fullPath)
    //todo: check actions
    
    if(ver) {
        result[ver][resource] = actions
    }
    else result[resource] = actions
}

//todo: 下层目录，区分不同版本
exports.load = function (directory) {
    log.d("--loadController--")
    log.d("controller dir="+ directory)
    let files = fs.readdirSync(directory);
    files.forEach((filename) => {
        let fullname = path.join(directory,filename)
        let stats = fs.statSync(fullname)
        if(stats.isDirectory()){ //search sub dir
            let subFiles = fs.readdirSync(fullname)
            result[filename] = {}
            subFiles.forEach((subFilename) =>{
                addControlFile(fullname,subFilename,filename)
            })
        }
        else addControlFile(directory,filename)
    });
    log.d("--(files => actions)--")
    for(let c in result){
        let actions = Object.keys(result[c])
        log.d(c+"\t=> "+actions)
        //let k = Object.keys(result[c])
        //log.d(k)
    }
    
    return result
};