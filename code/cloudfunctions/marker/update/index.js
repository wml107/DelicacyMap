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
    'location.name': event.data.location.name,
    '_id': db.command.neq(event.data._id)
  }).get()).data.length != 0) return httpApi.generateRes({}, 400, '该位置已存在');
  //修改
  const res = await markerCollection.where({
    _id: event.data._id
  }).update({
    data: {
      avgPrice: event.data.avgPrice,
      cuisineId: event.data.cuisineId,
      detail: event.data.detail,
      labelId: event.data.labelId,
      location: event.data.location,
      picUrl: event.data.picUrl,
      priceDetail: event.data.priceDetail,
      recommend: event.data.recommend,
      time: event.data.time
    }
  });
  if(res.errMsg === "collection.update:ok"){
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