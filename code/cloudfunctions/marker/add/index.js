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
  //检测是否已经存在该位置
  const db = cloud.database();
  const markerCollection = db.collection('marker');
  if((await markerCollection.where({
    'location.latitude': event.data.location.latitude,
    'location.longitude': event.data.location.longitude,
    'location.name': event.data.location.name
  }).get()).data.length != 0) return httpApi.generateRes({}, 400, '该位置已存在');
  //添加标签
  const res = await markerCollection.add({
    data: event.data
  });
  if(res.errMsg === "collection.add:ok"){
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