//test ec-router
const req     = require('supertest')
const assert = require('assert')
const Koa = require('koa')

var init = (type, apiName='index') => {
  let app = new Koa()
  let bodyParser = require('koa-bodyparser')
  app.use(bodyParser())
  let conf   = {controllerPath:'example/controllers',type: type, uriApiName:apiName}
  let ecRouter = require('../index')  
  ecRouter.setConfig(conf)
  app.use(ecRouter.dispatcher())
  return req(app.listen())
}

let api = null

describe('ec-router', function () {
  describe('type=1',function(){
    it('get /users ok', function(done){
      api = init(1)
      api.get('/users/1')
      .expect(200)
      .end((_,res)=>{
        assert.equal(res.text, 'get_users')
        done()
      })
    });
    it('post /users ok', function(done){
      api.post('/users')
      .expect(200)
      .end((_,res)=>{
        assert.equal(res.text, 'all_users')
        done()
      })
    });
    it('put /users/1 200', function(done){
      api.put('/users/1')
      .expect(200,done)
    });
    it('delete /users/1 200', function(done){
      api.delete('/users/1')
      .expect(200,done)
    });
    it('patch /users/1 405', function(done){
      api.patch('/users/1')
      .expect(405,done)
    });
    it('get /null 404', function(done){
      api.get('/null')
      .expect(200)
      .end((_,res)=>{
        assert.equal(res.text, 'any')
        done()
      })
    });
  })

  //test response code and text use type=2
  describe('type=2', function(){
    it('get /users/get ok', function(done){
      api = init(2)
      api.get('/users/get')
      .expect(200)
      .end((_,res)=>{
        assert.equal(res.text, 'get_users')
        done()
      })
    });
    it('get /users/post ok', function(done){
      api.get('/users/post')
      .expect(200)
      .end((_,res)=>{
        assert.equal(res.text, 'all_users')
        done()
      })
    });
    it('post /users/get 200', function(done){
      api.post('/users/get')
      .expect(200,done)
    });
    it('get /users/any_other 200', function(done){
      api.get('/users/any_other')
      .expect(200,done)
    });
    it('patch /users/any 405', function(done){
      api.patch('/users/_any')
      .expect(405,done)
    });
    it('get /null/get 404', function(done){
      api.get('/null/_any')
      .expect(200)
      .end((_,res)=>{
        assert.equal(res.text, 'any')
        done()
      })
    });
    it('_hook', function(done){
      api.get('/users/get')
      .expect(200)
      .end((_,res) => {
          assert.equal(res.headers['_hook'], 'before_main_after')
          done()
      })
    });



  });

  describe('type=3', function(){
    it('get /?c=users&a=get ok', function(done){
      api = init(3)
      api.get('/?c=users&a=get')
      .expect(200)
      .end((_,res)=>{
        assert.equal(res.text, 'get_users')
        done()
      })
    });
    it('get /?c=users&a=post ok', function(done){
      api.get('/?c=users&a=post')
      .expect(200)
      .end((_,res)=>{
        assert.equal(res.text, 'all_users')
        done()
      })
    });
    it('post /?c=users&a=get 200', function(done){
      api.post('/?c=users&a=get')
      .expect(200,done)
    });
    it('get /?c=users&a=any_other 200', function(done){
      api.get('/?c=users')
      .expect(200,done)
    });
    it('patch /?c=users&a=any_other 405', function(done){
      api.patch('/?c=users&a=any_other')
      .expect(405,done)
    });
    it('get /?c=null&a=any_other 200 any', function(done){
      api.get('/?c=null&a=any_other')
      .expect(200)
      .end((_,res)=>{
        assert.equal(res.text, 'any')
        done()
      })
    });
  });

  describe('onError', function(){
   
    it('get /api?c=users&a=get ok', function(done){
      api = init(3,'api')
      api.get('/api?c=users&a=get')
      .expect(200)
      .end((_,res)=>{
        assert.equal(res.text, 'get_users')
        done()
      })
    });
    it('get /index?c=users&a=post fail', function(done){
      api.get('/index?c=users&a=post')
      .expect(404)
      .end((_,res)=>{
        assert.equal(res.text, 'Not Found: miss api name')
        done()
      })
    });
  })

})
