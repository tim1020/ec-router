//mysql处理
const util     = require('util')
const myutil   = require('../common')
const log      = require('../../log')

const mongodb  = require('mongodb')
const ObjectId = mongodb.ObjectID;
const dbClient = mongodb.MongoClient

let dbConn     = null


//fields=field1,field2,field3
const parseFields = (fields) => {
    log.d({fields:fields})
    let result = {}
    if(fields){
        fields = fields.split(",")
        for(let i=0;i<fields.length;i++){
            result[fields[i]] = 1
        }
    }
    return result
}
//order=field1 desc,field2,field3
const parseOrder = (order) => {
    log.d('--before parseOrder--')
    log.d({order:order})
    let sort = {}
    if(order){
        let fields = order.split(",")
        for(let i = 0; i< fields.length;i++){
            let field = fields[i].trim()
            if(!field) continue
            let pos = field.indexOf(" ")
            if(pos == -1){
                sort[field] = 1
            }else{
                let k = field.substr(0,pos)
                let d = field.substr(pos).trim().toUpperCase()
                if(d != 'DESC' && d != 'ASC'){
                    throw error("ERR_PARSE_ORDER_PARAM")
                }
                sort[k] = (d == 'ASC') ? 1 : -1
            }
        }
    }
    log.d('--after parseOrder--')
    log.d({order:sort})
    return sort
}
//limit=nums or limit=offset,nums
const parseLimit = (limit) => {
    log.d('---before parseLimit-')
    log.d({limit:limit})
    let result = {}
    if(limit){
        let nums = limit.split(",")
        let offset = 0
        let num    = 0
        if(nums.length == 1){
            num = parseInt(nums[0])
        }else if(nums.length == 2){
            num     = parseInt(nums[1])
            offset  = parseInt(nums[0])
        }
        if(isNaN(num) ||isNaN(offset) || nums.length > 2){
            throw error("ERR_PARSE_LIMIT_PARAM")
        }
        result.limit = num 
        result.skip = offset
    }
    log.d('---after parseLimit-')
    log.d({limit:result})
    return result
}
//conds for where
const parseConds = (cond) => {
    let reg = /(>=|<=|<>|!=|=|>|<| in )/i
    let str = cond.split(reg)
    if(str.length != 3) {
        throw error("ERR_COND_FAIL:"+cond)
    }
    let k = str[0].trim()
    let o = str[1].trim()
    let v = str[2].trim()
    let ou = o.toUpperCase()
    if(ou == 'IN'){
        v =  v.split(",")
    }
    let result = {k:k}
    if(o == "="){
        result['v'] = v 
    }else if(o == '>'){
        result['v'] = {'$gt':v}
    }else if(o == '>='){
        result['v'] = {'$gte':v}
    }else if(o == '<'){
        result['v'] = {'$lt':v}
    }else if(o == '<='){
        result['v'] = {'$lte':v}
    }else if(o == '<>' || o == '!='){
        result['v'] = {'$ne':v}
    }else if(ou == 'IN'){
        result['v'] = {'$in':v}
    }

    return result
}
//a=b,c=d  // , means and
//暂时只支持=查找
const parseWhere = (where) => {
    log.d({where: where})
    let result = {}
    if(where){
        let conds = where.split(",")
        for(let i in conds){
            let cond = conds[i].trim()
            let kv = parseConds(cond) //{k:v},or {k:{$syb:val}}
            result[kv.k] = kv.v
        }
    }
    log.d('--after parseWhere--')
    log.d(result)
    return result
}
//get action by method
const getAction = (method,res,resId, data, params) => {
    let dbCol = dbConn.collection(res)
    switch(method){
        case 'post':
            myutil.checkData(data)
            return insert(dbCol,data)
        case 'put':
            myutil.checkResId(resId)
            myutil.checkData(data)
            return update(dbCol,data,resId)
        case 'delete':
            myutil.checkResId(resId)
            return del(dbCol,resId)
        case 'get':
            return get(dbCol,resId,params)
        default:
            throw error("REQUEST METHOD NOT MATCH")
    }
}

//connect Promise
const connect = (url) => {
    return new Promise((resolve,reject) => {
        dbClient.connect(url, (err, db) => {
            if(err){
                reject( err )
            }else{
                log.d("--mongodb connect ok--")
                resolve(db)
            }
        })
    })
}
//insert,dbcol,
const insert = (dbCol,data) => {
    return new Promise((resolve,reject) => {
        dbCol.insert(data, function(err, result) { 
            if(err){
                reject(err)
            }else{
                resolve(result)
            }  
        })
    })  
}
//update by id
const update = (dbCol,data,id) => {
    return new Promise((resolve,reject) => {
        let where = {"_id": ObjectId(id)};
        let updateStr = {$set: data};
        dbCol.update(where, updateStr, function(err, result) { 
            if(err){
                reject(err)
            }else{
                resolve(result)
            }  
        })
    })
}
//delete by id
const del = (dbCol,id) => {
    return new Promise((resolve,reject) => {
        let where = {"_id": ObjectId(id)};
        dbCol.remove(where, function(err, result) { 
            if(err){
                reject(err)
            }else{
                resolve(result)
            }  
        })
    })
}

//wrapper Promise
const get = (dbCol,resId,params) => {
    return new Promise(( resolve, reject ) => {
        let where = {}
        if(resId){
            where._id = ObjectId(resId)
            params['limit'] = null //be one
        }else{
            where = parseWhere(params['where'])
        }
        let fields   = parseFields(params['fields'])
        let options  = parseLimit(params['limit'])
        options.sort = parseOrder(params['order'])

        dbCol.find(where,fields, options).toArray(function(err, items) {
            if (err) {
                reject(err);
            } else {
                resolve(items);
            }
        })        
    })
}


module.exports = {
    connect: async (dbConf)=>{
        log.d("--mongodb connect--")
        if(!dbConf.host || !dbConf.database){
            throw myutil.error("ER_DBCONF_NOT_HOST_OR_DATABASE")
        }
        let port = dbConf.port || 27017
        let url  = util.format('mongodb://%s:%d/%s',dbConf.host,port,dbConf.database)
        log.d({mongodbUri:url})
        dbConn = await connect(url)
    },
    exec: async (method,res,resId, req) => {
        let action = getAction(method,res,resId,req.body,req.query)
        let result = await action
        log.d({result:result})
        return result
    }
}