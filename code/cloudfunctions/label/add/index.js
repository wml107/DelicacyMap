const cloud = require('wx-server-sdk')
const httpApi = require('../util/http')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
// 云函数入口函数
exports.main = async (event, context) => {
  //鉴权
  let { OPENID } = cloud.getWXContext();
  if(await httpApi.authenticate(OPENID, cloud)!=0) return httpApi.generateRes({}, 401);
  //添加标签
  const db = cloud.database();
  const labelCollection = db.collection('label');
  const res = await labelCollection.add({
    data:{
      name: event.name
    }
  });
  if(res.errMsg === "collection.add:ok"){
    return httpApi.generateRes();
  }else{
    return httpApi.generateRes({}, 402, res.errMsg);
  }
}