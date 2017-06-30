//mysql处理

const mysql     = require('mysql')
const sqlstring = require('sqlstring')
const log       = require('../../log')
const myutil    = require('../common')

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
            throw myutil.error("ERR_PARSE_FIELDS_PARAM")
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
                    throw myutil.error("ERR_PARSE_ORDER_PARAM")
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
        throw myutil.error("ERR_PARSE_LIMIT_PARAM")
    }
    return offset == 0 ? num : offset+","+num
}
//conds for where
const parseConds = (cond) => {
    let reg = /(>=|<=|<>|!=|=|>|<| is not | is | in )/i
    let str = cond.split(reg)
    if(str.length != 3) {
        throw myutil.error("ERR_COND_FAIL:"+cond)
    }
    let k = str[0].trim()
    let o = str[1].trim()
    let v = str[2].trim()
    let ou = o.toUpperCase()
    let vu = v.toUpperCase()
    if(ou == 'IS' || ou == 'IS NOT'){
        if(vu != 'NULL'){
            throw myutil.error("ERR_COND_FAIL:is only for NULL or NOT NULL")
        }
        v= undefined
    }
    if(ou == 'IN'){
        v =  v.split(",")
    }
    return sqlstring.format("?? "+o+" ?",[k,[v]])
}
//where cond1 and cond2 or cond3[and]cond4[or]cond5 and cond6..
//=> (cond1 and cond2 or cond3) and cond4 or (cond5 and cond6)
//cond => field[op]val ,op=>(>=,<=,=,>,<,is,in)
const parseWhere = (where) => {
    log.d({where: where})
    let r1 = /(\[and\]|\[or\])/i 
    let r2 = /( and | or )/i
    let sl1 = where.split(r1)
    let result = []
    for(let i in sl1){
        let str1 = sl1[i].trim()
        let str1_u = str1.toUpperCase()
        if(str1_u == '[AND]' || str1_u == '[OR]'){
            result.push(str1_u.replace(/(\[|\])/g,''))
        }else{
            let sl2 = str1.split(r2)
            if(sl2.length > 1){
                result.push("(")
                for(let j in sl2){
                    let str2 = sl2[j].trim()
                    let str2_u = str2.toUpperCase()
                    if(str2_u == 'AND' || str2_u == 'OR'){
                        result.push(str2_u)
                    }else{
                        result.push(parseConds(sl2[j]))
                    }
                }
                 result.push(")")
            }else{
                result.push(parseConds(sl2[0]))
            }
        }
    }
    return result.join(" ")
}

const buildSQL = (method,res,resId, data, params) => {
    //todo: desc table, get res info to help check data
    switch(method){
        case 'post':
            myutil.checkData(data)
            return sqlstring.format("INSERT INTO ?? SET ?",[res,data])
        case 'put':
            myutil.checkResId(resId)
            myutil.checkData(data)
            return sqlstring.format("UPDATE ?? set ? where `id`=?",[res,data,resId])
        case 'delete':
            myutil.checkResId(resId)
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
                sql += " WHERE "+parseWhere(params['where'])
            }
            if(params['order']){
                sql += " ORDER BY "+ parseOrder(params['order'])
            }
            if(params['limit']){
                sql += " LIMIT "+ parseLimit(params['limit'])
            }else{ //set default
                sql += " LIMIT "+ myutil.CUS_DEFAULT_LIMIT
            }
            return sql
        default:
            throw myutil.error("REQUEST METHOD NOT MATCH")
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