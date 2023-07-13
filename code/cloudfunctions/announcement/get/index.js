const httpApi = require('../util/http')
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
// 云函数入口函数
exports.main = async (event, context) => {
  const db = cloud.database();
  const announcementCollection = db.collection('announcement');
  const _announcement = await announcementCollection.where({}).get();
  const content = _announcement.data[0].content;
  return httpApi.generateRes({content});
}