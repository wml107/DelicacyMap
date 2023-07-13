const get = require('./get/index');
const set = require('./set/index');

// 云函数入口函数
exports.main = async (event, context) => {
  switch (event.type) {
    case 'get':
      return await get.main(event, context);
    case 'set':
      return await set.main(event, context);
  }
};