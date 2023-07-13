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
  //删除
  const db = cloud.database();
  const markerCollection = db.collection('marker');
  const res = await markerCollection.where({
    _id: event._id
  }).remove();
  if(res.errMsg === "collection.remove:ok"){
    let newCityList;
    try{
      newCityList = await httpApi.updateCity(cloud);
    }catch(e){
      console.log(e);
      httpApi.updateCity(cloud);
    }
    return httpApi.generateRes({newCityList});
  }else{
    return httpApi.generateRes({}, 402, res.errMsg);
  }
}