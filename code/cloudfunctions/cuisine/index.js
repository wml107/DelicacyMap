const add = require('./add/index');
const update = require('./update/index');
const list = require('./list/index');
const del = require('./del/index');

// 云函数入口函数
exports.main = async (event, context) => {
  switch (event.type) {
    case 'add':
      return await add.main(event, context);
    case 'update':
      return await update.main(event, context);
    case 'list':
      return await list.main(event, context);
    case 'del':
      return await del.main(event, context);
  }
};