const log = require('../log')
const myutil = require('./common')

module.exports = {
    init: async (dbConf) => {
        let dao = null
        switch(dbConf.driver){
            case 'mysql':
                dao = require('./driver/mysql')
                dao.connect(dbConf)
                break
            case 'mongodb':
                dao = require('./driver/mongodb')
                await dao.connect(dbConf)
                break
            default:
                log.d('!!! db init fail, not supported driver !!!')
                throw myutil.error("not support driver:" + dbConf.driver)
        }
        return dao
    }
}