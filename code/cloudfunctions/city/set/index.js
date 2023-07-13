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
  //设置默认城市
  const db = cloud.database();
  const cityCollection = db.collection('city');
  //需要先检查原来的默认城市下到底有没有标记，没有就直接删掉了
  const oldDefault = (await cityCollection.where({default: 1}).get()).data[0];
  const hasMarker = (await db.collection('marker').where({
    'location.city': oldDefault.city.fullname
  }).count()).total;
  if(hasMarker === 0){
    await cityCollection.where({default: 1}).remove();
  }else{
    //把原本的默认取消
    await cityCollection.where({}).update({
      data: {
        default: 0
      }
    });
  }
  //先尝试一下更新，要是城市列表里本来就有这个城市，哪直接就成功了
  const res = await cityCollection.where({
    'province.fullname': event.province.fullname,
    'city.fullname': event.city.fullname
  }).update({
    data:{
      default: 1
    }
  });
  if(res.stats.updated != 0) return httpApi.generateRes();
  //城市列表里没有，这时候就需要来增加一个
  const res2 = await cityCollection.add({
    data: {
      province: event.province,
      city: event.city,
      default: 1
    }
  });
  if(res2.errMsg === "collection.add:ok"){
    return httpApi.generateRes();
  }else{
    return httpApi.generateRes({}, 402, res.errMsg);
  }
}