const CUS_ERR_CODE = 9999

module.exports = {
    error : (err) => {
        return {errno:CUS_ERR_CODE , code:err,toString:()=>{return "[custom err] "+err}}
    },
    checkData : (data) => {
        if(typeof data !== 'object' || JSON.stringify(data) === '{}' ){
            throw error("ER_REQUEST_DATA_EMPTY")
        }
    },
    checkResId : (resId) => {
        if(!resId){ //todo: resource id only numeric?
            throw error("ER_RESOURCE_ID_MISS")
        }
    },

    CUS_DEFAULT_LIMIT: 100

}