// authenticate/login
const httpApi = require('../util/http')
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
// 云函数入口函数
exports.main = async (event, context) => {
  let permission = 1;
  let { OPENID } = cloud.getWXContext();

  const db = cloud.database();
  const userCollection = db.collection('user');
  const _user = await userCollection.where({
    openid: OPENID
  }).get();
  const user = _user.data;
  if(user.length == 0){
    await userCollection.add({
      data:{
        openid: OPENID,
        permission: 1,
        remaining: 3
      }
    });
    const statistics = await db.collection('statistics').where({}).get();
    await db.collection('statistics').where({}).update({
      data:{
        users: statistics.data[0].users+1
      }
    });
  }else{
    permission = user[0].permission;
  }

  return httpApi.generateRes({permission});
}