const httpApi = require('../util/http')
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
// 云函数入口函数
exports.main = async (event, context) => {
  //菜系列表获取
  const MAX_LIMIT = 100;
  const db = cloud.database();
  // 先取出集合记录总数
  const countResult = await db.collection('cuisine').count()
  const total = countResult.total
  // 计算需分几次取
  const batchTimes = Math.ceil(total / 100)
  // 读取
  let cuisineList = [];
  for (let i = 0; i < batchTimes; i++) {
    let temp = await db.collection('cuisine').skip(i * MAX_LIMIT).limit(MAX_LIMIT).get();
    cuisineList = cuisineList.concat( temp.data );
  }
  return httpApi.generateRes(cuisineList);
}