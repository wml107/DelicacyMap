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
  generateRes: function (data = {}, code = 200, msg = "") {
    return {
      code: code,
      msg: msg,
      data: data
    }
  },
  //在标记增删改/更新后，更新城市列表
  //很无奈，本着拆分的原则，更行城市列表本来应该写在city目录下，但微信这个云函数每个云函数目录是隔离的，没办法作为模块引入；但如果用云函数调用云函数的话，性能很差，太慢了，所以只能像这样写得很杂糅
  updateCity: async function (cloud) {
    const db = cloud.database();
    const city = db.collection('city');
    //默认城市是不能动的，不管有没有这个城市的标记。先把除了默认城市以外的城市全都移除。
    try {
      await city.where({
        default: db.command.neq(1)
      }).remove();
      //然后去扫描marker表中的记录，提取城市信息加入列表
      const markerList = await db.collection('marker').get();
      const cityList = [{
        province: (await city.get()).data[0].province.fullname,
        city: (await city.get()).data[0].city.fullname
      }];
      for (let i = 0; i < markerList.data.length; i++) {
        if (!cityList.some(current => current.city === markerList.data[i].location.city && current.province === markerList.data[i].location.province)) {
          cityList.push({
            province: markerList.data[i].location.province,
            city: markerList.data[i].location.city
          });
          await city.add({
            data: {
              province: {
                fullname: markerList.data[i].location.province
              },
              city: {
                fullname: markerList.data[i].location.city
              },
              default: 0
            }
          });
        }
      }
      //这里索性直接把更新后的列表返回，不要让前端再额外调用一遍云函数了，不然太慢
      return (await city.get()).data;
    } catch (e) {
      return e;
    }
  }
}