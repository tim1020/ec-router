//mysql处理

const mysql     = require('mysql')
const sqlstring = require('sqlstring')
const log       = require('../../log')

const CUS_ERR_CODE      = 9999
const CUS_DEFAULT_LIMIT = 100


const error = (err) => {
    return {errno:CUS_ERR_CODE , code:err,toString:()=>{return "[custom err] "+err}}
}
const checkData = (data) => {
    if(typeof data !== 'object' || JSON.stringify(data) === '{}' ){
        throw error("ER_REQUEST_DATA_EMPTY")
    }
}
const checkResId = (resId) => {
    if(!resId){ //todo: resource id only numeric?
        throw error("ER_RESOURCE_ID_MISS")
    }
}
//fields=field1,field2 alias,field3 as alias3
const parseFields = (fields) => {
    log.d({fields:fields})
    fields = fields.split(",")
    let fieldStr = []
    for(let i=0;i<fields.length;i++){
        let f = fields[i].trim().split(" ")
        if(f.length == 1){
            fieldStr.push(sqlstring.escapeId(f[0]))
        }else if(f.length == 2){
            fieldStr.push(sqlstring.escapeId(f[0])+" "+ sqlstring.escapeId(f[1]))
        }else if(f.length == 3 && f[1].toUpperCase() == 'AS'){
            fieldStr.push(sqlstring.escapeId(f[0])+" "+ sqlstring.escapeId(f[2]))
        }else{
            throw error("ERR_PARSE_FIELDS_PARAM")
        }
    }
    return fieldStr.join(",")
}
//order=field1 desc,field2,field3
const parseOrder = (order) => {
    log.d({order:order})
    let fields = order.split(",")
    let orderStr = []
    for(let i = 0; i< fields.length;i++){
        let field = fields[i].trim()
        if(!field) continue
            let pos = field.indexOf(" ")
            if(pos == -1){
                orderStr.push(sqlstring.escapeId(field)) 
            }else{
                let k = field.substr(0,pos)
                let d = field.substr(pos).trim().toUpperCase()
                if(d != 'DESC' && d != 'ASC'){
                    throw error("ERR_PARSE_ORDER_PARAM")
                }
                orderStr.push(sqlstring.escapeId(k)+" "+ d)
        }
    }
    return orderStr.join(",")
}
//limit=nums or limit=offset,nums
const parseLimit = (limit) => {
    log.d({limit:limit})
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
    return offset == 0 ? num : offset+","+num
}

const parseWhere = (where) => {



}

const buildSQL = (method,res,resId, data, params) => {
    //todo: desc table, get res info to help check data
    switch(method){
        case 'post':
            checkData(data)
            return sqlstring.format("INSERT INTO ?? SET ?",[res,data])
        case 'put':
            checkResId(resId)
            checkData(data)
            return sqlstring.format("UPDATE ?? set ? where `id`=?",[res,data,resId])
        case 'delete':
            checkResId(resId)
            return sqlstring.format("DELETE FROM ?? WHERE `id` = ?",[res,resId])
        case 'get':
            let selectFields = "*"
            if(params['fields']){
                selectFields = parseFields(params['fields'])
            }
            let sql = sqlstring.format("SELECT "+selectFields+" FROM ??",res)

            if(resId){ 
                sql += sqlstring.format(" WHERE `id` = ?",resId)
            }else if(params['where']){ //使用where指定
                //let wh = parseWhere(params['where'])
                //sql += wh
            }
            if(params['order']){
                sql += " ORDER BY "+ parseOrder(params['order'])
            }
            if(params['limit']){
                sql += " LIMIT "+ parseLimit(params['limit'])
            }else{ //set default
                sql += " LIMIT "+ CUS_DEFAULT_LIMIT
            }
            return sql
        default:
            throw error("REQUEST METHOD NOT MATCH")
    }
}

//wrapper Promise
const query = (sql) => {
    return new Promise(( resolve, reject ) => {
        pool.getConnection(function(err, connection) {
          if (err) {
            reject( err )
          } else {
            connection.query(sql, ( err, rows) => {
              if ( err ) {
                reject( err )
              } else {
                resolve( rows )
              }
              connection.release()
            })
          }
        })
    })
}

let pool  = null
module.exports = {
    connect:(dbConf)=>{
        log.d("--mysql connect--")
        pool = mysql.createPool(dbConf);
    },
    exec: async (method,res,resId, req) => {
        let sql = buildSQL(method,res,resId,req.body,req.query)
        log.d("sql="+sql)
        let result = await query(sql)
        log.d({result:result})
        return result
    }
}