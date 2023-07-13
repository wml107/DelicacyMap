const login = require('./login/index');
const bind = require('./bind/index');


// 云函数入口函数
exports.main = async (event, context) => {
  switch (event.type) {
    case 'login':
      return await login.main(event, context);
    case 'bind':
      return await bind.main(event, context);
  }
};
