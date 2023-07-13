//封装请求
async function http(name, type, data = {}, config = {}) {
  //请求拦截器
  //发起请求
  Object.assign(data, {
    type: type
  });
  let res;
  try {
    res = await wx.cloud.callFunction({
      name: name,
      data: data,
      config: config
    });
  } catch (e) {
    wx.showToast({
      title: '请求失败',
      icon: 'error',
      duration: 2000
    });
    console.log("发送请求时出错，请求未发出：" + e);
    return false;
  }
  //响应拦截器
  if (typeof (res.errCode) != 'undefined') {
    wx.showToast({
      title: '服务器错误',
      icon: 'error',
      duration: 2000
    });
    console.log("500:" + res);
    return false;
  } else if (res.result.code == 200) {
    return res.result.data;
  } else if (res.result.code == 400) {
    wx.showToast({
      //参数不合法: 
      title: res.result.msg,
      icon: 'error',
      duration: 2000
    });
    console.log("400:" + res.result.msg);
  } else if (res.result.code == 401) {
    wx.showToast({
      title: '无权限',
      icon: 'error',
      duration: 2000
    });
  } else if (res.result.code == 402) {
    wx.showToast({
      title: '请求失败',
      icon: 'error',
      duration: 2000
    });
    console.log("402:" + res.result.msg);
  } else if (res.result.code == 500) {
    wx.showToast({
      title: '服务器错误',
      icon: 'error',
      duration: 2000
    });
    console.log("500:" + res.result.msg);
  }
  return false;
}
module.exports = {
  authenticate: {
    login: async function () {
      return await http("authenticate", "login");
    },
    bind: async function (password) {
      return await http("authenticate", "bind", {
        password
      });
    }
  },
  city: {
    set: async function (province, city) {
      return await http("city", "set", {
        province,
        city
      });
    },
    list: async function(){
      return await http("city", "list");
    }
  },
  cuisine: {
    list: async function () {
      return await http("cuisine", "list");
    },
    add: async function (name) {
      return await http("cuisine", "add", {
        name
      });
    },
    update: async function (name, _id) {
      return await http("cuisine", "update", {
        name,
        _id
      });
    },
    del: async function (_id) {
      return await http("cuisine", "del", {
        _id
      });
    }
  },
  label: {
    list: async function () {
      return await http("label", "list");
    },
    add: async function (name) {
      return await http("label", "add", {
        name
      });
    },
    update: async function (name, _id) {
      return await http("label", "update", {
        name,
        _id
      });
    },
    del: async function (_id) {
      return await http("label", "del", {
        _id
      });
    }
  },
  announcement: {
    get: async function () {
      return await http("announcement", "get");
    },
    set: async function (content) {
      return await http("announcement", "set", {
        content
      });
    }
  },
  statistics: {
    get: async function () {
      return await http("statistics", "get");
    }
  },
  marker: {
    list: async function ( filter ) {
      return await http("marker", "list", filter);
    },
    add: async function (data) {
      return await http("marker", "add", {
        data
      });
    },
    update: async function (data) {
      return await http("marker", "update", {
        data
      });
    },
    del: async function (_id) {
      return await http("marker", "del", {
        _id
      });
    }
  }
}