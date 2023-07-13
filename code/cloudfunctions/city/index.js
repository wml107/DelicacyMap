const set = require('./set/index');
const list = require('./list/index');

// 云函数入口函数
exports.main = async (event, context) => {
  switch (event.type) {
    case 'set':
      return await set.main(event, context);
    case 'list':
      return await list.main(event, context);
  }
};