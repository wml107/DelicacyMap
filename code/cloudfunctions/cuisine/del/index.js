const httpApi = require('../util/http')
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
// 云函数入口函数
exports.main = async (event, context) => {
  //鉴权
  let { OPENID } = cloud.getWXContext();
  if(await httpApi.authenticate(OPENID, cloud)!=0) return httpApi.generateRes({}, 401);
  //检测是否已经存在该位置
  const db = cloud.database();
  const markerCollection = db.collection('marker');
  if((await markerCollection.where({
    'cuisineId': event._id
  }).get()).data.length != 0) return httpApi.generateRes({}, 400, '该菜系正被引用');
  //删除菜系
  const cuisineCollection = db.collection('cuisine');
  const res = await cuisineCollection.where({
    _id: event._id
  }).remove();
  if(res.errMsg === "collection.remove:ok"){
    return httpApi.generateRes();
  }else{
    return httpApi.generateRes({}, 402, res.errMsg);
  }
}