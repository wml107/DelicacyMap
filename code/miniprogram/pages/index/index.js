// index.js
const httpApi = require('../../util/http');
const cityLocationList = require('../../util/cityLocationList');
const chooseLocationPlugin = requirePlugin('chooseLocation');
const plugin = requirePlugin('routePlan');
import Dialog from '@vant/weapp/dialog/dialog';

Page({
  data: {
    //腾讯地图调用参数
    key: '', //使用在腾讯位置服务申请的key
    referer: '', //调用插件的app的名称
    //用于UI弹出层展示控制
    manage: false, //管理员面板是否打开
    addMarker: false, //添加标记面板是否打开
    updateMarker: false, //更新标记面板是否打开
    showMarker: false, //标记详情面板是否打开
    markerNow: 0, //浏览详情或编辑、删除标记时，聚焦的标记的索引
    showDialog: false, //是否打开对话框
    dialogNow: '', //对话框有多种用途，这里决定了是打开哪种
    collapseName: null, //管理员面板中打开哪一项
    selectorVisible: false, //城市选择器是否打开
    defaultLongitude: 0, //当前选中城市经度
    defaultLatitude: 0, //当前选中城市维度
    currentDate: (new Date()).toISOString().substring(0, 10), //当天日期(在生命周期onReady里把他初始化成下一天)，这个值被用作时间选择器的上限
    //用于表单双向绑定、记录用户填充
    password: '', //管理员密码
    newCuisine: '', //菜系管理-新菜系名
    newLabel: '', //标签管理-新标签名
    editCuisine: '', //菜系管理-修改菜系名
    editLabel: '', //标签管理-修改标签名
    cuisineWaitUpdate: 0, //菜系管理-是否正在修改菜系名
    labelWaitUpdate: 0, //菜系管理-是否正在修改标签名
    editAnnouncement: '', //公告管理-新公告
    selectedCuisine: 0, //过滤器-菜系
    selectedLabel: 0, //过滤器-标签
    selectedCity: 0, //过滤器-城市
    avgPriceRange: [0, 999], //过滤器-价格
    addMarkerTime: (new Date()).toISOString().substring(0, 10), //新增标记-时间
    addMarkerCuisine: 0, //新增标记-菜系
    addMarkerLabel: 0, //新增标记-标签
    addMarkerPrice: 0, //新增标记-价钱
    addPriceDetail: '', //新增标记-价钱补充
    addDetail: '', //新增标记-描述
    addRecommend: '', //新增标记-推荐菜
    addAddress: null, //新增标记-饭店地址
    addPic: [], //新增标记-图片列表,
    updateMarkerTime: '', //修改标记-时间
    updateMarkerCuisine: 0, //修改标记-菜系
    updateMarkerLabel: 0, //修改标记-标签
    updateMarkerPrice: 0, //修改标记-价钱
    updatePriceDetail: '', //修改标记-价钱补充
    updateDetail: '', //修改标记-描述
    updateRecommend: '', //修改标记-推荐菜
    updateAddress: null, //修改标记-饭店地址
    updatePic: [], //修改标记-图片列表
    //实体/业务数据
    permission: 1, //权限
    cuisine: [], //菜系列表
    label: [], //标签列表
    city: [], //城市列表
    announcement: '', //公告
    statistics: null, //统计数据
    marker: [], //标记列表
    defaultCityIndex: 0, //默认城市编号
  },
  onShareAppMessage() { //配置好友分享
    const promise = new Promise(resolve => {
      setTimeout(() => {
        resolve({
          title: this.data.referer
        })
      }, 2000)
    })
    return {
      title: this.data.referer,
      path: '/page/index',
      promise
    }
  },
  onShareTimeline() { //配置朋友圈分享
    return {}
  },
  onReady: async function () {
    //初始化
    //检查更新
    const updateManager = wx.getUpdateManager()
    updateManager.onCheckForUpdate(function (res) {
      console.log(res.hasUpdate);// 请求完新版本信息的回调
    })
    updateManager.onUpdateReady(function () {
      wx.showModal({
        title: '更新提示',
        content: '新版本已经准备好，是否重启应用？',
        success(res) {
          if (res.confirm) {
            updateManager.applyUpdate()
          }
        }
      })
    })
    //设置日期
    let datatime = new Date();
    datatime.setDate(datatime.getDate() + 1);
    this.setData({
      currentDate: datatime.toISOString().substring(0, 10)
    });
    //配置点聚合
    const mapContext = wx.createMapContext('map');
    mapContext.initMarkerCluster({
      zoomOnClick: true,
      gridSize: 75
    });
    //获取城市列表和默认城市
    await this.getCityListAndDefault();
    //获取标记列表
    this.markerList();
    //检查权限
    const authenticate_login = await httpApi.authenticate.login();
    this.setData({
      permission: authenticate_login.permission
    });
    //获取公告
    const announcement_get = await httpApi.announcement.get();
    this.setData({
      announcement: announcement_get.content,
      editAnnouncement: announcement_get.content
    });
    if (announcement_get.content !== '') {
      Dialog.alert({
        title: '公告',
        message: announcement_get.content,
      });
    }
    //获取菜系列表
    this.setData({
      cuisine: await httpApi.cuisine.list()
    });
    //获取自定义标签列表
    this.setData({
      label: await httpApi.label.list()
    });
    //获取统计信息
    this.setData({
      statistics: await httpApi.statistics.get()
    });
  },
  onShow: function () {
    //这里是店铺选点的回调，因为选点是进入一个新的页面，选好了之后会退回上一级，也就是应用主体，触发onShow，在这里拿到选好的地址
    const location = chooseLocationPlugin.getLocation();
    this.setData({ //之所以设置两个，是因为这两个表单共用这一个变量；所以同理表单提交或放弃后的重置也要重置两个，不然你会发现例如修改标记后，进入一个新增，发现上次选的点还留着呢。
      addAddress: location,
      updateAddress: location
    });
  },
  onUnload: function () {
    this.closeAddMarker();
    chooseLocation.setLocation(null);
  },

  //----------UI相关方法----------
  //弹出与收起管理员面板
  showManage: function () {
    this.setData({
      manage: true
    });
  },
  closeManage: function () {
    this.setData({
      manage: false
    });
  },
  //弹出与收起添加标记面板
  showAddMarker: function () {
    this.setData({
      addMarker: true
    })
  },
  closeAddMarker: async function () {
    await Dialog.confirm({
        title: '放弃上传？'
      })
      .then((res) => {
        if (res.type !== 'comfirm') return;
      });

    const picList = [];
    for (let i = 0; i < this.data.addPic.length; i++) {
      picList.push(this.data.addPic[i].url);
    }
    wx.cloud.deleteFile({
      fileList: picList
    });
    this.setData({
      addMarker: false,
      addAddress: null,
      updateAddress: null, //之所以设置两个，是因为这两个表单共用这一个变量；所以同理表单提交后的重置也记得要重置两个，不然你会发现例如修改标记后，进入一个新增，发现上次选的点还留着呢。
      addDetail: '',
      addMarkerTime: (new Date()).toISOString().substring(0, 10),
      addMarkerCuisine: 0,
      addMarkerLabel: 0,
      addMarkerPrice: 0,
      addPriceDetail: '',
      addRecommend: '',
      addPic: []
    });
  },
  //弹出与收起修改标记面板
  showUpdateMarker: function () {
    let cuisineIndex = 0,
      labelIndex = 0;
    if (this.data.marker[this.data.markerNow].cuisineId[0] != 0) {
      for (let i = 0; i < this.data.cuisine.length; i++) {
        if (this.data.cuisine[i]._id == this.data.marker[this.data.markerNow].cuisineId[0]) {
          cuisineIndex = i + 1;
          break;
        }
      }
    }
    if (this.data.marker[this.data.markerNow].labelId[0] != 0) {
      for (let i = 0; i < this.data.label.length; i++) {
        if (this.data.label[i]._id == this.data.marker[this.data.markerNow].labelId[0]) {
          labelIndex = i + 1;
          break;
        }
      }
    }
    this.setData({
      updateMarker: true,
      updateMarkerTime: this.data.marker[this.data.markerNow].time,
      updateMarkerCuisine: cuisineIndex,
      updateMarkerLabel: labelIndex,
      updateMarkerPrice: this.data.marker[this.data.markerNow].avgPrice,
      updatePriceDetail: this.data.marker[this.data.markerNow].priceDetail,
      updateDetail: this.data.marker[this.data.markerNow].detail,
      updateRecommend: this.data.marker[this.data.markerNow].recommend,
      updateAddress: this.data.marker[this.data.markerNow].location,
      updatePic: this.data.marker[this.data.markerNow].picUrl.slice(0), //需要深拷贝，不然图片变化就直接作用在原数组上了，就没法隔离开了
    })
  },
  closeUpdateMarker: async function () {
    await Dialog.confirm({
        title: '放弃修改？'
      })
      .then((res) => {
        if (res.type !== 'comfirm') return;
      });
    //把没被引用的图片都删掉，对编辑表单中图片数组求原数组的补集
    let complement = [];
    for (let i = 0; i < this.data.updatePic.length; i++) {
      if (!this.data.marker[this.data.markerNow].picUrl.some(current => current.url === this.data.updatePic[i].url)) complement.push(this.data.updatePic[i].url);
    }
    wx.cloud.deleteFile({
      fileList: complement
    });
    this.setData({
      updateMarker: false,
      updateAddress: null,
      addAddress: null, //之所以设置两个，是因为这两个表单共用这一个变量；所以同理表单提交后的重置也记得要重置两个，不然你会发现例如修改标记后，进入一个新增，发现上次选的点还留着呢。
      updateDetail: '',
      updateMarkerTime: (new Date()).toISOString().substring(0, 10),
      updateMarkerCuisine: 0,
      updateMarkerLabel: 0,
      updateMarkerPrice: 0,
      updatePriceDetail: '',
      updateRecommend: '',
      updatePic: []
    });
  },
  //收起标记详情
  closeMarker: function () {
    this.setData({
      showMarker: false
    })
  },
  //表单动态绑定
  sliderChange: function (e) {
    this.setData({
      avgPriceRange: e.detail
    });
    this.markerList();
  },
  cuisineChange: function (e) {
    this.setData({
      selectedCuisine: e.detail
    });
    this.markerList();
  },
  labelChange: function (e) {
    this.setData({
      selectedLabel: e.detail
    });
    this.markerList();
  },
  cityChange: function (e) {
    this.setData({
      selectedCity: e.detail
    });
    this.setMap();
    this.markerList();
  },
  updateDetailChange: function(e){
    this.setData({
      updateDetail: e.detail.value
    });
  },
  updatePriceDetailChange: function(e){
    this.setData({
      updatePriceDetail: e.detail.value
    });
  },
  updateRecommendChange: function(e){
    this.setData({
      updateRecommend: e.detail.value
    })
  },
  //动态绑定左侧弹出的折叠管理员面板
  changeCollapse: function (e) {
    if (e.detail == '1') {
      this.setData({
        selectorVisible: true,
      });
    } else if (e.detail == '4') {
      this.setData({
        showDialog: true,
        dialogNow: 'announcement'
      });
    } else {
      this.setData({
        collapseName: e.detail,
      });
    }
  },
  //打开编辑菜系对话框
  updateCuisineDialog: function (e) {
    this.setData({
      showDialog: true,
      dialogNow: 'cuisine',
      cuisineWaitUpdate: e.currentTarget.dataset.index
    });
  },
  //打开编辑自定义标签对话框
  updateLabelDialog: function (e) {
    this.setData({
      showDialog: true,
      dialogNow: 'label',
      labelWaitUpdate: e.currentTarget.dataset.index
    });
  },
  //收起编辑菜系对话框
  updateCuisineDialogClose: function () {
    this.setData({
      showDialog: false,
      editCuisine: ''
    });
  },
  //收起编辑自定义标签对话框
  updateLabelDialogClose: function () {
    this.setData({
      showDialog: false,
      editLabel: ''
    });
  },
  //收起编辑公告对话框
  updateAnnouncementClose: function () {
    this.setData({
      showDialog: false,
      editAnnouncement: this.data.announcement
    });
  },
  //进入地图选点，选择默认城市
  chooseLocation: function () {
    const location = JSON.stringify({
      latitude: this.data.defaultLatitude,
      longitude: this.data.defaultLongitude
    });
    const category = '位置展示';

    wx.navigateTo({
      url: 'plugin://chooseLocation/index?key=' + this.data.key + '&referer=' + this.data.referer + '&location=' + location + '&category=' + category
    });
  },
  //点击查看大图
  bigPic: function (e) {
    const temp = [];
    for (let i = 0; i < this.data.marker[this.data.markerNow].picUrl.length; i++) {
      temp.push(this.data.marker[this.data.markerNow].picUrl[i].url);
    }
    wx.previewImage({
      urls: temp,
      current: e.currentTarget.dataset.url, // 当前显示图片的http链接，默认是第一个
    });
  },

  //----------业务相关方法----------
  //设置地图的中心点
  setMap: function () {
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < cityLocationList.cityLocationList[i].length; j++) {
        if (cityLocationList.cityLocationList[i][j].fullname == this.data.city[this.data.selectedCity].city.fullname) {
          this.setData({
            defaultLongitude: cityLocationList.cityLocationList[i][j].location.lng,
            defaultLatitude: cityLocationList.cityLocationList[i][j].location.lat
          });
          return true;
        }
      }
    }
  },
  //获取默认城市以及城市列表，并更新至视图
  getCityListAndDefault: async function (newCityList = null, hasSelected = false) {
    if (newCityList === null) newCityList = await httpApi.city.list();
    this.setData({
      city: newCityList
    });
    for (let i = 0; i < newCityList.length; i++) {
      if (newCityList[i].default == 1) {
        this.setData({
          defaultCityIndex: i,
          //这里不能无脑把选中城市置默认，因为标记的变动也会导致城市列表刷新，不能说新增一个标记成功后，地图一下子跳到默认城市了
          //但这个方法也不尽完美，假如是删除标记，并且删除的还是这个非默认城市的最后一个标记，那么就算还维持之前的选中城市，指向了也将是别的城市了，这里只能保证数组不越界
          selectedCity: hasSelected ? (
            this.data.selectedCity >= newCityList.length ? newCityList.length - 1 : this.data.selectedCity
          ) : i
        });
        this.setMap();
        break;
      }
    }
  },
  // 设置默认城市,并切换至新默认城市地图
  onSelectCity: async function (e) {
    const {
      province,
      city
    } = e.detail;
    const res = await httpApi.city.set(province, city);
    if (res === false) return;
    await this.getCityListAndDefault();
    this.markerList();
  },
  //绑定发布者账号
  manageBind: async function () {
    const res = await httpApi.authenticate.bind(this.data.password);
    if (res.res == 0) {
      wx.showToast({
        title: '绑定成功',
        icon: 'succ',
        duration: 2000
      });
      this.setData({
        permission: 0
      });
    } else if (res.res == 1) {
      wx.showToast({
        title: '口令错误',
        icon: 'error',
        duration: 2000
      });
    } else if (res.res == -1) {
      wx.showToast({
        title: '禁止访问',
        icon: 'error',
        duration: 2000
      });
      this.setData({
        manage: false
      });
      this.setData({
        password: ""
      });
    }
  },
  //新增菜系
  addCuisine: async function () {
    const res = await httpApi.cuisine.add(this.data.newCuisine);
    if (res === false) return;
    this.setData({
      cuisine: await httpApi.cuisine.list(),
      newCuisine: ''
    });
  },
  //修改菜系
  updateCuisine: async function () {
    const res = await httpApi.cuisine.update(this.data.editCuisine, this.data.cuisine[this.data.cuisineWaitUpdate]._id);
    if (res === false) return;
    this.setData({
      cuisine: await httpApi.cuisine.list(),
      editCuisine: ''
    });
  },
  //删除菜系
  delCuisine: async function (e) {
    await Dialog.confirm({
        title: '删除菜系？'
      })
      .then((res) => {
        if (res.type !== 'comfirm') return;
      });
    const res = await httpApi.cuisine.del(this.data.cuisine[e.currentTarget.dataset.index]._id);
    if (res === false) return;
    this.setData({
      cuisine: await httpApi.cuisine.list(),
      editCuisine: ''
    });
  },
  //新增自定义标签
  addLabel: async function () {
    const res = await httpApi.label.add(this.data.newLabel);
    if (res === false) return;
    this.setData({
      label: await httpApi.label.list(),
      newLabel: ''
    });
  },
  //修改自定义标签
  updateLabel: async function () {
    const res = await httpApi.label.update(this.data.editLabel, this.data.label[this.data.labelWaitUpdate]._id);
    if (res === false) return;
    this.setData({
      label: await httpApi.label.list(),
      editLabel: ''
    });
  },
  //删除自定义标签
  delLabel: async function (e) {
    await Dialog.confirm({
        title: '删除自定义标签？'
      })
      .then((res) => {
        if (res.type !== 'comfirm') return;
      });
    const res = await httpApi.label.del(this.data.label[e.currentTarget.dataset.index]._id);
    if (res === false) return;
    this.setData({
      label: await httpApi.label.list(),
      editLabel: ''
    });
  },
  //编辑公告
  updateAnnouncement: async function () {
    const res = await httpApi.announcement.set(this.data.editAnnouncement);
    if (res === false) return;
    if (this.data.editAnnouncement === '') {
      wx.showToast({
        title: '公告清除成功',
        icon: 'succ',
        duration: 2000
      });
    } else {
      wx.showToast({
        title: '公告设置成功',
        icon: 'succ',
        duration: 2000
      });
    }
    this.setData({
      announcement: this.data.editAnnouncement
    });
  },
  //上传图片
  uploadPic: async function (e) {
    for (let i = 0; i < e.detail.file.length; i++) {
      const res = await wx.cloud.uploadFile({
        cloudPath: 'markerPic/' + (Date.now()) + '_' + e.detail.file[i].url.substring(11, e.detail.file[i].url.length),
        filePath: e.detail.file[i].url, // 文件路径
      });
      if (res.statusCode == 204) {
        let newPicList = this.data.addPic;
        newPicList.push({
          url: res.fileID
        })
        this.setData({
          addPic: newPicList
        });
      } else {
        wx.showToast({
          title: '上传失败',
          icon: 'error'
        });
        return;
      }
    }
    wx.showToast({
      title: '上传成功',
      icon: 'succ'
    });
  },
  //删除图片
  delPic: async function (e) {
    const res = await wx.cloud.deleteFile({
      fileList: [this.data.addPic[e.detail.index].url]
    });
    if (res.fileList[0].status === 0) {
      let newPicList = this.data.addPic;
      newPicList.splice(e.detail.index, 1);
      this.setData({
        addPic: newPicList
      });
      wx.showToast({
        title: '移除成功',
        icon: 'succ'
      });
    } else {
      wx.showToast({
        title: '移除失败',
        icon: 'error'
      });
    }
  },
  //上传图片-编辑标记表单内
  uploadEditPic: async function (e) {
    for (let i = 0; i < e.detail.file.length; i++) {
      const res = await wx.cloud.uploadFile({
        cloudPath: 'markerPic/' + (Date.now()) + '_' + e.detail.file[i].url.substring(11, e.detail.file[i].url.length),
        filePath: e.detail.file[i].url, // 文件路径
      });
      if (res.statusCode == 204) {
        let newPicList = this.data.updatePic;
        newPicList.push({
          url: res.fileID
        })
        this.setData({
          updatePic: newPicList
        });
      } else {
        wx.showToast({
          title: '上传失败',
          icon: 'error'
        });
        return;
      }
    }
    wx.showToast({
      title: '上传成功',
      icon: 'succ'
    });
  },
  //删除图片-编辑表单内
  delEditPic: async function (e) {
    //假如这个图片在原来的标记里已经有，那就先不能删图片，只能数组删链接。只有在确认编辑的时候，才可以删掉updatePic里没有但在markerPic、数据库里有的图
    let res;
    if (!this.data.marker[this.data.markerNow].picUrl.some(current => current.url === this.data.updatePic[e.detail.index].url)) {
      res = await wx.cloud.deleteFile({
        fileList: [this.data.updatePic[e.detail.index].url]
      });
    } else {
      res = 'succ';
    }
    if (res === 'succ' || res.fileList[0].status === 0) {
      let newPicList = this.data.updatePic;
      newPicList.splice(e.detail.index, 1);
      this.setData({
        updatePic: newPicList
      });
      wx.showToast({
        title: '移除成功',
        icon: 'succ'
      });
    } else {
      wx.showToast({
        title: '移除失败',
        icon: 'error'
      });
    }
  },
  //新增标记
  addMarker: async function () {
    //校验
    if (this.data.addAddress === null) {
      wx.showToast({
        title: '地址不可为空',
        icon: 'error'
      });
      return;
    }
    //发请求
    const res = await httpApi.marker.add({
      detail: this.data.addDetail,
      location: this.data.addAddress,
      // province: this.data.addAddress.province,
      // city: this.data.addAddress.city,
      time: this.data.addMarkerTime,
      cuisineId: [(this.data.addMarkerCuisine === 0) ? 0 : this.data.cuisine[this.data.addMarkerCuisine - 1]._id],
      labelId: [(this.data.addMarkerLabel === 0) ? 0 : this.data.label[this.data.addMarkerLabel - 1]._id],
      avgPrice: Number(this.data.addMarkerPrice),
      priceDetail: this.data.addPriceDetail,
      recommend: this.data.addRecommend,
      picUrl: this.data.addPic
    });
    if (res === false) {
      return;
    }
    wx.showToast({
      title: '上传成功',
      icon: 'succ'
    });
    this.setData({
      addMarker: false,
      addAddress: null,
      updateAddress: null, //之所以设置两个，是因为这两个表单共用这一个变量；所以同理表单提交后的重置也记得要重置两个，不然你会发现例如修改标记后，进入一个新增，发现上次选的点还留着呢。
      addDetail: '',
      addMarkerTime: (new Date()).toISOString().substring(0, 10),
      addMarkerCuisine: 0,
      addMarkerLabel: 0,
      addMarkerPrice: 0,
      addPriceDetail: '',
      addRecommend: '',
      addPic: []
    });
    //刷新城市列表。维持原来选择的城市
    this.getCityListAndDefault(res.newCityList, true);
    //刷新标记列表
    this.markerList();
  },
  //获取标记列表并更新至视图
  markerList: async function () {
    const res = await httpApi.marker.list({
      avgPriceRange: this.data.avgPriceRange,
      province: this.data.city[this.data.selectedCity].province.fullname,
      city: this.data.city[this.data.selectedCity].city.fullname,
      cuisineId: [this.data.selectedCuisine],
      labelId: [this.data.selectedLabel]
    });
    if (res === false) {
      return;
    }
    this.setData({
      marker: res
    });
  },
  //标记详情
  markerDetail: function (e) {
    this.setData({
      markerNow: e.detail.markerId,
      showMarker: true
    });
  },
  //路线导航
  navigator: function () {
    wx.navigateTo({
      url: 'plugin://routePlan/index?key=' + this.data.key + '&referer=' + this.data.referer + '&endPoint=' + JSON.stringify({
        'name': this.data.marker[this.data.markerNow].location.name,
        'latitude': this.data.marker[this.data.markerNow].location.latitude,
        'longitude': this.data.marker[this.data.markerNow].location.longitude
      })
    });
  },
  //删除标记
  markerDel: async function () {
    await Dialog.confirm({
        title: '删除标记？'
      })
      .then((res) => {
        if (res.type !== 'comfirm') return;
      });
    const res = await httpApi.marker.del(this.data.marker[this.data.markerNow]._id);
    if (res === false) {
      return;
    }
    //刷新城市列表，维持之前选择的城市
    this.getCityListAndDefault(res.newCityList, true);
    //刷新标记列表
    this.markerList();
    wx.showToast({
      title: '删除成功',
      icon: 'succ'
    });
    this.setData({
      showMarker: false
    });
  },
  //编辑标记
  markerUpdate: async function () {
    //校验
    if (this.data.updateAddress === null) {
      wx.showToast({
        title: '地址不可为空',
        icon: 'error'
      });
      return;
    }
    //发请求
    const res = await httpApi.marker.update({
      _id: this.data.marker[this.data.markerNow]._id,
      detail: this.data.updateDetail,
      location: this.data.updateAddress,
      time: this.data.updateMarkerTime,
      cuisineId: [(this.data.updateMarkerCuisine === 0) ? 0 : this.data.cuisine[this.data.updateMarkerCuisine - 1]._id],
      labelId: [(this.data.updateMarkerLabel === 0) ? 0 : this.data.label[this.data.updateMarkerLabel - 1]._id],
      avgPrice: Number(this.data.updateMarkerPrice),
      priceDetail: this.data.updatePriceDetail,
      recommend: this.data.updateRecommend,
      picUrl: this.data.updatePic
    });
    if (res === false) {
      return;
    }
    //把旧标记中没被采用的图片删掉，对原数组求编辑表单中图片数组的补集
    let complement = [];
    //this.data.marker[this.data.markerNow].picUrl
    //this.data.updatePic
    for (let i = 0; i < this.data.marker[this.data.markerNow].picUrl.length; i++) {
      if (!this.data.updatePic.some(current => current.url === this.data.marker[this.data.markerNow].picUrl[i].url)) complement.push(this.data.marker[this.data.markerNow].picUrl[i].url);
    }
    wx.cloud.deleteFile({
      fileList: complement
    });

    wx.showToast({
      title: '上传成功',
      icon: 'succ'
    });
    this.setData({
      updateAddress: null, //因为有可能编辑的时候更换地址了，所以这个表单值要重置
      addAddress: null, //之所以设置两个，是因为这两个表单共用这一个变量；所以同理表单提交后的重置也记得要重置两个，不然你会发现例如修改标记后，进入一个新增，发现上次选的点还留着呢。
      updateMarker: false
    });
    //刷新标记列表
    this.markerList();
    //刷新城市列表。维持原来选择的城市
    this.getCityListAndDefault(res.newCityList, true);
  }
});