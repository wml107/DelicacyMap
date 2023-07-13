// authenticate/bind
const httpApi = require('../util/http')
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
// 云函数入口函数
exports.main = async (event, context) => {
  //确实该微信是否已被锁定
  let { OPENID } = cloud.getWXContext();
  const db = cloud.database();
  const userCollection = db.collection('user');
  const _user = await userCollection.where({
    openid: OPENID
  }).get();
  const user = _user.data;
  if (user[0].remaining == 0) {
    return httpApi.generateRes({
      res: -1
    });
  }
  //密码错误
  if (event.password != "jIsdv^iX1`q3)S6%3^4vK5*cE3,") {//用于绑定微信为发布者的口令，改成你自己想好的密码。
    await userCollection.where({
      openid: OPENID
    }).update({
      data:{
        remaining: user[0].remaining - 1
      }
    });
    return httpApi.generateRes({
      res: 1
    });
  }
  //密码正确
  await userCollection.where({
    permission: 0
  }).update({
    data:{
      permission: 1
    }
  });
  await userCollection.where({
    openid: OPENID
  }).update({
    data:{
      remaining: 3,
      permission: 0
    }
  });
  return httpApi.generateRes({
    res: 0
  });
}