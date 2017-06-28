const log = require('../log')
module.exports = {
  init:(dbConf) => {
      let dao = null
      switch(dbConf.driver){
        case 'mysql':
          dao = require('./driver/mysql')
          dao.connect(dbConf)
          break
        default:
          log.d('!!! db init fail, not supported driver !!!')
          //throw new Error("not support driver:" + dbConf.driver)
      }
      return dao
  }
}