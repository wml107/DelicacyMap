module.exports = {
  authenticate: async function (OPENID, cloud) {
    const db = cloud.database();
    const userCollection = db.collection('user');
    const _user = await userCollection.where({
      openid: OPENID
    }).get();
    const user = _user.data;
    return user[0].permission;
  },
  generateRes: function(data = {}, code = 200, msg = ""){
    return {
      code: code,
      msg: msg,
      data: data
    }
  }
}