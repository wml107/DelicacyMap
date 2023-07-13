const httpApi = require('../util/http')
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
// 云函数入口函数
exports.main = async (event, context) => {
  const MAX_LIMIT = 100;
  const db = cloud.database();
  const _ = db.command;
  //浏览量刷新
  db.collection('statistics').where({}).update({
    data: {
      views: _.inc(1)
    }
  })
  //菜系列表获取
  // 先取出集合记录总数
  const countResult = await db.collection('marker').count()
  const total = countResult.total
  // 计算需分几次取
  const batchTimes = Math.ceil(total / 100)
  // 读取
  let markerList = [];
  let filter = {
    avgPrice:  _.eq(0).or(_.and(_.gte(event.avgPriceRange[0]), _.lte(event.avgPriceRange[1]))),
    'location.province': event.province,
    'location.city': event.city,
  };
  if(!event.cuisineId.includes(0)){
    filter = Object.assign(filter, {cuisineId: _.all(event.cuisineId)});
  }
  if(!event.labelId.includes(0)){
    filter = Object.assign(filter, {labelId: _.all(event.labelId)});
  }
  for (let i = 0; i < batchTimes; i++) {
    let temp = await db.collection('marker').skip(i * MAX_LIMIT).limit(MAX_LIMIT).where(filter).get();
    markerList = markerList.concat( temp.data );
  }
  return httpApi.generateRes(markerList);
}