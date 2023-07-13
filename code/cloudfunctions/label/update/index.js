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
  //修改菜系
  const db = cloud.database();
  const labelCollection = db.collection('label');
  const res = await labelCollection.where({
    _id: event._id
  }).update({
    data:{
      name: event.name
    }
  });
  if(res.errMsg === "collection.update:ok"){
    return httpApi.generateRes();
  }else{
    return httpApi.generateRes({}, 402, res.errMsg);
  }
}