const httpApi = require('./util/http');
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 云函数入口函数
exports.main = async (event, context) => {
  const db = cloud.database();
  const statisticsCollection = db.collection('statistics');
  const _statistics = await statisticsCollection.where({}).get();
  const statistics = _statistics.data[0];
  return httpApi.generateRes(statistics);
};