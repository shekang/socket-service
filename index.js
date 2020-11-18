const server = require('http').createServer()
const io = require('socket.io')(server) 
// 白名单
const whiteList = ['localhost','127.0.0.1']
const chalk = require('chalk');
const port = process.env.port  || 8080
const CODE = {
  SUCCESS: 200,
  ERROR: 500,
}
const log = {
  info(msg){
    console.log(chalk.grey(`[Info]: `) + msg)
  },
  error(msg){
    console.log(chalk.redBright(`[Error]: ` )+ msg)
  },
  success(msg){
    console.log(chalk.greenBright(`[Success]: ` ) + msg)
  },
  warn(msg){
    console.log(chalk.yellowBright(`[Warn]: `) + msg)
  }
}
// 打印服务
const print = io.of('/print')
// 当前连接客户端
global._client = {}
// 当前连接的打印服务
global._service = {}
// 用户总数
global._count = 0

// 访问域名限制
io.origins((origin, callback) => {
  const status = whiteList.some(v=>origin.includes(v))
  if (!status) {
    log.error(`域名${origin}不允许访问`)
    return callback('origin not allowed', false);
  }
  callback(null, true);
})

// socket断开连接
const socketDisConnect = socket =>{
  socket.on('disconnect', () => {
    _count--
    // 断开连接时清除用户
    if(_service.hasOwnProperty(socket.id)){
      delete _service[socket.id]
    } else {
      delete _client[socket.id]
    }
    log.info(`Socket连接断开, 打印服务总数${chalk.green(Object.keys(_service).length)}, 客户端总数${chalk.green(Object.keys(_client).length)}`)
  });
}

// 监听事件
const initEvents = socket=>{
  // 当前可用的打印服务
  socket.on('get-service', cb =>{
    log.info(`${socket.id}获取了当前可用的打印服务`)
    const aliasName = []
    Object.keys(_service).forEach((v,i)=>{
      const { alias } = _service[v].handshake.query || {}
      aliasName.push({
        name: alias || `打印服务${i}`,
        socketId: v
      })
    })
    // console.log('aliasName', aliasName)
    cb(JSON.stringify(aliasName))
  })

  // 传递数据到对应的打印服务
  socket.on('client-to-service', ({socketId, data}, cb)=>{

    // 是否存在打印服务
    if(Object.keys(_service).length){
      // 打印服务本身不允许触发该事件
      if(_service.hasOwnProperty(socket.id)){
        log.error(`打印服务不允许触发 client-to-service 事件`)
        cb(
          JSON.stringify({
            code: CODE.ERROR,
            msg: '打印服务不允许触发 client-to-service 事件'
          })
        )
      } else {
        // 是否传递了打印服务ID,没有则默认取第一个打印服务
        const target  = socketId ?  _service.hasOwnProperty(socketId) : _service[Object.keys(_service)[0]]
        // 触发打印服务客户端监听的事件 client-to-service
        target.emit('client-to-service', data || {}, callBackData=>{
          log.success(`打印服务数据获取` + callBackData)
          cb(
            JSON.stringify({
              code: CODE.SUCCESS,
              data: callBackData,
              msg: '获取成功'
            })
          )
        })
      } 
    } else {
      log.warn(`目前无可用的打印服务`)
      cb(
        JSON.stringify({
          code: CODE.ERROR,
          msg: '目前无可用的打印服务'
        })
      )
    }
  })
}

// socket连接处理
const socketConnect = () =>{
  print.on('connection', socket => {
    // query
    const { service } = socket.handshake.query || {}
    // 保存用户信息
    if(service){
      _service[socket.id] = socket
      log.info(`打印服务连接被创建, 打印服务总数${chalk.green(Object.keys(_service).length)}, 客户端总数${chalk.green(Object.keys(_client).length)}`)
    } else {
      _client[socket.id] = socket
      log.info(`客户端连接被创建, 打印服务总数${chalk.green(Object.keys(_service).length)}, 客户端总数${chalk.green(Object.keys(_client).length)}`)
    }
    _count++
    socketDisConnect(socket)
    initEvents(socket)
  })
}

const init  = ()=>{
  socketConnect()
  server.listen(port , ()=>{
    log.success('服务已运行于本地端口' + port)
  })
}
init()
