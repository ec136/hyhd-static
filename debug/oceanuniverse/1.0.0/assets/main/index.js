System.register("chunks:///_virtual/api-manager.ts", ['cc', './request-manager.ts', './ws-manager.ts', './log-util.ts'], function (exports) {
  var cclegacy, sys, ReqeustManager, WsManager, LogUtil;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
      sys = module.sys;
    }, function (module) {
      ReqeustManager = module.ReqeustManager;
    }, function (module) {
      WsManager = module.WsManager;
    }, function (module) {
      LogUtil = module.LogUtil;
    }],
    execute: function () {
      cclegacy._RF.push({}, "ab856eMDUBDZZAfVF9mddjd", "api-manager", undefined);

      /** 统一业务响应 */

      /** 登录/注册成功后的用户数据（字段以后端实际返回为准） */

      const TOKEN_STORAGE_KEY = "ocean_universe_token";
      const USER_STORAGE_KEY = "ocean_universe_user";

      /**
         * 业务接口管理器
         * 对接后台：发送验证码、注册登录、WebSocket
         */

      class ApiManager {
        constructor() {
          this._token = "";
          this._user = null;
          this._token = sys.localStorage.getItem(TOKEN_STORAGE_KEY) || "";
          const userStr = sys.localStorage.getItem(USER_STORAGE_KEY);
          if (userStr) {
            try {
              this._user = JSON.parse(userStr);
            } catch {
              this._user = null;
            }
          }
          if (this._token) {
            ReqeustManager.instance.setToken(this._token);
          }
        }
        static get instance() {
          if (!this._instance) {
            this._instance = new ApiManager();
          }
          return this._instance;
        }
        get token() {
          return this._token;
        }
        get user() {
          return this._user;
        }
        get isLoggedIn() {
          return !!this._token;
        }
        get ws() {
          return WsManager.instance;
        }

        /**
           * 发送短信验证码
           * POST /api/user/send-code?phone=
           */

        async sendCode(phone) {
          const res = await ReqeustManager.instance.postQuery("/api/user/send-code", {
            phone
          });
          this.assertBizOk(res);
          return res;
        }

        /**
           * 注册登录（验证码登录，未注册会自动注册）
           * POST /api/user/login?phone=&code=
           */

        async login(phone, code) {
          const res = await ReqeustManager.instance.postQuery("/api/user/login", {
            phone,
            code
          });
          this.assertBizOk(res);
          this.saveSession(res.data);
          return res;
        }

        /**
           * 退出登录
           * POST /api/user/logout
           */

        async logout() {
          try {
            const res = await ReqeustManager.instance.post("/api/user/logout", {});
            return res;
          } finally {
            this.ws.close();
            this.clearSession();
          }
        }

        /**
         * 连接 WebSocket：wss://.../wss?wsToken=xxx
         * @param wsToken 不传则用登录后缓存的 token / wsToken
         */
        connectWs(wsToken) {
          var _this$_user;
          const token = wsToken || ((_this$_user = this._user) == null ? void 0 : _this$_user.wsToken) || this._token;
          if (!token) {
            console.warn("[ApiManager] connectWs failed: missing wsToken, please login first");
            return;
          }
          this.ws.connect({
            wsToken: token
          });
        }
        saveSession(data) {
          if (!data || typeof data !== "object" || Array.isArray(data)) {
            return;
          }
          this._user = data;
          const token = data.wsToken || data.token || "";
          this._token = token;
          if (token) {
            sys.localStorage.setItem(TOKEN_STORAGE_KEY, token);
            ReqeustManager.instance.setToken(token);
          }
          sys.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));
        }
        clearSession() {
          this._token = "";
          this._user = null;
          sys.localStorage.removeItem(TOKEN_STORAGE_KEY);
          sys.localStorage.removeItem(USER_STORAGE_KEY);
          ReqeustManager.instance.setToken("");
        }

        /** 业务 code !== 200 时抛错，便于上层统一 catch */

        assertBizOk(res) {
          if (!res || res.code !== 200) {
            LogUtil.error("请求失败", res == null ? void 0 : res.message);
          }
        }
      }
      exports('ApiManager', ApiManager);
      ApiManager._instance = void 0;
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/array-util.ts", ['cc'], function (exports) {
  var cclegacy;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      cclegacy._RF.push({}, "3f080T9ceVAgJrAsP71ynyh", "array-util", undefined);
      class ArrayUtil {
        static mergeFrom(to, from) {
          if (to == null || from == null) {
            return;
          }
          for (var key in from) {
            let value = from[key];
            if (value == null) continue;
            if (typeof value == 'undefined') continue;
            if (value && to[key] && value instanceof Object && key in to) {
              this.mergeFrom(to[key], value);
            } else {
              to[key] = value;
            }
          }
        }
      }
      exports('ArrayUtil', ArrayUtil);
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/audio-effect-pool.ts", ['cc', './res-loader.ts', './audio-effect.ts', './audio-manager.ts'], function (exports) {
  var cclegacy, NodePool, AudioClip, Node, resLoader, AudioEffect, AudioManager;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
      NodePool = module.NodePool;
      AudioClip = module.AudioClip;
      Node = module.Node;
    }, function (module) {
      resLoader = module.resLoader;
    }, function (module) {
      AudioEffect = module.AudioEffect;
    }, function (module) {
      AudioManager = module.AudioManager;
    }],
    execute: function () {
      cclegacy._RF.push({}, "c77e66TONdBb51DlMCv6DGP", "audio-effect-pool", undefined);
      const AE_ID_MAX = 30000;

      /** 音效池 */
      class AudioEffectPool {
        constructor() {
          this._switch = true;
          this._volume = 1;
          /** 音效播放器对象池 */
          this.pool = new NodePool();
          this.maxPoolSize = 10;
          /** 对象池集合 */
          this.effects = new Map();
          /** 用过的音效资源记录 */
          this.res = new Map();
          this._aeId = 0;
        }
        /** 音效开关 */
        get switch() {
          return this._switch;
        }
        set switch(value) {
          this._switch = value;
          if (value) this.stop();
        }
        /** 所有音效音量 */
        get volume() {
          return this._volume;
        }
        set volume(value) {
          this._volume = value;
          this.effects.forEach(ae => {
            ae.volume = value;
          });
        }
        /** 获取请求唯一编号 */
        getAeId() {
          if (this._aeId == AE_ID_MAX) this._aeId = 1;
          this._aeId++;
          return this._aeId;
        }

        /**
         * 加载与播放音效
         * @param url                  音效资源地址与音效资源
         * @param bundleName           资源包名
         * @param onPlayComplete       播放完成回调
         * @returns 
         */
        async load(url, bundleName = resLoader.defaultBundleName, onPlayComplete) {
          return new Promise(async (resolve, reject) => {
            if (!this.switch) return resolve(-1);

            // 创建音效资源
            let clip;
            if (url instanceof AudioClip) {
              clip = url;
            } else {
              clip = resLoader.get(url, AudioClip, bundleName);
              if (!clip) {
                this.res.set(bundleName, url);
                clip = await resLoader.loadAsync(bundleName, url, AudioClip);
              }
            }

            // 资源已被释放
            if (!clip.isValid) {
              resolve(-1);
              return;
            }
            let aeid = this.getAeId();
            let key;
            if (url instanceof AudioClip) {
              key = url.uuid;
            } else {
              key = `${bundleName}_${url}`;
            }
            key += "_" + aeid;

            // 获取音效果播放器播放音乐
            let ae;
            let node = null;
            if (this.pool.size() == 0) {
              node = new Node();
              node.name = "AudioEffect";
              node.parent = AudioManager.instance.persist;
              ae = node.addComponent(AudioEffect);
            } else {
              node = this.pool.get();
              ae = node.getComponent(AudioEffect);
            }
            ae.onComplete = () => {
              this.put(aeid, url, bundleName); // 播放完回收对象
              onPlayComplete && onPlayComplete();
              // LogUtil.log(`【音效】回收，池中剩余音效播放器【${this.pool.size()}】`);
            };

            // 记录正在播放的音效播放器
            this.effects.set(key, ae);
            ae.volume = this.volume;
            ae.clip = clip;
            ae.play();
            resolve(aeid);
          });
        }

        /**
         * 回收音效播放器
         * @param aeid          播放器编号
         * @param url           音效路径
         * @param bundleName    资源包名
         */
        put(aeid, url, bundleName = resLoader.defaultBundleName) {
          let key;
          if (url instanceof AudioClip) {
            key = url.uuid;
          } else {
            key = `${bundleName}_${url}`;
          }
          key += "_" + aeid;
          let ae = this.effects.get(key);
          if (ae && ae.clip) {
            this.effects.delete(key);
            ae.stop();
            if (this.maxPoolSize < this.pool.size()) {
              ae.node.destroy();
            } else {
              this.pool.put(ae.node);
            }
          }
        }

        /** 释放所有音效资源与对象池中播放器 */
        release() {
          // 释放正在播放的音效
          this.effects.forEach(ae => {
            ae.node.destroy();
          });
          this.effects.clear();

          // 释放音效资源
          this.res.forEach((url, bundleName) => {
            resLoader.release(bundleName, url);
          });

          // 释放池中播放器
          this.pool.clear();
        }

        /** 停止播放所有音效 */
        stop() {
          this.effects.forEach(ae => {
            ae.stop();
          });
        }

        /** 恢复所有音效 */
        play() {
          if (!this.switch) return;
          this.effects.forEach(ae => {
            ae.play();
          });
        }

        /** 暂停所有音效 */
        pause() {
          if (!this.switch) return;
          this.effects.forEach(ae => {
            ae.pause();
          });
        }
      }
      exports('AudioEffectPool', AudioEffectPool);
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/audio-effect.ts", ['cc'], function (exports) {
  var cclegacy, AudioSource, _decorator;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
      AudioSource = module.AudioSource;
      _decorator = module._decorator;
    }],
    execute: function () {
      var _dec, _class;
      cclegacy._RF.push({}, "91794K0indBfIOUx7m44Ny/", "audio-effect", undefined);
      const {
        ccclass
      } = _decorator;

      /** 游戏音效 */
      let AudioEffect = exports('AudioEffect', (_dec = ccclass('AudioEffect'), _dec(_class = class AudioEffect extends AudioSource {
        constructor(...args) {
          super(...args);
          /** 背景音乐播放完成回调 */
          this.onComplete = null;
        }
        start() {
          this.node.on(AudioSource.EventType.ENDED, this.onAudioEnded, this);
        }
        onAudioEnded() {
          this.onComplete && this.onComplete();
        }
      }) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/audio-manager.ts", ['cc', './audio-music.ts', './audio-effect-pool.ts'], function (exports) {
  var cclegacy, Node, director, AudioMusic, AudioEffectPool;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
      Node = module.Node;
      director = module.director;
    }, function (module) {
      AudioMusic = module.AudioMusic;
    }, function (module) {
      AudioEffectPool = module.AudioEffectPool;
    }],
    execute: function () {
      cclegacy._RF.push({}, "092c9Golb1IqqfNczW7HITq", "audio-manager", undefined);

      /*
      *   音频管理器
      *   
      *   2018-9-20
      */
      class AudioManager {
        constructor() {
          this.persist = null;
          this.music = null;
          this.effect = new AudioEffectPool();
          /** 音乐管理状态数据 */
          this.local_data = {};
          this._switchVibration = false;
        }
        static get instance() {
          if (!this._instance) {
            this._instance = new AudioManager();
            this._instance.init();
          }
          return this._instance;
        }
        init() {
          this.persist = new Node("AudioPersistNode");
          director.addPersistRootNode(this.persist);
          this.load();
        }

        /**
         * 设置背景音乐播放完成回调
         * @param callback 背景音乐播放完成回调
         */
        setMusicComplete(callback = null) {
          this.music.onComplete = callback;
        }

        /**
         * 播放背景音乐
         * @param url        资源地址
         * @param callback   音乐播放完成事件
         * @param bundleName 资源包名
         */
        playMusic(url, callback, bundleName) {
          if (this.music.switch) {
            this.music.loop = false;
            this.music.load(url, callback, bundleName).then();
          }
        }

        /** 循环播放背景音乐 */
        playMusicLoop(url, bundleName) {
          if (this.music.switch) {
            this.music.loop = true;
            this.music.load(url, null, bundleName).then();
          }
        }

        /** 停止背景音乐播放 */
        stopMusic() {
          this.music.stop();
        }

        /**
         * 获取背景音乐播放进度
         */
        get progressMusic() {
          return this.music.progress;
        }

        /**
         * 设置背景乐播放进度
         * @param value     播放进度值
         */
        set progressMusic(value) {
          this.music.progress = value;
        }

        /**
         * 获取背景音乐音量
         */
        get volumeMusic() {
          return this.music.volume;
        }

        /**
         * 设置背景音乐音量
         * @param value     音乐音量值
         */
        set volumeMusic(value) {
          this.music.volume = value;
          this.save();
        }

        /**
         * 获取背景音乐开关值
         */
        get switchMusic() {
          return this.music.switch;
        }

        /**
         * 设置背景音乐开关值
         * @param value     开关值
         */
        set switchMusic(value) {
          this.music.switch = value;
          !value && this.music.stop();
          this.save();
        }

        /**
         * 播放音效
         * @param url        资源地址
         * @param callback   加载完成回调
         * @param bundleName 资源包名
         */
        playEffect(url, bundleName, onPlayComplete) {
          return this.effect.load(url, bundleName, onPlayComplete);
        }

        /** 回收音效播放器 */
        putEffect(aeid, url, bundleName) {
          this.effect.put(aeid, url, bundleName);
        }

        /** 获取音效音量 */
        get volumeEffect() {
          return this.effect.volume;
        }

        /**
         * 设置获取音效音量
         * @param value     音效音量值
         */
        set volumeEffect(value) {
          this.effect.volume = value;
          this.save();
        }

        /** 获取音效开关值 */
        get switchEffect() {
          return this.effect.switch;
        }

        /**
         * 设置音效开关值
         * @param value     音效开关值
         */
        set switchEffect(value) {
          this.effect.switch = value;
          if (!value) this.effect.stop();
          this.save();
        }
        set switchVibration(value) {
          this._switchVibration = value;
          this.save();
        }
        get switchVibration() {
          return this._switchVibration;
        }

        /** 恢复当前暂停的音乐与音效播放 */
        resumeAll() {
          if (this.music.switch) {
            if (!this.music.playing) this.music.play();
          }
          if (this.effect.switch) {
            this.effect.play();
          }
        }

        /** 暂停当前音乐与音效的播放 */
        pauseAll() {
          if (this.music.playing) this.music.pause();
          this.effect.pause();
        }

        /** 停止当前音乐与音效的播放 */
        stopAll() {
          this.music.stop();
          this.effect.stop();
        }

        /** 保存音乐音效的音量、开关配置数据到本地 */
        save() {
          this.local_data.volume_music = this.music.volume;
          this.local_data.volume_effect = this.effect.volume;
          this.local_data.switch_music = this.music.switch;
          this.local_data.switch_effect = this.effect.switch;
          this.local_data.switch_vibration = this._switchVibration;

          // StorageManager.instance.set(LOCAL_STORE_KEY, this.local_data);
        }

        /** 本地加载音乐音效的音量、开关配置数据并设置到游戏中 */
        load() {
          var _this$persist, _this$persist2;
          this.music = ((_this$persist = this.persist) == null ? void 0 : _this$persist.getComponent(AudioMusic)) || ((_this$persist2 = this.persist) == null ? void 0 : _this$persist2.addComponent(AudioMusic));

          // this.local_data = StorageManager.instance.getJson(LOCAL_STORE_KEY);
          if (this.local_data) {
            try {
              this.setState();
            } catch {
              this.setStateDefault();
            }
          } else {
            this.setStateDefault();
          }
        }
        setState() {
          this.music.volume = this.local_data.volume_music;
          this.effect.volume = this.local_data.volume_effect;
          this.music.switch = this.local_data.switch_music;
          this.effect.switch = this.local_data.switch_effect;
          this.switchVibration = this.local_data.switch_vibration;
        }
        setStateDefault() {
          this.local_data = {};
          this.music.volume = 1;
          this.effect.volume = 1;
          this.music.switch = true;
          this.effect.switch = true;
          this.switchVibration = true;
        }
      }
      exports('AudioManager', AudioManager);
      AudioManager._instance = void 0;
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/audio-music.ts", ['cc', './res-loader.ts'], function (exports) {
  var cclegacy, AudioSource, AudioClip, _decorator, resLoader;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
      AudioSource = module.AudioSource;
      AudioClip = module.AudioClip;
      _decorator = module._decorator;
    }, function (module) {
      resLoader = module.resLoader;
    }],
    execute: function () {
      var _dec, _class;
      cclegacy._RF.push({}, "f2d379vToxOwokSZGOpU1Gh", "audio-music", undefined);
      const {
        ccclass,
        property
      } = _decorator;
      let AudioMusic = exports('AudioMusic', (_dec = ccclass('AudioMusic'), _dec(_class = class AudioMusic extends AudioSource {
        constructor(...args) {
          super(...args);
          /** 背景音乐开关 */
          this.switch = true;
          /** 背景音乐播放完成回调 */
          this.onComplete = null;
          this._progress = 0;
          this._isLoading = false;
          this._nextBundleName = null;
          // 下一个音乐资源包
          this._nextUrl = null;
        }
        // 下一个播放音乐

        start() {
          // this.node.on(AudioSource.EventType.STARTED, this.onAudioStarted, this);
          this.node.on(AudioSource.EventType.ENDED, this.onAudioEnded, this);
        }

        // private onAudioStarted() { }

        onAudioEnded() {
          this.onComplete && this.onComplete();
        }

        /** 获取音乐播放进度 */
        get progress() {
          if (this.duration > 0) this._progress = this.currentTime / this.duration;
          return this._progress;
        }
        /**
         * 设置音乐当前播放进度
         * @param value     进度百分比0到1之间
         */
        set progress(value) {
          this._progress = value;
          this.currentTime = value * this.duration;
        }

        /**
         * 加载音乐并播放
         * @param url          音乐资源地址
         * @param callback     加载完成回调
         * @param bundleName   资源包名
         */
        async load(url, callback, bundleName = resLoader.defaultBundleName) {
          // 下一个加载的背景音乐资源
          if (this._isLoading) {
            this._nextBundleName = bundleName;
            this._nextUrl = url;
            return;
          }
          this._isLoading = true;
          var clip = await resLoader.loadAsync(bundleName, url, AudioClip);
          if (clip) {
            this._isLoading = false;

            // 处理等待加载的背景音乐
            if (this._nextUrl != null) {
              // 加载等待播放的背景音乐
              this.load(this._nextUrl, callback, this._nextBundleName);
              this._nextBundleName = this._nextUrl = null;
            } else {
              callback && callback();

              // 正在播放的时候先关闭
              if (this.playing) {
                this.stop();
              }

              // 删除当前正在播放的音乐
              this.release();

              // 播放背景音乐
              this.clip = clip;
              this.play();
            }
          }
        }

        /** 释放当前背景音乐资源 */
        release() {
          if (this.clip) {
            this.stop();
            this.clip.decRef();
            this.clip = null;
          }
        }
      }) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/bezier-util.ts", ['cc', './log-util.ts'], function (exports) {
  var cclegacy, Vec3, tween, Quat, LogUtil;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
      Vec3 = module.Vec3;
      tween = module.tween;
      Quat = module.Quat;
    }, function (module) {
      LogUtil = module.LogUtil;
    }],
    execute: function () {
      cclegacy._RF.push({}, "2b3b9bpFzFOD5WsNUCQ3GMg", "bezier-util", undefined);
      class BezierUtil {
        static calculateBezierLength(p0, p1, p2) {
          const segments = 300; // 分段数，越大越精确
          let length = 0;
          let previousPoint = p0;
          for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const currentPoint = this.calculateBezierPoint(p0, p1, p2, t);
            length += Vec3.distance(previousPoint, currentPoint);
            previousPoint = currentPoint;
          }
          return length;
        }
        static calculateBezierPoint(p0, p1, p2, t) {
          const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
          const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
          const z = (1 - t) * (1 - t) * p0.z + 2 * (1 - t) * t * p1.z + t * t * p2.z;
          return new Vec3(x, y, z);
        }
        static moveNodeAlongBezier(node, startPos, controlPos, endPos, speed, endScale, endRotation, callBack) {
          return new Promise((resolve, reject) => {
            const totalDistance = this.calculateBezierLength(startPos, controlPos, endPos);
            const totalTime = totalDistance / speed;
            const startScale = node.scale.clone();
            const startRotation = node.rotation.clone();
            let currentT = 0;
            tween({
              t: 0
            }).to(totalTime, {
              t: 1
            }, {
              onUpdate: target => {
                currentT = target.t;
                const pos = this.calculateBezierPoint(startPos, controlPos, endPos, currentT);
                node.position = pos;
                const newScaleX = startScale.x + (endScale.x - startScale.x) * currentT;
                const newScaleY = startScale.y + (endScale.y - startScale.y) * currentT;
                const newScaleZ = startScale.z + (endScale.z - startScale.z) * currentT;
                node.setScale(newScaleX, newScaleY, newScaleZ);
                const newRotation = new Quat();
                Quat.slerp(newRotation, startRotation, endRotation, currentT);
                node.setRotation(newRotation);
              },
              easing: "linear"
            }).call(() => {
              LogUtil.log("Movement completed");
              callBack && callBack();
              resolve();
            }).start();
          });
        }
      }
      exports('BezierUtil', BezierUtil);
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/bridge-event.ts", ['cc'], function (exports) {
  var cclegacy;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      cclegacy._RF.push({}, "703ebuRaglNUayXxzhG8Trr", "bridge-event", undefined);
      let BridgeEvent = exports('BridgeEvent', /*#__PURE__*/function (BridgeEvent) {
        BridgeEvent["on_vibrate"] = "on_vibrate";
        BridgeEvent["on_native_info"] = "on_native_info";
        BridgeEvent["on_scene_ready"] = "on_scene_ready";
        BridgeEvent["on_send_mail"] = "on_send_mail";
        BridgeEvent["on_rating"] = "on_rating";
        return BridgeEvent;
      }({})); // sdk_open_gm = 'sdk_open_gm',
      // on_connect_event = 'on_connect_event',
      // sdk_ad_reward = 'sdk_ad_reward',
      // sdk_ad_inters = 'sdk_ad_inters',
      // sdk_report_data = 'sdk_report_data',
      // sdk_init = 'sdk_init',
      // sdk_ad_debug = 'sdk_ad_debug',
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/bridge-manager.ts", ['cc', './bridge-event.ts', './log-util.ts'], function (exports) {
  var cclegacy, native, BridgeEvent, LogUtil;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
      native = module.native;
    }, function (module) {
      BridgeEvent = module.BridgeEvent;
    }, function (module) {
      LogUtil = module.LogUtil;
    }],
    execute: function () {
      cclegacy._RF.push({}, "4dedaXzbeVH6489XGrS/7zP", "bridge-manager", undefined);
      class BridgeManager {
        constructor() {
          this.saveToAlbumCallback = void 0;
        }
        static get instance() {
          if (!this._instance) {
            this._instance = new BridgeManager();
          }
          return this._instance;
        }
        setSaveToAlbumCallback(callback) {
          this.saveToAlbumCallback = callback;
        }
        setupNativeEventListner(onNativeBindedCallback) {
          if (native && native.jsbBridgeWrapper) {
            native.jsbBridgeWrapper.addNativeEventListener("on_native_info", args => {
              this.onNativeInfo(args);
              onNativeBindedCallback && onNativeBindedCallback();
            });
            native.jsbBridgeWrapper.addNativeEventListener("on_connect_event", args => this.onNativeConnectEvent(args));
            native.jsbBridgeWrapper.addNativeEventListener("on_save_album_result", args => this.onNativeSaveAlbumResult(args));
            native.jsbBridgeWrapper.dispatchEventToNative(BridgeEvent.on_scene_ready);
          } else {
            console.error("native.jsbBridgeWrapper is null");
            onNativeBindedCallback && onNativeBindedCallback();
          }
        }
        onNativeInfo(args) {
          LogUtil.log("beyond2 onNativeInfo", args);
          const data = JSON.parse(args);
          // Config.MEM = data.mem;
          // Config.DEBUG = data.debug;
          // Config.GAME_VERSION = data.version;
          // Config.LANG_CODE = data.lang;
          // Config.COUNTRY_CODE = data.country;
          // Config.GAME_UUID = data.game_uuid;
          // Config.PACKAGE = data.package;
          // Config.API_URL = data.api_host;
          // Config.SG_GRAPH_HOST = .sg_graph_host;

          console.log("onNativeInfo data", args);
          if (data.model) {
            this.updateDeviceModel(data.model);
          }
        }
        onNativeConnectEvent(args) {
          LogUtil.log("onNativeConnectEvent", args);
          // ConnectAgent.onConnectEvent(args);
        }

        onNativeSaveAlbumResult(args) {
          LogUtil.log("onNativeSaveAlbumResult", args);
          this.saveToAlbumCallback && this.saveToAlbumCallback(args === "true");
        }
        updateDeviceModel(rawModel) {

          // Config.DEVICE_MODEL.RAW = rawModel;
          // Config.DEVICE_MODEL.MODEL = modelConfig[rawModel] || 0;

          // const s1 = JSON.stringify(Config.DEVICE_MODEL);
          // console.log(`updateDeviceModel: ${rawModel} -> ${s1}`);
        }

        // setupNativeEventListner(onNativeBindedCallback: () => void) {
        //     if (native && native.bridge) {
        //         native.bridge.onNative = function (arg0: string, arg1: string) {
        //             if (arg0 === BridgeEvent.on_page_rc) {
        //                 MountManager.instance.notify(MountPoint.NativeNotifyPageRc, arg1);
        //             } else if (arg0 === BridgeEvent.on_native_info) {
        //                 // 
        //                 LogUtil.log("on_native_info", arg1);
        //                 const data = JSON.parse(arg1);
        //                 Config.MEM = data.mem;
        //                 Config.DEBUG = data.debug;
        //                 Config.GAME_VERSION = data.version;
        //                 Config.LANG_CODE = data.lang;
        //                 Config.COUNTRY_CODE = data.country;
        //                 Config.GAME_UUID = data.game_uuid;
        //                 Config.PACKAGE = data.package;
        //                 Config.API_URL = data.api_host;
        //                 // Config.SG_GRAPH_HOST = .sg_graph_host;
        //                 onNativeBindedCallback && onNativeBindedCallback();
        //             } else if (arg0 === BridgeEvent.on_save_album_result) {
        //                 BridgeManager.instance.saveToAlbumCallback && BridgeManager.instance.saveToAlbumCallback(arg1 === "true");
        //             } else if (arg0 === BridgeEvent.on_connect_event) {
        //                 // 
        //                 LogUtil.log("on_connect_event", arg1);
        //                 ConnectAgent.onConnectEvent(arg1);
        //             }
        //         };

        //         native.bridge.sendToNative(BridgeEvent.on_scene_ready);
        //     } else {
        //         console.error("native.bridge is null");
        //         onNativeBindedCallback && onNativeBindedCallback();
        //     }
        // }
      }
      exports('BridgeManager', BridgeManager);
      BridgeManager._instance = void 0;
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/bridge-util.ts", ['cc', './bridge-event.ts', './native-agent.ts'], function (exports) {
  var cclegacy, native, sys, BridgeEvent, NativeAgent;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
      native = module.native;
      sys = module.sys;
    }, function (module) {
      BridgeEvent = module.BridgeEvent;
    }, function (module) {
      NativeAgent = module.NativeAgent;
    }],
    execute: function () {
      cclegacy._RF.push({}, "637caANPIxBlolEJcDw3EZb", "bridge-util", undefined);
      let VibrationEffect = exports('VibrationEffect', /*#__PURE__*/function (VibrationEffect) {
        VibrationEffect[VibrationEffect["DEFAULT"] = -1] = "DEFAULT";
        VibrationEffect[VibrationEffect["CLICK"] = 0] = "CLICK";
        VibrationEffect[VibrationEffect["DOUBLE_CLICK"] = 1] = "DOUBLE_CLICK";
        VibrationEffect[VibrationEffect["TICK"] = 2] = "TICK";
        VibrationEffect[VibrationEffect["HEAVY_CLICK"] = 5] = "HEAVY_CLICK";
        return VibrationEffect;
      }({})); // EFFECT_HEAVY_CLICK
      class BridgeUtil {
        static vibrate(duration, effect) {
          // if (!AudioManager.instance.switchVibration) return;
          if (native && native.bridge) {
            console.log("cocos vibrate", duration, effect);
            const param = {
              d: duration,
              e: effect
            };
            NativeAgent.dispatchEventToNative(BridgeEvent.on_vibrate, JSON.stringify(param));
          }
        }
        static sendMail(to, subject, body) {
          if (native && native.bridge) {
            const param = {
              to: to,
              subject: subject,
              body: body
            };
            NativeAgent.dispatchEventToNative(BridgeEvent.on_send_mail, JSON.stringify(param));
          }
        }
        static saveToAlbum(url) {
          if (!sys.isNative) {
            return Promise.resolve(false);
          }
          return new Promise(resolve => {
            // start download graph
            // GraphManager.instance.loadGraphToBase64(url).then((base64) => {
            //     if (!base64) {
            //         console.log('saveToAlbum base64 is null');
            //         resolve(false);
            //         return;
            //     }

            //     BridgeManager.instance.setSaveToAlbumCallback((success) => {
            //         resolve(success);
            //     });

            //     NativeAgent.dispatchEventToNative(BridgeEvent.on_save_album, base64);
            //     setTimeout(() => {
            //         resolve(true);
            //     }, 500);
            // });
          });
        }
        static openRating() {
          if (native && native.bridge) {
            const param = {
              appleID: "6756617015"
            };
            NativeAgent.dispatchEventToNative(BridgeEvent.on_rating, JSON.stringify(param));
          }
        }
      }
      exports('BridgeUtil', BridgeUtil);
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/circular-mask.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc'], function (exports) {
  var _applyDecoratedDescriptor, _initializerDefineProperty, cclegacy, Node, _decorator, Component, Graphics, Color, tween;
  return {
    setters: [function (module) {
      _applyDecoratedDescriptor = module.applyDecoratedDescriptor;
      _initializerDefineProperty = module.initializerDefineProperty;
    }, function (module) {
      cclegacy = module.cclegacy;
      Node = module.Node;
      _decorator = module._decorator;
      Component = module.Component;
      Graphics = module.Graphics;
      Color = module.Color;
      tween = module.tween;
    }],
    execute: function () {
      var _dec, _dec2, _class, _class2, _descriptor;
      cclegacy._RF.push({}, "58732MyjwRFzI5TBD/P/ypX", "circular-mask", undefined);
      const {
        ccclass,
        property
      } = _decorator;
      let CircularMask = exports('CircularMask', (_dec = ccclass('CircularMask'), _dec2 = property(Node), _dec(_class = (_class2 = class CircularMask extends Component {
        constructor(...args) {
          super(...args);
          _initializerDefineProperty(this, "maskNode", _descriptor, this);
          // 遮罩节点
          this.initialRadius = 1080;
          // 初始圆形半径
          this.finalRadius = 320;
          // 最终圆形半径
          this.graphics = null;
        }
        onLoad() {
          // 获取 Graphics 组件
          this.graphics = this.maskNode.getComponent(Graphics);
        }
        drawCircle(radius) {
          this.graphics.clear(); // 清除之前的绘制
          this.graphics.fillColor = Color.BLACK; // 设置填充颜色为黑色
          this.graphics.circle(0, 40, radius); // 绘制圆形
          this.graphics.fill(); // 填充圆形
        }

        animate2Final(duration) {
          tween({
            radius: this.initialRadius
          }).to(duration, {
            radius: this.finalRadius
          }, {
            onUpdate: target => {
              this.drawCircle(target.radius); // 动态更新圆形半径
            }
          }).start();
        }
        animate2Initial(duration) {
          tween({
            radius: this.finalRadius
          }).to(duration, {
            radius: this.initialRadius
          }, {
            onUpdate: target => {
              this.drawCircle(target.radius); // 动态更新圆形半径
            }
          }).start();
        }
      }, _descriptor = _applyDecoratedDescriptor(_class2.prototype, "maskNode", [_dec2], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      }), _class2)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/common-util.ts", ['cc'], function (exports) {
  var cclegacy;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      cclegacy._RF.push({}, "7ab2eUZPf9PkYSetmjPBset", "common-util", undefined);
      class CommonUtil {
        static delay(ms) {
          return new Promise(resolve => setTimeout(resolve, ms));
        }
      }
      exports('CommonUtil', CommonUtil);
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/config.ts", ['cc'], function (exports) {
  var cclegacy;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      cclegacy._RF.push({}, "8310cYEGYlEk5TfDj6G40kh", "config", undefined);
      class Config {
        static get API_URL() {
          return this.DEBUG ? this.Debug_API_URL : this.Release_API_URL;
        }
        static get WSS_URL() {
          return this.DEBUG ? this.Debug_WSS_URL : this.Release_WSS_URL;
        }
      }
      exports('Config', Config);
      Config.Debug_API_URL = 'http://test-first-api.haizhixinnet.com';
      Config.Release_API_URL = 'http://test-first-api.haizhixinnet.com';
      Config.Debug_WSS_URL = 'wss://test-first-api.haizhixinnet.com/wss';
      Config.Release_WSS_URL = 'wss://test-first-api.haizhixinnet.com/wss';
      Config.GAME_VERSION = "1.0.0";
      Config.DEBUG = true;
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/front-line.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc'], function (exports) {
  var _applyDecoratedDescriptor, _initializerDefineProperty, cclegacy, Asset, _decorator, Component, native, game;
  return {
    setters: [function (module) {
      _applyDecoratedDescriptor = module.applyDecoratedDescriptor;
      _initializerDefineProperty = module.initializerDefineProperty;
    }, function (module) {
      cclegacy = module.cclegacy;
      Asset = module.Asset;
      _decorator = module._decorator;
      Component = module.Component;
      native = module.native;
      game = module.game;
    }],
    execute: function () {
      var _dec, _dec2, _class2, _class3, _descriptor;
      cclegacy._RF.push({}, "a6e5eE53J5KmK+R1Fcpxo8I", "front-line", undefined);
      const {
        ccclass,
        property
      } = _decorator;
      class HotUpdateInfo {
        constructor() {
          this.version = '';
          this.timestamp = 0;
        }
      }
      exports('HotUpdateInfo', HotUpdateInfo);
      const FrontLineEvent = exports('FrontLineEvent', {
        UPDATE_PROGRESS: 'update_progress',
        UPDATE_ERROR: 'update_error',
        UPDATE_SUCCESS: 'update_success',
        UPDATE_FAILED: 'update_failed',
        ALREADY_UP_TO_DATE: 'already_up_to_date'
      });
      const HOT_UPDATE_TIME_COST = exports('HOT_UPDATE_TIME_COST', 'hot_update_time_cost');
      let FrontLine = exports('FrontLine', (_dec = ccclass('FrontLine'), _dec2 = property(Asset), _dec(_class2 = (_class3 = class FrontLine extends Component {
        constructor(...args) {
          super(...args);
          _initializerDefineProperty(this, "localManifest", _descriptor, this);
          this._assetsManager = void 0;
          this._storagePath = void 0;
          this._isStarted = false;
          this._callback = null;
          this._retryLimit = 3;
          this._retryCount = 0;
          this._localStorageFolderName = 'sntemp';
          this._maxConcurrentTask = 8;
          // Add fields for progress timeout tracking
          this._lastProgressTs = 0;
          // last progress timestamp in ms
          this._checkIntervalSec = 2;
          // interval seconds for checking
          this._progressTimeoutSec = 30;
          // timeout seconds before restart
          this._checkProgressTimer = null;
          // scheduled check callback reference
          this.totalKBytes = 0;
          this._remoteVersion = '';
        }
        get currentVersion() {
          if (this._assetsManager) {
            const localManifest = this._assetsManager.getLocalManifest();
            return localManifest ? localManifest.getVersion() : '';
          }
          return '';
        }
        get remoteVersion() {
          return this._remoteVersion;
        }
        startUpdate(callback) {
          console.log(`binTest-front line start: ${this._isStarted}`);
          if (this._isStarted) {
            return false;
          }
          this._callback = callback;
          this._isStarted = true;
          if (!this.localManifest) {
            if (this._callback) {
              this._callback(false, 'binTest-local manifest is null');
            }
            return false;
          }
          this.init();
          if (!this._assetsManager) {
            if (this._callback) {
              this._callback(false, 'binTest-assets manager is null');
            }
            return false;
          }
          this.actionUpdate();
          return true;
        }
        init() {
          if (!native || !native.fileUtils) {
            return;
          }
          this._storagePath = native.fileUtils.getWritablePath() + this._localStorageFolderName;
          console.log(`binTest-front line this._storagePath: ${this._storagePath}`);
          this._assetsManager = new native.AssetsManager(this.localManifest.nativeUrl, this._storagePath, this.versionCompare.bind(this));
          console.log(`binTest-front line init: ${this._assetsManager}`);
          this._assetsManager.setMaxConcurrentTask(this._maxConcurrentTask);
          this._assetsManager.setVerifyCallback(this.fileVerify.bind(this));
        }

        //versionA是当前
        //versionB是热更
        versionCompare(versionA, versionB) {
          this._remoteVersion = versionB;
          var vA = versionA.split('.');
          var vB = versionB.split('.');
          for (var i = 0; i < vA.length; ++i) {
            var a = parseInt(vA[i]);
            var b = parseInt(vB[i] || '0');
            if (a === b) {
              continue;
            } else {
              return a - b;
            }
          }
          if (vB.length > vA.length) {
            return -1;
          } else {
            return 0;
          }
        }
        fileVerify(path, asset) {
          console.log('binTest-fileVerify', path, asset.nativeUrl);
          return true;
        }
        actionCheck() {
          this._assetsManager.setEventCallback(this.onCheckEvent.bind(this));
          this._assetsManager.checkUpdate();
        }

        /**
         * 根据EventAssetsManager枚举值获取对应的key名称
         */
        getEventCodeName(code) {
          for (const key in native.EventAssetsManager) {
            const value = native.EventAssetsManager[key];
            if (typeof value === 'number' && value === code) {
              return key;
            }
          }
          return `UNKNOWN_EVENT_CODE_${code}`;
        }
        getStateName(state) {
          for (const key in native.AssetsManager.State) {
            const value = native.AssetsManager.State[key];
            if (typeof value === 'number' && value === state) {
              return key;
            }
          }
          return `UNKNOWN_STATE_${state}`;
        }
        printEventEnumValue() {
          for (const key in native.EventAssetsManager) {
            const value = native.EventAssetsManager[key];
            if (typeof value === 'number') {
              console.log(`${key}: ${value}`);
            }
          }
          for (const key in native.AssetsManager.State) {
            const value = native.AssetsManager.State[key];
            if (typeof value === 'number') {
              console.log(`${key}: ${value}`);
            }
          }
          console.log('=== 所有枚举值列表结束 ===');
        }
        onCheckEvent(event) {
          const eventCode = event.getEventCode();
          console.log(`binTest-onCheckEvent-code:${eventCode}`);
          switch (eventCode) {
            case native.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
            case native.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            case native.EventAssetsManager.ERROR_PARSE_MANIFEST:
              this.onUpdateError(event);
              break;
            case native.EventAssetsManager.ALREADY_UP_TO_DATE:
              this.onAlreadyUpToDate();
              break;
            case native.EventAssetsManager.NEW_VERSION_FOUND:
              this.actionUpdate();
              break;
          }
        }
        actionUpdate() {
          console.log('binTest-actionUpdate');
          this._assetsManager.setEventCallback(this.onUpdateEvent.bind(this));
          // Initialize last progress time and start periodic timeout check
          this._lastProgressTs = 0;
          this.startProgressWatch();
          this._assetsManager.update();
          console.log('binTest-actionUpdate-2');
        }
        onUpdateEvent(event) {
          const eventCode = event.getEventCode();
          console.log(`binTest-onUpdateEvent-code:${eventCode}`);
          switch (eventCode) {
            case native.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            case native.EventAssetsManager.ERROR_PARSE_MANIFEST:
            case native.EventAssetsManager.ERROR_UPDATING:
            case native.EventAssetsManager.ERROR_DECOMPRESS:
            case native.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
              this.onUpdateError(event);
              break;
            case native.EventAssetsManager.UPDATE_PROGRESSION:
              this.onUpdateProgress(event);
              break;
            case native.EventAssetsManager.ALREADY_UP_TO_DATE:
              this.onAlreadyUpToDate();
              break;
            case native.EventAssetsManager.UPDATE_FAILED:
              this.onUpdateFailedAndRetry();
              break;
            case native.EventAssetsManager.UPDATE_FINISHED:
              this.onUpdateSuccess();
              break;
          }
        }
        onUpdateError(event) {
          console.log(`binTest-onUpdateError:${event.getMessage()}`);
          this.cleanUp();

          // 触发错误事件
          this.node.emit(FrontLineEvent.UPDATE_ERROR);

          // 回调失败状态
          if (this._callback) {
            this._callback(false, '');
          }
        }
        onUpdateProgress(event) {
          // Update last progress timestamp on each progress callback
          if (this.totalKBytes == 0) {
            this.totalKBytes = Math.round(event.getTotalBytes() / 1024 * 100) / 100;
          }
          let percent = event.getDownloadedBytes() / event.getTotalBytes();
          if (typeof percent === 'number' && percent > 0) {
            this._lastProgressTs = Date.now();
            percent = Math.floor(percent * 100) / 100;
            console.log(`binTest-onUpdateProgress: ${(percent * 100).toFixed(0)}%`);
            this.node.emit(FrontLineEvent.UPDATE_PROGRESS, percent);
          }
        }
        onAlreadyUpToDate() {
          console.log('binTest-onAlreadyUpToDate');
          this.cleanUp();

          // 触发已经是最新版本事件
          this.node.emit(FrontLineEvent.ALREADY_UP_TO_DATE);
          if (this._callback) {
            this._callback(true, '');
          }
        }
        onUpdateFailedAndRetry() {
          console.log('binTest-onUpdateFailedAndRetry');
          if (this._retryCount < this._retryLimit) {
            this._retryCount++;
            this._assetsManager.downloadFailedAssets();
          } else {
            this.cleanUp();

            // 触发更新失败事件
            this.node.emit(FrontLineEvent.UPDATE_FAILED);
            if (this._callback) {
              this._callback(false, '');
            }
          }
        }
        onUpdateSuccess() {
          console.log('binTest-onUpdateSuccess');
          this.cleanUp();
          const searchPaths = native.fileUtils.getSearchPaths();
          const newPaths = this._assetsManager.getLocalManifest().getSearchPaths();

          // Array.prototype.push.apply(searchPaths, newPaths);
          const finalPaths = newPaths.concat(searchPaths);
          localStorage.setItem('FlexSearchPaths', JSON.stringify(finalPaths));
          native.fileUtils.setSearchPaths(finalPaths);

          // localStorage.setItem('FlexSearchPaths', JSON.stringify(searchPaths));
          // native.fileUtils.setSearchPaths(searchPaths);

          // 触发更新成功事件
          this.node.emit(FrontLineEvent.UPDATE_SUCCESS);
          if (this._callback) {
            this._callback(true, "");
          }
          setTimeout(() => {
            game.restart();
          }, 500);
        }
        cleanUp() {
          this._assetsManager.setEventCallback(null);
          // Stop progress timeout watcher when cleaning up
          this._lastProgressTs = 0;
          this.stopProgressWatch();
        }

        /**
         * Start periodic watch for update progress timeout.
         * Runs every _checkIntervalSec seconds and checks if no progress has been
         * reported for _progressTimeoutSec seconds; if so, restart the game.
         */
        startProgressWatch() {
          // Ensure any previous schedule is cleared to avoid duplicates
          if (this._checkProgressTimer) {
            this.unschedule(this._checkProgressTimer);
            console.log('binTest-startProgressWatch-unschedule-checkProgressTimer');
          }
          // Define timer callback to check for timeout
          this._checkProgressTimer = () => {
            if (this._lastProgressTs == 0) {
              return;
            }
            const now = Date.now();
            const deltaSec = (now - this._lastProgressTs) / 1000;
            if (deltaSec >= this._progressTimeoutSec) {
              console.warn(`binTest-progress-timeout: no progress for ${deltaSec.toFixed(1)}s, restarting game`);
              // Stop watcher and cleanup before restart to avoid duplicate actions
              this.stopProgressWatch();
              this.cleanUp();
              game.restart();
            }
          };
          // Schedule periodic checks
          console.log('binTest-startProgressWatch-schedule-checkProgressTimer');
          this.schedule(this._checkProgressTimer, this._checkIntervalSec);
        }

        /**
         * Stop the periodic progress timeout watcher if it is running.
         */
        stopProgressWatch() {
          if (this._checkProgressTimer) {
            this.unschedule(this._checkProgressTimer);
            this._checkProgressTimer = null;
          }
        }
      }, _descriptor = _applyDecoratedDescriptor(_class3.prototype, "localManifest", [_dec2], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      }), _class3)) || _class2));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/hf-start.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './front-line.ts'], function (exports) {
  var _applyDecoratedDescriptor, _initializerDefineProperty, cclegacy, ProgressBar, Label, _decorator, Component, sys, director, assetManager, FrontLine, FrontLineEvent;
  return {
    setters: [function (module) {
      _applyDecoratedDescriptor = module.applyDecoratedDescriptor;
      _initializerDefineProperty = module.initializerDefineProperty;
    }, function (module) {
      cclegacy = module.cclegacy;
      ProgressBar = module.ProgressBar;
      Label = module.Label;
      _decorator = module._decorator;
      Component = module.Component;
      sys = module.sys;
      director = module.director;
      assetManager = module.assetManager;
    }, function (module) {
      FrontLine = module.FrontLine;
      FrontLineEvent = module.FrontLineEvent;
    }],
    execute: function () {
      var _dec, _dec2, _dec3, _dec4, _dec5, _class, _class2, _descriptor, _descriptor2, _descriptor3, _descriptor4;
      cclegacy._RF.push({}, "c7797tkQLZJ+7AcTgWRrVEZ", "hf-start", undefined);
      const {
        ccclass,
        property
      } = _decorator;
      const HOT_UPDATE_TIME_COST = exports('HOT_UPDATE_TIME_COST', 'hot_update_time_cost');
      const HOT_UPDATE_TIMESTAMP_2 = exports('HOT_UPDATE_TIMESTAMP_2', 'hot_update_timestamp_2');
      let HfStart = exports('HfStart', (_dec = ccclass('HfStart'), _dec2 = property(ProgressBar), _dec3 = property(Label), _dec4 = property(Label), _dec5 = property(Label), _dec(_class = (_class2 = class HfStart extends Component {
        constructor(...args) {
          super(...args);
          _initializerDefineProperty(this, "progressBar", _descriptor, this);
          _initializerDefineProperty(this, "lblProgress", _descriptor2, this);
          _initializerDefineProperty(this, "lblLoading", _descriptor3, this);
          _initializerDefineProperty(this, "lblVersion", _descriptor4, this);
          this.HOT_UPDATE_THRESHOLD = 5 * 60 * 1000;
          // 5分钟内的更新认为是刚更新过
          // hf
          this.hf_start_time = 0;
          this.dotCount = 0;
          this.loadingLabelUpdater = null;
        }
        /**
         * Lifecycle: onLoad
         * Load remote background image and set the Sprite using SpriteFrame.createWithImage to avoid type mismatch.
         */
        onLoad() {
          this.progressBar.progress = 0;
          this.lblProgress.string = '0%';
          const frontLine = this.node.getComponent(FrontLine);
          this.lblVersion.string = frontLine.currentVersion;
          console.log('bin-HfStart-welcome-hf-start-onload');
          // 检查是否刚进行过热更新
          if (this.isRecentlyUpdated()) {
            console.log('bin-HfStart-检测到最近刚进行过热更新，直接进入游戏');
            this.enterGame();
            return;
          }

          // 发起热更新检查
          this.progressBar.node.active = true;
          if (sys.isNative) {
            this.startHotUpdate();
          } else {
            this.simulateHotUpdate();
          }
        }

        /**
         * Lifecycle: start
         * Schedule the loading label updater and cache the bound callback for proper unscheduling.
         */
        start() {
          this.dotCount = 0;
          if (!this.loadingLabelUpdater) {
            this.loadingLabelUpdater = this.updateForLoadingLabel.bind(this);
          }
          this.schedule(this.loadingLabelUpdater, 0.3);
        }
        onEnable() {
          this.node.on(FrontLineEvent.UPDATE_PROGRESS, this.updateProgress, this);
          this.node.on(FrontLineEvent.UPDATE_SUCCESS, this.onUpdateSuccess, this);
          this.node.on(FrontLineEvent.UPDATE_FAILED, this.onUpdateFailed, this);
          this.node.on(FrontLineEvent.ALREADY_UP_TO_DATE, this.onAlreadyUpToDate, this);
          this.node.on(FrontLineEvent.UPDATE_ERROR, this.onUpdateError, this);
        }
        onDisable() {
          this.node.off(FrontLineEvent.UPDATE_PROGRESS, this.updateProgress, this);
          this.node.off(FrontLineEvent.UPDATE_SUCCESS, this.onUpdateSuccess, this);
          this.node.off(FrontLineEvent.UPDATE_FAILED, this.onUpdateFailed, this);
          this.node.off(FrontLineEvent.ALREADY_UP_TO_DATE, this.onAlreadyUpToDate, this);
          this.node.off(FrontLineEvent.UPDATE_ERROR, this.onUpdateError, this);
        }

        /**
         * 检查是否最近刚进行过热更新
         */
        isRecentlyUpdated() {
          const lastUpdateTime = sys.localStorage.getItem(HOT_UPDATE_TIMESTAMP_2);
          if (!lastUpdateTime) {
            return false;
          }
          const timestamp = parseInt(lastUpdateTime);
          const currentTime = Date.now();
          const timeDiff = currentTime - timestamp;
          console.log(`bin-HfStart-距离上次更新时间: ${timeDiff}ms`);
          return timeDiff < this.HOT_UPDATE_THRESHOLD;
        }

        /**
         * 记录热更新时间
         */
        recordUpdateTime() {
          sys.localStorage.setItem(HOT_UPDATE_TIMESTAMP_2, Date.now().toString());
          console.log('bin-HfStart-记录热更新时间');
        }

        /**
         * 模拟热更新流程（非原生环境）
         */
        simulateHotUpdate() {
          console.log('bin-HfStart-开始模拟热更新');
          let progress = 0;
          const totalTime = 3000; // 3秒
          const updateInterval = 50; // 每50ms更新一次
          const progressIncrement = updateInterval / totalTime * 100; // 每次更新的进度增量

          const updateProgressInterval = setInterval(() => {
            progress += progressIncrement;

            // 确保进度不超过100%
            if (progress >= 100) {
              progress = 100;
              clearInterval(updateProgressInterval);
              console.log('bin-HfStart-模拟热更新完成');
              this.enterGame();
            }

            // 调用进度更新函数
            this.updateProgress(progress / 100);
          }, updateInterval);
        }

        /**
         * 开始热更新流程
         */
        startHotUpdate() {
          let startTime = Date.now();
          console.log('bin-HfStart-开始热更新检查');
          const frontLine = this.node.getComponent(FrontLine);
          if (!frontLine) {
            console.error('bin-HfStart-FrontLine组件未找到');
            return;
          }
          this.lblVersion.string = frontLine.currentVersion;
          this.hf_start_time = Date.now();
          frontLine.startUpdate((success, message) => {
            console.log('bin-HfStart-热更新回调-success-msg:', success, message);
            if (success) {
              console.log('bin-HfStart-热更新成功');
              let endTime = Date.now();
              console.log(`bin-HfStart-热更新成功，耗时：${endTime - startTime}ms`);
              let timeCost = sys.localStorage.getItem(HOT_UPDATE_TIME_COST);
              if (!timeCost) {
                timeCost = 0;
              } else {
                try {
                  timeCost = parseFloat(timeCost);
                } catch (error) {
                  console.error('timeCost is not a number');
                  timeCost = 0;
                }
              }
              sys.localStorage.setItem(HOT_UPDATE_TIME_COST, (timeCost + (endTime - startTime) / 1000).toFixed(2));
            } else {
              console.log('bin-HfStart-热更新失败', message);
              if (frontLine.currentVersion != '1.0.0.0') {
                this.enterGame();
              }
            }
          });
        }

        /**
         * 更新进度回调
         */
        updateProgress(progress) {
          const frontLine = this.node.getComponent(FrontLine);
          const currentVersion = frontLine.currentVersion;
          const nextVersion = frontLine.remoteVersion;
          console.log(`binTest111-HfStart-currentVersion: ${currentVersion}, nextVersion: ${nextVersion}, progress: ${progress * 100}%`);
          this.lblVersion.string = `${currentVersion} -> ${nextVersion}`;
          if (this.loadingLabelUpdater) {
            this.unschedule(this.loadingLabelUpdater);
          }
          this.progressBar.progress = progress % 0.1 * 10;
          let stage = Math.floor(progress * 10);
          this.lblLoading.string = `Updating resources (${stage}/10)`;
          this.lblProgress.string = `${Math.floor(this.progressBar.progress * 100)}%`;
        }

        /**
         * 热更新成功回调
         */
        onUpdateSuccess() {
          console.log('bin-HfStart-热更新成功，准备重启游戏');
          let lastHfTime = sys.localStorage.getItem(HOT_UPDATE_TIMESTAMP_2);
          if (!lastHfTime) {
            let duration = Date.now() - this.hf_start_time;
            const frontLine = this.node.getComponent(FrontLine);
            let nextVersion = frontLine.remoteVersion;
            console.log(`bin-HfStart-热更新成功，耗时：${duration}, 新版本：${nextVersion}`);
          }
          this.hf_start_time = 0;
          this.recordUpdateTime();
          // 重启游戏，会重新回到这个场景
          // 注意：game.restart() 会在 front-line.ts 的 onUpdateSuccess 中被调用
        }

        /**
         * 热更新失败回调
         */
        onUpdateFailed() {
          console.log('bin-HfStart-热更新失败，继续进入游戏');
          const frontLine = this.node.getComponent(FrontLine);
          if (frontLine.currentVersion != '1.0.0.0') {
            this.enterGame();
          }
        }

        /**
         * 已经是最新版本回调
         */
        onAlreadyUpToDate() {
          console.log('bin-HfStart-已经是最新版本，直接进入游戏');
          const frontLine = this.node.getComponent(FrontLine);
          if (frontLine.currentVersion != '1.0.0.0') {
            this.enterGame();
          }
        }

        /**
         * 热更新错误回调
         */
        onUpdateError() {
          console.log('bin-HfStart-热更新出错，继续进入游戏');
          this.enterGame();
        }

        /**
         * 进入游戏主场景
         */
        async enterGame() {
          console.log('bin-HfStart-进入B游戏主场景');
          await this.loadBundles();
          console.log('binTest:0');
          director.loadScene('main');
        }
        updateForLoadingLabel() {
          let suffix = '.'.repeat(this.dotCount);
          const text = 'Loading' + suffix;
          this.lblLoading.string = text;

          // 增加点数，最多3个，然后循环重置
          this.dotCount = (this.dotCount + 1) % 4;
        }
        async loadBundles() {
          const bundles = [];
          const promises = [];
          for (let i = 0; i < bundles.length; i++) {
            const bundleName = bundles[i];
            const promise = new Promise((resolve, reject) => {
              assetManager.loadBundle(bundleName, (err, bundle) => {
                if (err) {
                  console.error('load bundle error:', bundleName, err);
                  resolve();
                  return;
                }
                resolve();
                console.log('load bundle success:', bundleName);
              });
            });
            promises.push(promise);
          }
          await Promise.all(promises);
          console.log('all bundles loaded');
        }
      }, (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "progressBar", [_dec2], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, "lblProgress", [_dec3], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      }), _descriptor3 = _applyDecoratedDescriptor(_class2.prototype, "lblLoading", [_dec4], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      }), _descriptor4 = _applyDecoratedDescriptor(_class2.prototype, "lblVersion", [_dec5], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      })), _class2)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/HomeView.ts", ['cc', './ui-view.ts'], function (exports) {
  var cclegacy, _decorator, UIView;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
      _decorator = module._decorator;
    }, function (module) {
      UIView = module.UIView;
    }],
    execute: function () {
      var _dec, _class;
      cclegacy._RF.push({}, "b491aZjcz5BIo4XpEMOnaF6", "HomeView", undefined);
      const {
        ccclass,
        property
      } = _decorator;
      let HomeView = exports('HomeView', (_dec = ccclass('HomeView'), _dec(_class = class HomeView extends UIView {
        start() {}
        onEnable() {}
        update(deltaTime) {}
      }) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/http-agent.ts", ['cc'], function (exports) {
  var cclegacy;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      cclegacy._RF.push({}, "bc67aMO50VN5q63hCgcdnEt", "http-agent", undefined);
      class HttpError extends Error {
        get status() {
          var _this$response;
          return ((_this$response = this.response) == null ? void 0 : _this$response.status) || 0;
        }
        get statusText() {
          var _this$response2;
          return ((_this$response2 = this.response) == null ? void 0 : _this$response2.statusText) || '';
        }
        get headers() {
          var _this$response3;
          return ((_this$response3 = this.response) == null ? void 0 : _this$response3.headers) || null;
        }
        constructor(...args) {
          if (args.length == 1) {
            super(args[0]);
            this.response = void 0;
          } else if (args.length == 2) {
            if (args[1] instanceof Response) {
              super(args[0]);
              this.response = void 0;
              this.response = args[1];
            } else {
              super(args[1]);
              this.response = void 0;
              this.name = args[0];
            }
          } else {
            super(args[1]);
            this.response = void 0;
            this.name = args[0];
            this.response = args[2];
          }
          console.error('HttpError:', this.name, this.message, this.response);
        }
      }
      exports('HttpError', HttpError);
      HttpError.TIMEOUT = 'TIMEOUT';
      HttpError.ABORT_TIMEOUT = 'ABORT_TIMEOUT';
      HttpError.NETWORK_ERROR = 'NETWORK_ERROR';
      HttpError.UNKNOWN = 'UNKNOWN';
      class HttpAgent {
        static async request(url, method, headers, timeout = 0, params) {
          const promises = [];
          let timeoutHandle = 0;
          if (timeout > 0) {
            const timeoutPromise = new Promise((_, reject) => {
              if (timeout > 0) {
                timeoutHandle = setTimeout(() => {
                  timeoutHandle = 0;
                  reject(new HttpError(HttpError.TIMEOUT, `Request timed out after ${timeout / 1000}s`));
                }, timeout);
              }
            });
            promises.push(timeoutPromise);
          }
          const fetchPromise = fetch(url, {
            // signal: signal,
            cache: 'no-store',
            // 或 'reload'
            method: method,
            headers: headers,
            body: params ? JSON.stringify(params) : undefined
          }).then(response => {
            if (timeoutHandle > 0) {
              clearTimeout(timeoutHandle);
              timeoutHandle = 0;
            }
            if (!response.ok) {
              throw new HttpError(HttpError.NETWORK_ERROR, response.statusText, response);
            }
            const contentType = response.headers.get('Content-Type');
            if (contentType && contentType.includes('application/json')) {
              return response.json();
            } else {
              return response.text();
            }
          }).catch(error => {
            if (timeoutHandle > 0) {
              clearTimeout(timeoutHandle);
              timeoutHandle = 0;
            }
            if (error instanceof HttpError) {
              return Promise.reject(error);
            }
            const message = error instanceof Error ? error.message : String(error);
            return Promise.reject(new HttpError(HttpError.NETWORK_ERROR, message));
          });
          promises.push(fetchPromise);
          return Promise.race(promises).catch(error => {
            return Promise.reject(error);
          });
        }
      }
      exports('HttpAgent', HttpAgent);
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/log-util.ts", ['cc', './config.ts'], function (exports) {
  var cclegacy, Config;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
    }, function (module) {
      Config = module.Config;
    }],
    execute: function () {
      cclegacy._RF.push({}, "cd7a7WzBZlCOrXHnE+qaSgd", "log-util", undefined);
      class LogUtil {
        static log(...args) {
          if (Config.DEBUG) {
            console.log('[LOG]', ...args);
          }
        }
        static warn(...args) {
          if (Config.DEBUG) {
            console.warn('[WARN]', ...args);
          }
        }
        static error(...args) {
          console.error('[ERROR]', ...args); // 错误日志始终打印
        }
      }

      exports('LogUtil', LogUtil);
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/LoginView.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './ui-view.ts', './api-manager.ts', './string-util.ts', './ui-manager.ts', './ui-config.ts', './bridge-util.ts', './bridge-manager.ts'], function (exports) {
  var _applyDecoratedDescriptor, _initializerDefineProperty, cclegacy, EditBox, _decorator, UIView, ApiManager, StringUtil, UIManager, UIID, BridgeUtil, VibrationEffect, BridgeManager;
  return {
    setters: [function (module) {
      _applyDecoratedDescriptor = module.applyDecoratedDescriptor;
      _initializerDefineProperty = module.initializerDefineProperty;
    }, function (module) {
      cclegacy = module.cclegacy;
      EditBox = module.EditBox;
      _decorator = module._decorator;
    }, function (module) {
      UIView = module.UIView;
    }, function (module) {
      ApiManager = module.ApiManager;
    }, function (module) {
      StringUtil = module.StringUtil;
    }, function (module) {
      UIManager = module.UIManager;
    }, function (module) {
      UIID = module.UIID;
    }, function (module) {
      BridgeUtil = module.BridgeUtil;
      VibrationEffect = module.VibrationEffect;
    }, function (module) {
      BridgeManager = module.BridgeManager;
    }],
    execute: function () {
      var _dec, _dec2, _dec3, _class, _class2, _descriptor, _descriptor2;
      cclegacy._RF.push({}, "67959NTNtlP9a2ID5rFTqEP", "LoginView", undefined);
      const {
        ccclass,
        property
      } = _decorator;
      let LoginView = exports('LoginView', (_dec = ccclass('LoginView'), _dec2 = property(EditBox), _dec3 = property(EditBox), _dec(_class = (_class2 = class LoginView extends UIView {
        constructor(...args) {
          super(...args);
          _initializerDefineProperty(this, "phoneInput", _descriptor, this);
          _initializerDefineProperty(this, "codeInput", _descriptor2, this);
        }
        onLoad() {}
        start() {}
        onEnable() {
          // super.onEnable();
          BridgeManager.instance.setupNativeEventListner(async () => {
            console.log("cocos setupNativeEventListner");
          });
        }
        onOpen(fromUI, ...args) {
          console.log("onOpen", fromUI, args);
        }
        async onSendCode() {
          var _this$phoneInput;
          const phone = ((_this$phoneInput = this.phoneInput) == null || (_this$phoneInput = _this$phoneInput.string) == null ? void 0 : _this$phoneInput.trim()) ?? '';
          if (!StringUtil.isValidPhone(phone)) {
            UIManager.instance.showToast('请输入正确的手机号');
            return;
          }
          await ApiManager.instance.sendCode(phone);
        }
        async onLogin() {
          var _this$phoneInput2, _this$codeInput;
          const phone = ((_this$phoneInput2 = this.phoneInput) == null || (_this$phoneInput2 = _this$phoneInput2.string) == null ? void 0 : _this$phoneInput2.trim()) ?? '';
          const code = ((_this$codeInput = this.codeInput) == null || (_this$codeInput = _this$codeInput.string) == null ? void 0 : _this$codeInput.trim()) ?? '';
          let result = await ApiManager.instance.login(phone, code);
          if (result && result.code === 200) {
            UIManager.instance.showToast('登录成功');
            UIManager.instance.close(this);
            UIManager.instance.open(UIID.HomeView);
          } else {
            UIManager.instance.showToast('登录失败');
          }
        }
        onVibrate() {
          BridgeUtil.vibrate(30, VibrationEffect.TICK);
        }
        onMail() {
          BridgeUtil.sendMail('test@test.com', '测试邮件', '这是一封测试邮件');
        }
        update(deltaTime) {}
      }, (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "phoneInput", [_dec2], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, "codeInput", [_dec3], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      })), _class2)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/main", ['./front-line.ts', './hf-start.ts', './progress-bar-ctrl2.ts', './bridge-event.ts', './bridge-manager.ts', './bridge-util.ts', './native-agent.ts', './audio-effect-pool.ts', './audio-effect.ts', './audio-manager.ts', './audio-music.ts', './api-manager.ts', './http-agent.ts', './request-manager.ts', './ws-manager.ts', './res-keeper.ts', './res-leak-checker.ts', './res-loader.ts', './res-util.ts', './ui-manager.ts', './ui-screen-adapter.ts', './ui-view.ts', './array-util.ts', './bezier-util.ts', './common-util.ts', './log-util.ts', './object-util.ts', './random-util.ts', './safe-area-util.ts', './string-util.ts', './svg-util.ts', './VirtualScrollView.ts', './circular-mask.ts', './progress-bar-ctrl.ts', './round-rect-mask.ts', './scroll-card.ts', './config.ts', './ui-config.ts', './main.ts', './HomeView.ts', './LoginView.ts', './toast.ts'], function () {
  return {
    setters: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    execute: function () {}
  };
});

System.register("chunks:///_virtual/main.ts", ['cc', './ui-manager.ts', './ui-config.ts', './log-util.ts'], function (exports) {
  var cclegacy, Component, game, Game, _decorator, UIManager, UICF, UIID, LogUtil;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
      Component = module.Component;
      game = module.game;
      Game = module.Game;
      _decorator = module._decorator;
    }, function (module) {
      UIManager = module.UIManager;
    }, function (module) {
      UICF = module.UICF;
      UIID = module.UIID;
    }, function (module) {
      LogUtil = module.LogUtil;
    }],
    execute: function () {
      var _dec, _class;
      cclegacy._RF.push({}, "e11612vD2xGa49NMhinRo6V", "main", undefined);
      const {
        ccclass,
        property
      } = _decorator;
      let main = exports('main', (_dec = ccclass('main'), _dec(_class = class main extends Component {
        onLoad() {
          UIManager.instance.initUIConf(UICF);
          UIManager.instance.open(UIID.LoginView);
        }
        start() {
          game.on(Game.EVENT_HIDE, this.onGamePause, this);
          game.on(Game.EVENT_SHOW, this.onGameShow, this);
        }
        onDisable() {
          game.off(Game.EVENT_HIDE, this.onGamePause, this);
          game.off(Game.EVENT_SHOW, this.onGameShow, this);
        }
        onGamePause() {
          LogUtil.log("onGamePause");
        }
        onGameShow() {
          LogUtil.log("onGameShow");
        }
      }) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/native-agent.ts", ['cc'], function (exports) {
  var cclegacy, native;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
      native = module.native;
    }],
    execute: function () {
      cclegacy._RF.push({}, "6c9eeMY8AtMULJgvFugEdXy", "native-agent", undefined);
      class NativeAgent {
        static dispatchEventToNative(event, data) {
          if (native && native.jsbBridgeWrapper) {
            native.jsbBridgeWrapper.dispatchEventToNative(event, data || "");
          }
        }
      }
      exports('NativeAgent', NativeAgent);
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/object-util.ts", ['cc', './log-util.ts'], function (exports) {
  var cclegacy, LogUtil;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
    }, function (module) {
      LogUtil = module.LogUtil;
    }],
    execute: function () {
      exports({
        ArrayType: ArrayType,
        ClassType: ClassType,
        MapType: MapType
      });
      cclegacy._RF.push({}, "3e27falzVVDApFtVJf2W0Qk", "object-util", undefined);

      // 类型元数据装饰器
      function ClassType(type) {
        return function (target, propertyKey) {
          if (!target.constructor.__typeInfo__) {
            target.constructor.__typeInfo__ = new Map();
          }
          target.constructor.__typeInfo__.set(propertyKey, type);
        };
      }

      // 数组类型元数据装饰器
      function ArrayType(type) {
        return function (target, propertyKey) {
          if (!target.constructor.__arrayTypeInfo__) {
            target.constructor.__arrayTypeInfo__ = new Map();
          }
          target.constructor.__arrayTypeInfo__.set(propertyKey, type);
        };
      }
      function MapType(keyType, valueType) {
        return function (target, propertyKey) {
          if (!target.constructor.__mapTypeInfo__) {
            target.constructor.__mapTypeInfo__ = new Map();
          }
          target.constructor.__mapTypeInfo__.set(propertyKey, {
            keyType,
            valueType
          });
        };
      }
      class ObjectUtil {
        static fromPlain(targetClass, plain) {
          return ObjectUtil.restoreObject(targetClass, plain);
        }
        static fromString(targetClass, text) {
          try {
            const jsonObj = JSON.parse(text);
            return this.restoreObject(targetClass, jsonObj);
          } catch (error) {
            LogUtil.error('ObjectUtil fromString Failed to parse JSON:', error);
            return new targetClass();
          }
        }

        /**
         * 将 JSON 对象与类型化对象的默认值进行合并
         * 如果 JSON 对象没有某个字段，使用类型化对象的默认值
         * 如果 JSON 对象有类型化对象没有的字段，则忽略
         * @param targetClass 目标类型构造函数
         * @param jsonData JSON 对象数据
         * @returns 合并后的类型化对象
         */
        static mergeWithDefaults(targetClass, jsonData) {
          // 创建默认实例
          const defaultInstance = new targetClass();
          if (!jsonData || typeof jsonData !== 'object') {
            return defaultInstance;
          }

          // 获取类型元数据
          const typeInfo = targetClass.prototype.constructor.__typeInfo__ || new Map();
          const arrayTypeInfo = targetClass.prototype.constructor.__arrayTypeInfo__ || new Map();
          const mapTypeInfo = targetClass.prototype.constructor.__mapTypeInfo__ || new Map();

          // 遍历默认实例的所有属性
          for (const key in defaultInstance) {
            // 检查 JSON 数据中是否有对应字段
            if (jsonData.hasOwnProperty(key)) {
              const jsonValue = jsonData[key];
              if (jsonValue === null || jsonValue === undefined) {
                // JSON 中值为 null 或 undefined，使用默认值
                continue;
              }

              // 处理 Map 类型（使用 @MapType 装饰器的字段）
              const mapType = mapTypeInfo.get(key);
              if (mapType) {
                const {
                  keyType,
                  valueType
                } = mapType;
                const resultObj = {};

                // 处理对象格式 { key: value, key: value }
                if (typeof jsonValue === 'object' && !Array.isArray(jsonValue)) {
                  for (const [k, v] of Object.entries(jsonValue)) {
                    const restoredKey = this.restoreValue(keyType, k);
                    const restoredValue = this.restoreValue(valueType, v);
                    resultObj[restoredKey] = restoredValue;
                  }
                }
                defaultInstance[key] = resultObj;
                continue;
              }

              // 处理数组类型
              const arrayType = arrayTypeInfo.get(key);
              if (arrayType && Array.isArray(jsonValue)) {
                defaultInstance[key] = jsonValue.map(item => this.restoreObject(arrayType, item));
                continue;
              }

              // 处理对象类型
              const type = typeInfo.get(key);
              if (type && typeof jsonValue === 'object' && !Array.isArray(jsonValue)) {
                defaultInstance[key] = this.restoreObject(type, jsonValue);
                continue;
              }

              // 处理基本类型
              defaultInstance[key] = jsonValue;
            }
            // 如果 JSON 中没有对应字段，保持默认值不变
          }

          return defaultInstance;
        }
        static restoreObject(targetClass, data) {
          const instance = new targetClass();
          if (!data || typeof data !== 'object') {
            return instance;
          }

          // 获取类型元数据
          const typeInfo = targetClass.prototype.constructor.__typeInfo__ || new Map();
          const arrayTypeInfo = targetClass.prototype.constructor.__arrayTypeInfo__ || new Map();
          const mapTypeInfo = targetClass.prototype.constructor.__mapTypeInfo__ || new Map();
          for (const key in data) {
            const value = data[key];
            if (value === null || value === undefined) {
              continue;
            }

            // 检查是否是 Map 类型
            const mapType = mapTypeInfo.get(key);
            if (mapType) {
              const map = new Map();
              const {
                keyType,
                valueType
              } = mapType;

              // 处理 Map 数据
              if (Array.isArray(value)) {
                // 如果是数组格式 [[key, value], [key, value]]
                for (const [k, v] of value) {
                  const restoredKey = this.restoreValue(keyType, k);
                  const restoredValue = this.restoreValue(valueType, v);
                  map.set(restoredKey, restoredValue);
                }
              } else if (typeof value === 'object') {
                // 如果是对象格式 { key: value, key: value }
                for (const [k, v] of Object.entries(value)) {
                  const restoredKey = this.restoreValue(keyType, k);
                  const restoredValue = this.restoreValue(valueType, v);
                  map.set(restoredKey, restoredValue);
                }
              }
              instance[key] = map;
              continue;
            }

            // 处理其他类型
            if (typeof value === 'object') {
              if (Array.isArray(value)) {
                const arrayType = arrayTypeInfo.get(key);
                if (arrayType) {
                  instance[key] = value.map(item => this.restoreObject(arrayType, item));
                } else {
                  instance[key] = value;
                }
              } else {
                const type = typeInfo.get(key);
                if (type) {
                  instance[key] = this.restoreObject(type, value);
                } else {
                  instance[key] = value;
                }
              }
            } else {
              instance[key] = value;
            }
          }
          return instance;
        }
        static restoreValue(type, value) {
          if (value === null || value === undefined) {
            return value;
          }
          if (type === String) {
            return String(value);
          } else if (type === Number) {
            return Number(value);
          } else if (type === Boolean) {
            return Boolean(value);
          } else if (typeof value === 'object') {
            // 对于复杂对象类型，使用 restoreObject 方法
            return this.restoreObject(type, value);
          }
          return value;
        }
      }
      exports('ObjectUtil', ObjectUtil);
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/progress-bar-ctrl.ts", ['cc'], function (exports) {
  var cclegacy, Component, UITransform, Widget, ProgressBar, Label, _decorator;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
      Component = module.Component;
      UITransform = module.UITransform;
      Widget = module.Widget;
      ProgressBar = module.ProgressBar;
      Label = module.Label;
      _decorator = module._decorator;
    }],
    execute: function () {
      var _dec, _class;
      cclegacy._RF.push({}, "29b2ec4YGZIBrCt0Nben9Bl", "progress-bar-ctrl", undefined);
      const {
        ccclass,
        property
      } = _decorator;
      let ProgressBarCtrl = exports('ProgressBarCtrl', (_dec = ccclass('ProgressBar'), _dec(_class = class ProgressBarCtrl extends Component {
        constructor(...args) {
          super(...args);
          this.total = 100;
          this.accumulated = 10;
          this.lockAt = 10;
          this.step = 0.8;
          this.slownCut = 0.35;
          this.callback = null;
          this.slownBegin = 0;
          this.slownEnd = 0;
        }
        start() {
          this.setProgress(this.accumulated / this.total);
        }
        update(deltaTime) {
          this.stepProgress();
        }
        setConfig(callback, slownBegin = 0, slwonEnd = 0) {
          this.callback = callback;
          this.slownBegin = slownBegin;
          this.slownEnd = slwonEnd;
        }
        lock(val) {
          this.lockAt = val;
        }
        getCurrentLock() {
          return this.lockAt;
        }
        unlock() {
          this.lockAt = this.total;
        }
        slownDownIfNeed() {
          if (this.slownBegin <= 0 && this.slownEnd <= 0) {
            return;
          }
          if (this.accumulated < this.slownBegin || this.accumulated > this.slownEnd) {
            return;
          }
          this.accumulated -= this.slownCut;
          if (this.accumulated < 10) {
            this.accumulated = 10;
          }
          return this.accumulated;
        }
        stepProgress() {
          this.accumulated += this.step;
          this.slownDownIfNeed();
          if (this.accumulated > this.total) {
            this.accumulated = this.total;
          }
          if (this.accumulated > this.lockAt) {
            this.accumulated = this.lockAt;
          }
          const proregss = this.accumulated / this.total;
          this.setProgress(proregss);
          // this.updateBubble(proregss);
          if (this.accumulated == this.total) {
            this.callback && this.callback();
            this.callback = null;
          }
        }
        updateBubble(progress) {
          const bubbleNode = this.node.getChildByName('bubble');
          if (bubbleNode) {
            const alignLeft = progress * this.node.getComponent(UITransform).width - 80;
            bubbleNode.getComponent(Widget).left = alignLeft;
          }
        }
        setProgress(progress) {
          if (progress < 0) {
            progress = 0;
          } else if (progress > 1) {
            progress = 1;
          }
          this.getComponent(ProgressBar).progress = progress;
          let lblProgress = this.node.getChildByName('LabelProgress');
          if (lblProgress) {
            lblProgress.getComponent(Label).string = `${(progress * 100).toFixed(0)}%`;
          }
        }
      }) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/progress-bar-ctrl2.ts", ['cc'], function (exports) {
  var cclegacy, Component, UITransform, Widget, ProgressBar, Label, _decorator;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
      Component = module.Component;
      UITransform = module.UITransform;
      Widget = module.Widget;
      ProgressBar = module.ProgressBar;
      Label = module.Label;
      _decorator = module._decorator;
    }],
    execute: function () {
      var _dec, _class;
      cclegacy._RF.push({}, "e6f47XqFr5OBICRFIr43xlv", "progress-bar-ctrl", undefined);
      const {
        ccclass,
        property
      } = _decorator;
      let ProgressBarCtrl = exports('ProgressBarCtrl', (_dec = ccclass('ProgressBarCtrl'), _dec(_class = class ProgressBarCtrl extends Component {
        constructor(...args) {
          super(...args);
          this.total = 100;
          this.accumulated = 10;
          this.lockAt = 10;
          this.step = 0.8;
          this.slownCut = 0.35;
          this.callback = null;
          this.slownBegin = 0;
          this.slownEnd = 0;
        }
        start() {
          this.setProgress(this.accumulated / this.total);
        }
        update(deltaTime) {
          this.stepProgress();
        }
        setConfig(callback, slownBegin = 0, slwonEnd = 0) {
          this.callback = callback;
          this.slownBegin = slownBegin;
          this.slownEnd = slwonEnd;
        }
        lock(val) {
          this.lockAt = val;
        }
        getCurrentLock() {
          return this.lockAt;
        }
        unlock() {
          this.lockAt = this.total;
        }
        slownDownIfNeed() {
          if (this.slownBegin <= 0 && this.slownEnd <= 0) {
            return;
          }
          if (this.accumulated < this.slownBegin || this.accumulated > this.slownEnd) {
            return;
          }
          this.accumulated -= this.slownCut;
          if (this.accumulated < 10) {
            this.accumulated = 10;
          }
          return this.accumulated;
        }
        stepProgress() {
          this.accumulated += this.step;
          this.slownDownIfNeed();
          if (this.accumulated > this.total) {
            this.accumulated = this.total;
          }
          if (this.accumulated > this.lockAt) {
            this.accumulated = this.lockAt;
          }
          const proregss = this.accumulated / this.total;
          this.setProgress(proregss);
          // this.updateBubble(proregss);
          if (this.accumulated == this.total) {
            this.callback && this.callback();
            this.callback = null;
          }
        }
        updateBubble(progress) {
          const bubbleNode = this.node.getChildByName('bubble');
          if (bubbleNode) {
            const alignLeft = progress * this.node.getComponent(UITransform).width - 80;
            bubbleNode.getComponent(Widget).left = alignLeft;
          }
        }
        setProgress(progress) {
          if (progress < 0) {
            progress = 0;
          } else if (progress > 1) {
            progress = 1;
          }
          this.getComponent(ProgressBar).progress = progress;
          let lblProgress = this.getComponentInChildren(Label);
          if (lblProgress) {
            lblProgress.string = `${Math.floor(progress * 100)}%`;
          }
        }
      }) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/random-util.ts", ['cc'], function (exports) {
  var cclegacy;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      cclegacy._RF.push({}, "5630cqViF1AlphS7FGPbu8R", "random-util", undefined);
      class RandomUtil {
        static random(arg1, arg2) {
          if (typeof arg1 === 'number' && typeof arg2 === 'number') {
            return this.randomNumber(arg1, arg2);
          } else if (Array.isArray(arg1)) {
            if (Array.isArray(arg2)) {
              return this.randomInArrayByWeightArray(arg1, arg2);
            } else if (typeof arg2 === 'string') {
              return this.randomInArrayByWeightKey(arg1, arg2);
            } else if (typeof arg2 === 'number') {
              return this.randomElementsInArray(arg1, arg2);
            } else {
              return this.randomElementInArray(arg1);
            }
          } else {
            return this.randomString(arg1);
          }
        }
        static randomString(length) {
          const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
          let result = '';
          for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            result += characters.charAt(randomIndex);
          }
          return result;
        }
        static randomNumber(start, end) {
          return Math.floor(Math.random() * (end - start + 1) + start);
        }
        static randomInArrayByWeightArray(values, weights) {
          if (weights.length !== values.length) {
            return this.randomElementInArray(values);
          }
          const index = this.randomIndexByWeight(weights);
          return values[index];
        }
        static randomInArrayByWeightKey(values, weightKey) {
          const weights = values.map(value => value[weightKey] || 0);
          return this.randomInArrayByWeightArray(values, weights);
        }
        static randomIndexByWeight(weights) {
          const sum = weights.reduce((acc, cur) => acc + cur, 0);
          let random = Math.random() * sum;
          for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random < 0) {
              return i;
            }
          }
          return this.randomNumber(0, weights.length - 1);
        }
        static randomElementInArray(values) {
          return values[this.randomNumber(0, values.length - 1)];
        }
        static randomElementsInArray(arr, count) {
          if (count == 1) {
            return [this.randomElementInArray(arr)];
          }
          if (count >= arr.length) {
            return this.shuffle(this.shuffle(arr));
          }
          const shuffled = arr.slice(); // 创建副本以避免修改原数组
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1)); // 生成 [0, i] 范围内的随机索引
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // 交换元素
          }

          return shuffled.slice(0, count);
        }
        static shuffle(arr) {
          const shuffled = arr.slice(); // 创建副本以避免修改原数组
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1)); // 生成 [0, i] 范围内的随机索引
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // 交换元素
          }

          return shuffled;
        }
      }
      exports('RandomUtil', RandomUtil);
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/request-manager.ts", ['cc', './config.ts', './common-util.ts', './http-agent.ts'], function (exports) {
  var cclegacy, Config, CommonUtil, HttpAgent;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
    }, function (module) {
      Config = module.Config;
    }, function (module) {
      CommonUtil = module.CommonUtil;
    }, function (module) {
      HttpAgent = module.HttpAgent;
    }],
    execute: function () {
      cclegacy._RF.push({}, "2b8113yx/pFG56Uxjbb+It7", "request-manager", undefined);
      class ReqeustManager {
        constructor() {
          this.timeout = 6000;
          // 请求超时时间（毫秒）
          this.maxRetries = 2;
          // 最大重试次数
          this.retryDelay = 300;
          // 每次重试的间隔时间（毫秒）
          this.token = "";
          this.header = {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          };
        }
        static get instance() {
          if (!this._instance) {
            this._instance = new ReqeustManager();
          }
          return this._instance;
        }
        setToken(token) {
          this.token = token || "";
        }
        async get(url, params) {
          return this.requestWithRetry(url, 'GET', this.timeout, params, true);
        }

        /** POST，参数放 JSON body */
        async post(url, params) {
          return this.requestWithRetry(url, 'POST', this.timeout, params, false);
        }

        /** POST，参数拼到 URL Query（对接 Apifox Query 参数接口） */
        async postQuery(url, params) {
          return this.requestWithRetry(url, 'POST', this.timeout, params, true);
        }
        async requestWithRetry(url, method, timeout, params, asQuery = false, retries = this.maxRetries) {
          try {
            return await this.request(url, method, timeout, params, asQuery);
          } catch (error) {
            if (retries > 0) {
              console.warn(`Request failed. Retrying... (${this.maxRetries - retries + 1}/${this.maxRetries})`);
              await CommonUtil.delay(this.retryDelay);
              return this.requestWithRetry(url, method, timeout, params, asQuery, retries - 1);
            } else {
              console.error('Request failed after maximum retries:', error);
              throw error;
            }
          }
        }
        buildQuery(params) {
          if (!params) {
            return "";
          }
          const parts = [];
          for (const key in params) {
            if (!Object.prototype.hasOwnProperty.call(params, key)) {
              continue;
            }
            const value = params[key];
            if (value === undefined || value === null) {
              continue;
            }
            parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
          }
          return parts.length > 0 ? `?${parts.join("&")}` : "";
        }
        async request(url, method, timeout, params, asQuery = false) {
          let fullUrl = Config.API_URL + url;
          let body = params;
          if (asQuery) {
            fullUrl += this.buildQuery(params);
            body = undefined;
          }
          const headers = this.buildHeader();
          console.log(`${method} - Request URL:${fullUrl} , params:${JSON.stringify(params)}`);
          return HttpAgent.request(fullUrl, method, headers, timeout, body);
        }
        buildHeader(headers) {
          const merged = {
            ...this.header,
            ...(headers || {})
          };
          if (this.token) {
            merged["Authorization"] = `Bearer ${this.token}`;
          }
          return new Headers(merged);
        }
      }
      exports('ReqeustManager', ReqeustManager);
      ReqeustManager._instance = void 0;
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/res-keeper.ts", ['cc', './res-loader.ts'], function (exports) {
  var cclegacy, Component, _decorator, resLoader;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
      Component = module.Component;
      _decorator = module._decorator;
    }, function (module) {
      resLoader = module.resLoader;
    }],
    execute: function () {
      var _class;
      cclegacy._RF.push({}, "19b43Qqr9pOUpYImeC91SvL", "res-keeper", undefined);
      /**
       * 资源引用类
       * 1. 提供加载功能，并记录加载过的资源
       * 2. 在node释放时自动清理加载过的资源
       * 3. 支持手动添加记录
       */
      const {
        ccclass
      } = _decorator;
      let ResKeeper = exports('ResKeeper', ccclass(_class = class ResKeeper extends Component {
        constructor(...args) {
          super(...args);
          this.resCache = new Set();
        }
        /**
         * 开始加载资源
         * @param bundle        assetbundle的路径
         * @param url           资源url或url数组
         * @param type          资源类型，默认为null
         * @param onProgess     加载进度回调
         * @param onCompleted   加载完成回调
         */
        load(...args) {
          // 调用加载接口
          resLoader.load.apply(resLoader, args);
        }

        /**
         * 缓存资源
         * @param asset 
         */
        cacheAsset(asset) {
          if (!this.resCache.has(asset)) {
            asset.addRef();
            this.resCache.add(asset);
          }
        }

        /**
         * 组件销毁时自动释放所有keep的资源
         */
        onDestroy() {
          this.releaseAssets();
        }

        /**
         * 释放资源，组件销毁时自动调用
         */
        releaseAssets() {
          if (!this.resCache) {
            this.resCache = new Set();
          }
          this.resCache.forEach(element => {
            element.decRef();
          });
          this.resCache.clear();
        }
      }) || _class);
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/res-leak-checker.ts", ['cc', './res-util.ts', './log-util.ts'], function (exports) {
  var cclegacy, ResUtil, LogUtil;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
    }, function (module) {
      ResUtil = module.ResUtil;
    }, function (module) {
      LogUtil = module.LogUtil;
    }],
    execute: function () {
      cclegacy._RF.push({}, "f01edpcOrlCQbEnhCy0cxfC", "res-leak-checker", undefined);
      class ResLeakChecker {
        constructor() {
          this.resFilter = null;
          // 资源过滤回调
          this._checking = false;
          this.traceAssets = new Set();
        }
        /**
         * 检查该资源是否符合过滤条件
         * @param url 
         */
        checkFilter(asset) {
          if (!this._checking) {
            return false;
          }
          if (this.resFilter) {
            return this.resFilter(asset);
          }
          return true;
        }

        /**
         * 对资源进行引用的跟踪
         * @param asset 
         */
        traceAsset(asset) {
          if (!asset || !this.checkFilter(asset)) {
            return;
          }
          if (!this.traceAssets.has(asset)) {
            asset.addRef();
            this.traceAssets.add(asset);
            this.extendAsset(asset);
          }
        }

        /**
         * 扩展asset，使其支持引用计数追踪
         * @param asset 
         */
        extendAsset(asset) {
          let addRefFunc = asset.addRef;
          let decRefFunc = asset.decRef;
          let traceMap = new Map();
          asset.traceMap = traceMap;
          asset.addRef = function (...args) {
            let stack = ResUtil.getCallStack(1);
            let cnt = traceMap.has(stack) ? traceMap.get(stack) + 1 : 1;
            traceMap.set(stack, cnt);
            return addRefFunc.apply(asset, args);
          };
          asset.decRef = function (...args) {
            let stack = ResUtil.getCallStack(1);
            let cnt = traceMap.has(stack) ? traceMap.get(stack) + 1 : 1;
            traceMap.set(stack, cnt);
            return decRefFunc.apply(asset, args);
          };
          asset.resetTrace = () => {
            asset.addRef = addRefFunc;
            asset.decRef = decRefFunc;
            delete asset.traceMap;
          };
        }

        /**
         * 还原asset，使其恢复默认的引用计数功能
         * @param asset 
         */
        resetAsset(asset) {
          if (asset.resetTrace) {
            asset.resetTrace();
          }
        }
        untraceAsset(asset) {
          if (this.traceAssets.has(asset)) {
            this.resetAsset(asset);
            asset.decRef();
            this.traceAssets.delete(asset);
          }
        }
        startCheck() {
          this._checking = true;
        }
        stopCheck() {
          this._checking = false;
        }
        getTraceAssets() {
          return this.traceAssets;
        }
        reset() {
          this.traceAssets.forEach(element => {
            this.resetAsset(element);
            element.decRef();
          });
          this.traceAssets.clear();
        }
        dump() {
          this.traceAssets.forEach(element => {
            let traceMap = element.traceMap;
            if (traceMap) {
              traceMap.forEach((key, value) => {
                LogUtil.log(`${key} : ${value} `);
              });
            }
          });
        }
      }
      exports('ResLeakChecker', ResLeakChecker);
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/res-loader.ts", ['cc'], function (exports) {
  var js, Asset, assetManager, resources, cclegacy;
  return {
    setters: [function (module) {
      js = module.js;
      Asset = module.Asset;
      assetManager = module.assetManager;
      resources = module.resources;
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      cclegacy._RF.push({}, "3bfbeXWNFVLY6XYDJmIMs6v", "res-loader", undefined);
      class ResLoader {
        constructor() {
          this.defaultBundleName = "resources";
        }
        parseLoadResArgs(paths, type, onProgress, onComplete) {
          let pathsOut = paths;
          let typeOut = type;
          let onProgressOut = onProgress;
          let onCompleteOut = onComplete;
          if (onComplete === undefined) {
            const isValidType = js.isChildClassOf(type, Asset);
            if (onProgress) {
              onCompleteOut = onProgress;
              if (isValidType) {
                onProgressOut = null;
              }
            } else if (onProgress === undefined && !isValidType) {
              onCompleteOut = type;
              onProgressOut = null;
              typeOut = null;
            }
            if (onProgress !== undefined && !isValidType) {
              onProgressOut = type;
              typeOut = null;
            }
          }
          return {
            paths: pathsOut,
            type: typeOut,
            onProgress: onProgressOut,
            onComplete: onCompleteOut
          };
        }
        loadByBundleAndArgs(bundle, args) {
          if (args.dir) {
            bundle.loadDir(args.paths, args.type, args.onProgress, args.onComplete);
          } else {
            if (typeof args.paths == 'string') {
              bundle.load(args.paths, args.type, args.onProgress, args.onComplete);
            } else {
              bundle.load(args.paths, args.type, args.onProgress, args.onComplete);
            }
          }
        }
        loadByArgs(args) {
          if (args.bundle) {
            if (assetManager.bundles.has(args.bundle)) {
              let bundle = assetManager.bundles.get(args.bundle);
              this.loadByBundleAndArgs(bundle, args);
            } else {
              // 自动加载bundle
              assetManager.loadBundle(args.bundle, (err, bundle) => {
                if (!err) {
                  this.loadByBundleAndArgs(bundle, args);
                }
              });
            }
          } else {
            this.loadByBundleAndArgs(resources, args);
          }
        }
        load(bundleName, paths, type, onProgress, onComplete) {
          let args = null;
          if (typeof paths === "string" || paths instanceof Array) {
            args = this.parseLoadResArgs(paths, type, onProgress, onComplete);
            args.bundle = bundleName;
          } else {
            args = this.parseLoadResArgs(bundleName, paths, type, onProgress);
          }
          this.loadByArgs(args);
        }

        /**
         * 异步加载一个资源
         * @param bundleName    远程包名
         * @param paths         资源路径
         * @param type          资源类型
         */

        loadAsync(bundleName, paths, type) {
          return new Promise((resolve, reject) => {
            this.load(bundleName, paths, type, (err, asset) => {
              if (err) {
                console.error(err.message);
              }
              resolve(asset);
            });
          });
        }
        loadDir(bundleName, dir, type, onProgress, onComplete) {
          let args = null;
          if (typeof dir === "string") {
            args = this.parseLoadResArgs(dir, type, onProgress, onComplete);
            args.bundle = bundleName;
          } else {
            args = this.parseLoadResArgs(bundleName, dir, type, onProgress);
          }
          args.dir = args.paths;
          this.loadByArgs(args);
        }
        loadRemote(url, ...args) {
          assetManager.loadRemote(url, args);
        }

        /**
         * 通过资源相对路径释放资源
         * @param path          资源路径
         * @param bundleName    远程资源包名
         */
        release(path, bundleName = this.defaultBundleName) {
          const bundle = assetManager.getBundle(bundleName);
          if (bundle) {
            const asset = bundle.get(path);
            if (asset) {
              this.releasePrefabtDepsRecursively(asset);
            }
          }
        }

        /**
         * 通过相对文件夹路径删除所有文件夹中资源
         * @param path          资源文件夹路径
         * @param bundleName    远程资源包名
         */
        releaseDir(path, bundleName = this.defaultBundleName) {
          const bundle = assetManager.getBundle(bundleName);
          if (bundle) {
            var infos = bundle.getDirWithPath(path);
            if (infos) {
              infos.map(info => {
                this.releasePrefabtDepsRecursively(info.uuid);
              });
            }
            if (path == "" && bundleName != "resources") {
              assetManager.removeBundle(bundle);
            }
          }
        }

        /** 释放预制依赖资源 */
        releasePrefabtDepsRecursively(uuid) {
          if (uuid instanceof Asset) {
            uuid.decRef();
            // assetManager.releaseAsset(uuid);
          } else {
            const asset = assetManager.assets.get(uuid);
            if (asset) {
              asset.decRef();
              // assetManager.releaseAsset(asset);
            }
          }
        }

        /**
         * 获取资源
         * @param path          资源路径
         * @param type          资源类型
         * @param bundleName    远程资源包名
         */
        get(path, type, bundleName = this.defaultBundleName) {
          var bundle = assetManager.getBundle(bundleName);
          return bundle.get(path, type);
        }
      }
      exports('default', ResLoader);
      let resLoader = exports('resLoader', new ResLoader());
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/res-util.ts", ['cc', './res-keeper.ts'], function (exports) {
  var cclegacy, Asset, instantiate, ResKeeper;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
      Asset = module.Asset;
      instantiate = module.instantiate;
    }, function (module) {
      ResKeeper = module.ResKeeper;
    }],
    execute: function () {
      cclegacy._RF.push({}, "a67caVz9etB4YH2WQUwQLsf", "res-util", undefined);
      /**
       * 资源使用相关工具类
       * 2020-1-18
       */

      class ResUtil {
        /**
         * 开始加载资源
         * @param bundle        assetbundle的路径
         * @param url           资源url或url数组
         * @param type          资源类型，默认为null
         * @param onProgess     加载进度回调
         * @param onCompleted   加载完成回调
         */

        static load(attachNode, ...args) {
          let keeper = ResUtil.getResKeeper(attachNode);
          keeper.load.apply(keeper, args);
        }

        /**
         * 从目标节点或其父节点递归查找一个资源挂载组件
         * @param attachNode 目标节点
         * @param autoCreate 当目标节点找不到ResKeeper时是否自动创建一个
         */
        static getResKeeper(attachNode, autoCreate) {
          if (attachNode) {
            let ret = attachNode.getComponent(ResKeeper);
            if (!ret) {
              if (autoCreate) {
                return attachNode.addComponent(ResKeeper);
              } else {
                return ResUtil.getResKeeper(attachNode.parent, autoCreate);
              }
            }
            return ret;
          }
          // 返回一个默认的ResKeeper
          return null;
        }

        /**
        * 赋值srcAsset，并使其跟随targetNode自动释放，用法如下
        * mySprite.spriteFrame = AssignWith(otherSpriteFrame, mySpriteNode);
        * @param srcAsset 用于赋值的资源，如cc.SpriteFrame、cc.Texture等等
        * @param targetNode 
        * @param autoCreate 
        */
        static assignWith(srcAsset, targetNode, autoCreate) {
          let keeper = ResUtil.getResKeeper(targetNode, autoCreate);
          if (keeper && srcAsset instanceof Asset) {
            keeper.cacheAsset(srcAsset);
            return srcAsset;
          } else {
            console.error(`assignWith ${srcAsset} to ${targetNode} faile`);
            return null;
          }
        }

        /**
         * 实例化一个prefab，并带自动释放功能
         * @param prefab 要实例化的预制
         */
        static instantiate(prefab) {
          let node = instantiate(prefab);
          let keeper = ResUtil.getResKeeper(node, true);
          if (keeper) {
            keeper.cacheAsset(prefab);
          }
          return node;
        }

        /**
         * 从字符串中查找第N个字符
         * @param str 目标字符串
         * @param cha 要查找的字符
         * @param num 第N个
         */
        static findCharPos(str, cha, num) {
          let x = str.indexOf(cha);
          let ret = x;
          for (var i = 0; i < num; i++) {
            x = str.indexOf(cha, x + 1);
            if (x != -1) {
              ret = x;
            } else {
              return ret;
            }
          }
          return ret;
        }

        /**
         * 获取当前调用堆栈
         * @param popCount 要弹出的堆栈数量
         */
        static getCallStack(popCount) {
          // 严格模式无法访问 arguments.callee.caller 获取堆栈，只能先用Error的stack
          let ret = new Error().stack;
          let pos = ResUtil.findCharPos(ret, '\n', popCount);
          if (pos > 0) {
            ret = ret.slice(pos);
          }
          return ret;
        }
      }
      exports('ResUtil', ResUtil);
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/round-rect-mask.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc'], function (exports) {
  var _applyDecoratedDescriptor, _initializerDefineProperty, cclegacy, _decorator, Component, Graphics, UITransform;
  return {
    setters: [function (module) {
      _applyDecoratedDescriptor = module.applyDecoratedDescriptor;
      _initializerDefineProperty = module.initializerDefineProperty;
    }, function (module) {
      cclegacy = module.cclegacy;
      _decorator = module._decorator;
      Component = module.Component;
      Graphics = module.Graphics;
      UITransform = module.UITransform;
    }],
    execute: function () {
      var _dec, _dec2, _class, _class2, _descriptor;
      cclegacy._RF.push({}, "a62f3BICSJFO7e6VpfxQHSj", "round-rect-mask", undefined);
      const {
        ccclass,
        property
      } = _decorator;
      let RoundRectMask = exports('RoundRectMask', (_dec = ccclass('RoundRectMask'), _dec2 = property(Number), _dec(_class = (_class2 = class RoundRectMask extends Component {
        constructor(...args) {
          super(...args);
          _initializerDefineProperty(this, "cornerRadius", _descriptor, this);
        }
        start() {
          const graphics = this.getComponent(Graphics);
          graphics.lineWidth = 2;
          let size = this.node.getComponent(UITransform).contentSize;
          graphics.roundRect(0 - size.width / 2, 0 - size.height / 2, size.width, size.height, this.cornerRadius);
          graphics.fill();
        }
      }, _descriptor = _applyDecoratedDescriptor(_class2.prototype, "cornerRadius", [_dec2], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return 40;
        }
      }), _class2)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/safe-area-util.ts", ['cc'], function (exports) {
  var cclegacy, _decorator, Component, view, sys;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
      _decorator = module._decorator;
      Component = module.Component;
      view = module.view;
      sys = module.sys;
    }],
    execute: function () {
      var _dec, _class, _class2;
      cclegacy._RF.push({}, "1fc8b7/AvJNg4yBZQAMUOKl", "safe-area-util", undefined);
      const {
        ccclass,
        property
      } = _decorator;
      let SafeAreaUtil = exports('SafeAreaUtil', (_dec = ccclass('SafeAreaUtil'), _dec(_class = (_class2 = class SafeAreaUtil extends Component {
        constructor(...args) {
          super(...args);
          this._safeAreaTop = 0;
          this._safeAreaBottom = 0;
          this._safeAreaLeft = 0;
          this._safeAreaRight = 0;
        }
        static get instance() {
          return this._instance;
        }
        onLoad() {
          if (SafeAreaUtil._instance === null) {
            SafeAreaUtil._instance = this;
          }
          this.updateSafeArea();
        }
        updateSafeArea() {
          const safeArea = view.getSafeAreaRect();
          const visibleSize = view.getVisibleSize();

          // 计算安全区域边距
          this._safeAreaTop = visibleSize.height - safeArea.y - safeArea.height;
          this._safeAreaBottom = safeArea.y;
          this._safeAreaLeft = safeArea.x;
          this._safeAreaRight = visibleSize.width - safeArea.x - safeArea.width;

          // 如果是 iOS 设备，确保顶部有足够空间避开灵动岛
          if (sys.isIOS) {
            this._safeAreaTop = Math.max(this._safeAreaTop, 60);
          }
        }

        /**
         * 获取顶部安全区域高度
         */
        get safeAreaTop() {
          return this._safeAreaTop;
        }

        /**
         * 获取底部安全区域高度
         */
        get safeAreaBottom() {
          return this._safeAreaBottom;
        }

        /**
         * 获取左侧安全区域宽度
         */
        get safeAreaLeft() {
          return this._safeAreaLeft;
        }

        /**
         * 获取右侧安全区域宽度
         */
        get safeAreaRight() {
          return this._safeAreaRight;
        }
      }, _class2._instance = null, _class2)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/scroll-card.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc'], function (exports) {
  var _applyDecoratedDescriptor, _initializerDefineProperty, cclegacy, Enum, Node, _decorator, Component, Size, Vec3, Vec2, UITransform, Rect, Tween, tween;
  return {
    setters: [function (module) {
      _applyDecoratedDescriptor = module.applyDecoratedDescriptor;
      _initializerDefineProperty = module.initializerDefineProperty;
    }, function (module) {
      cclegacy = module.cclegacy;
      Enum = module.Enum;
      Node = module.Node;
      _decorator = module._decorator;
      Component = module.Component;
      Size = module.Size;
      Vec3 = module.Vec3;
      Vec2 = module.Vec2;
      UITransform = module.UITransform;
      Rect = module.Rect;
      Tween = module.Tween;
      tween = module.tween;
    }],
    execute: function () {
      var _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _dec8, _class, _class2, _descriptor, _descriptor2, _descriptor3, _descriptor4, _descriptor5, _descriptor6, _descriptor7;
      cclegacy._RF.push({}, "62559or8NtM46bz3iIazvlU", "scroll-card", undefined);
      const {
        ccclass,
        property
      } = _decorator;
      var Direction = /*#__PURE__*/function (Direction) {
        Direction[Direction["Horizontal"] = 0] = "Horizontal";
        Direction[Direction["Vertical"] = 1] = "Vertical";
        return Direction;
      }(Direction || {});
      let ScrollCard = exports('ScrollCard', (_dec = ccclass('ScrollCard'), _dec2 = property({
        type: Enum(Direction),
        tooltip: '方向'
      }), _dec3 = property({
        type: Number,
        tooltip: 'node 间隔'
      }), _dec4 = property({
        type: Number,
        tooltip: '移动速度'
      }), _dec5 = property({
        type: Number,
        tooltip: '减速频率'
      }), _dec6 = property({
        type: Number,
        tooltip: '缩放最小值'
      }), _dec7 = property({
        type: Number,
        tooltip: '缩放最大值'
      }), _dec8 = property(Node), _dec(_class = (_class2 = class ScrollCard extends Component {
        constructor(...args) {
          super(...args);
          _initializerDefineProperty(this, "direction", _descriptor, this);
          _initializerDefineProperty(this, "itemOffset", _descriptor2, this);
          _initializerDefineProperty(this, "speed", _descriptor3, this);
          _initializerDefineProperty(this, "rub", _descriptor4, this);
          _initializerDefineProperty(this, "scaleMin", _descriptor5, this);
          _initializerDefineProperty(this, "scaleMax", _descriptor6, this);
          // @property({
          //     type: [Node],
          //     tooltip: '滚动item'
          // })
          this.item = [];
          _initializerDefineProperty(this, "selectBorder", _descriptor7, this);
          // @property(Node)
          // particle: Node = null;
          this._startTime = 0;
          this._moveSpeed = 0;
          this._maxSize = new Size(0, 0);
          this._screenRect = null;
          this.itemList = [];
          this._autoScrollActive = false;
          this._autoScrollSpeed = 2.0;
        }
        // 快速滚动时的速度系数（叠加到 _moveSpeed）

        onLoad() {
          this.item = this.node.children;
          this._initItemPos();
          this.updateScale();

          // this.particle.active = false;

          this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
          this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
          this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
          this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        }
        updateItem() {
          this._initItemPos();
          this.updateScale();
        }
        update(dt) {
          if (this._moveSpeed === 0) return;
          for (let i = 0; i < this.item.length; i++) {
            if (this.direction === Direction.Horizontal) {
              this.item[i].position = new Vec3(this.item[i].position.x - this._moveSpeed * dt * this.speed, this.item[i].position.y, this.item[i].position.z);
            } else {
              this.item[i].position = new Vec3(this.item[i].position.x, this.item[i].position.y - this._moveSpeed * dt * this.speed, this.item[i].position.z);
            }
          }

          // 自动快速滚动时，不进行减速，保持匀速
          if (!this._autoScrollActive) {
            if (this._moveSpeed > 0) {
              this._moveSpeed -= dt * this.rub;
              if (this._moveSpeed < 0) {
                this._moveSpeed = 0;
              }
            } else {
              this._moveSpeed += dt * this.rub;
              if (this._moveSpeed > 0) {
                this._moveSpeed = 0;
              }
            }
          }
          const moveTo = -this._moveSpeed * dt * this.speed;
          this.itemMoveBy(new Vec2(moveTo, moveTo));
          this.updatePos();
        }
        onTouchStart(event) {
          this._moveSpeed = 0;
          this._startTime = Date.now();
        }
        onTouchMove(event) {
          const movePos = event.getDelta();
          this.itemMoveBy(movePos);
        }
        onTouchEnd(event) {
          const curpos = event.getLocation();
          const startpos = event.getStartLocation();
          let dis;
          if (this.direction === Direction.Horizontal) {
            dis = startpos.x - curpos.x;
          } else {
            dis = startpos.y - curpos.y;
          }
          const curTime = Date.now();
          const disTime = curTime - this._startTime;
          // v = s/t
          this._moveSpeed = dis / disTime;
        }
        _initItemPos() {
          this.node.getComponent(UITransform).anchorY = 0.5;
          this.node.getComponent(UITransform).anchorX = 0.5;
          this._maxSize = new Size(0, 0);
          for (let i = 0; i < this.item.length; i++) {
            this._maxSize.width += this.item[i].getComponent(UITransform).width;
            this._maxSize.height += this.item[i].getComponent(UITransform).height;
            this._maxSize.width += this.itemOffset;
            this._maxSize.height += this.itemOffset;
          }
          let startPos;
          if (this.direction === Direction.Horizontal) {
            startPos = new Vec2(-this._maxSize.width * this.node.getComponent(UITransform).anchorX, -this._maxSize.height * this.node.getComponent(UITransform).anchorY);
          } else {
            startPos = new Vec2(this._maxSize.width * this.node.getComponent(UITransform).anchorX, this._maxSize.height * this.node.getComponent(UITransform).anchorY);
          }
          this._screenRect = new Rect(startPos.x, startPos.y, this._maxSize.width, this._maxSize.height);
          this.itemList = [];
          for (let i = 0; i < this.item.length; i++) {
            const anchor = this.item[i].getComponent(UITransform).anchorPoint;
            const itemSize = this.item[i].getComponent(UITransform).contentSize;
            if (this.direction === Direction.Horizontal) {
              startPos.add(new Vec2(itemSize.width * anchor.x, itemSize.height * anchor.y));
              this.item[i].setPosition(startPos.x, 0);
              startPos.add(new Vec2(itemSize.width * anchor.x, itemSize.height * anchor.y));
              startPos.add(new Vec2(this.itemOffset, this.itemOffset));
            } else {
              startPos.subtract(new Vec2(itemSize.width * anchor.x, itemSize.height * anchor.y));
              this.item[i].setPosition(0, startPos.y);
              startPos.subtract(new Vec2(itemSize.width * anchor.x, itemSize.height * anchor.y));
              startPos.subtract(new Vec2(this.itemOffset, this.itemOffset));
            }
            this.itemList[i] = this.item[i];
          }
        }
        itemMoveBy(pos) {
          for (let i = 0; i < this.item.length; i++) {
            if (this.direction === Direction.Horizontal) {
              this.item[i].setPosition(this.item[i].position.x + pos.x, this.item[i].position.y);
            } else {
              this.item[i].setPosition(this.item[i].position.x, this.item[i].position.y + pos.y);
            }
          }
          this.updatePos();
        }
        updatePos() {
          const startItem = this.itemList[0];
          const endItem = this.itemList[this.itemList.length - 1];
          let startout = false;
          if (this.direction === Direction.Horizontal) {
            if (startItem.position.x < -this._maxSize.width / 2) {
              startout = true;
            }
          } else {
            if (startItem.position.y > this._maxSize.width / 2) {
              startout = true;
            }
          }

          // left
          if (startout) {
            const item = this.itemList.shift();
            this.itemList.push(item);
            if (this.direction === Direction.Horizontal) {
              item.setPosition(endItem.position.x + endItem.getComponent(UITransform).width + this.itemOffset, item.position.y);
            } else {
              item.setPosition(item.position.x, endItem.position.y - endItem.getComponent(UITransform).height - this.itemOffset);
            }
          }
          let endout = false;
          if (this.direction === Direction.Horizontal) {
            if (endItem.position.x > this._maxSize.width / 2) {
              endout = true;
            }
          } else {
            if (endItem.position.y < -this._maxSize.height / 2) {
              endout = true;
            }
          }

          // right
          if (endout) {
            const item = this.itemList.pop();
            this.itemList.unshift(item);
            if (this.direction === Direction.Horizontal) {
              item.setPosition(startItem.position.x - startItem.getComponent(UITransform).width - this.itemOffset, item.position.y);
            } else {
              item.setPosition(item.position.x, startItem.position.y + startItem.getComponent(UITransform).height + this.itemOffset);
            }
          }
          this.updateScale();
        }
        updateScale() {
          if (this.scaleMax < this.scaleMin || this.scaleMax === 0) {
            return;
          }
          for (let i = 0; i < this.item.length; i++) {
            let pre;
            if (this.direction === Direction.Horizontal) {
              const x = this.item[i].position.x + this._maxSize.width / 2;
              if (this.item[i].position.x < 0) {
                pre = x / this._maxSize.width;
              } else {
                pre = 1 - x / this._maxSize.width;
              }
            } else {
              const y = this.item[i].position.y + this._maxSize.height / 2;
              if (this.item[i].position.y < 0) {
                pre = y / this._maxSize.height;
              } else {
                pre = 1 - y / this._maxSize.height;
              }
            }
            pre *= 2;
            let scaleTo = this.scaleMax - this.scaleMin;
            scaleTo *= pre;
            scaleTo += this.scaleMin;
            scaleTo = Math.abs(scaleTo);
            this.item[i].setScale(scaleTo, scaleTo);
          }
        }

        // 多次调用 updatePos 以确保在跨一整圈之后，所有节点完全回到循环范围内
        normalizePositions() {
          const maxIter = Math.max(1, this.itemList.length * 2);
          for (let i = 0; i < maxIter; i++) {
            const beforeStart = this.itemList[0].position.clone();
            const beforeEnd = this.itemList[this.itemList.length - 1].position.clone();
            this.updatePos();
            const afterStart = this.itemList[0].position;
            const afterEnd = this.itemList[this.itemList.length - 1].position;
            // 若首尾均未再发生改变，提前结束
            if (beforeStart.equals(afterStart) && beforeEnd.equals(afterEnd)) {
              break;
            }
          }
          this.updateScale();
        }

        /**
         * 将指定索引（基于 this.item）的节点移动到与 selectBorder 重叠位置，
         * 并根据节点尺寸与 itemOffset 重新排布其它节点，确保不会相互重叠。
         */
        moveItem(targetIndex, isAnima = false) {
          if (!this.selectBorder || !this.item || this.item.length === 0) {
            return;
          }

          // 目标节点（按原始 this.item 次序）
          const targetNode = this.item[targetIndex];
          if (!targetNode) return;

          // 找到其在当前可见顺序列表中的位置
          const pivotIndex = this.itemList.indexOf(targetNode);
          if (pivotIndex < 0) return;

          // 计算 selectBorder 相对于滚动容器(this.node)的本地坐标
          const containerUI = this.node.getComponent(UITransform);
          if (!containerUI) return;
          const selectWorldPos = this.selectBorder.worldPosition;
          const selectLocalPos = containerUI.convertToNodeSpaceAR(selectWorldPos);

          // 计算所有节点的目标位置（不立即设置，便于统一补间/设置）
          const targetPositions = new Array(this.itemList.length);
          const pivotNode = this.itemList[pivotIndex];
          let pivotTargetX = pivotNode.position.x;
          let pivotTargetY = pivotNode.position.y;
          if (this.direction === Direction.Horizontal) {
            pivotTargetX = selectLocalPos.x;
          } else {
            pivotTargetY = selectLocalPos.y;
          }
          targetPositions[pivotIndex] = new Vec3(pivotTargetX, pivotTargetY, pivotNode.position.z);

          // 基于尺寸与间距，向左右（或上下）重新排布，避免重叠
          // 向前（左/上）布置
          for (let i = pivotIndex - 1; i >= 0; i--) {
            const rightNode = this.itemList[i + 1];
            const curNode = this.itemList[i];
            const rightUI = rightNode.getComponent(UITransform);
            const curUI = curNode.getComponent(UITransform);
            if (!rightUI || !curUI) continue;
            const rightTarget = targetPositions[i + 1] ?? rightNode.position;
            if (this.direction === Direction.Horizontal) {
              const x = rightTarget.x - (rightUI.width / 2 + this.itemOffset + curUI.width / 2);
              targetPositions[i] = new Vec3(x, curNode.position.y, curNode.position.z);
            } else {
              const y = rightTarget.y + (rightUI.height / 2 + this.itemOffset + curUI.height / 2);
              targetPositions[i] = new Vec3(curNode.position.x, y, curNode.position.z);
            }
          }

          // 向后（右/下）布置
          for (let i = pivotIndex + 1; i < this.itemList.length; i++) {
            const leftNode = this.itemList[i - 1];
            const curNode = this.itemList[i];
            const leftUI = leftNode.getComponent(UITransform);
            const curUI = curNode.getComponent(UITransform);
            if (!leftUI || !curUI) continue;
            const leftTarget = targetPositions[i - 1] ?? leftNode.position;
            if (this.direction === Direction.Horizontal) {
              const x = leftTarget.x + (leftUI.width / 2 + this.itemOffset + curUI.width / 2);
              targetPositions[i] = new Vec3(x, curNode.position.y, curNode.position.z);
            } else {
              const y = leftTarget.y - (leftUI.height / 2 + this.itemOffset + curUI.height / 2);
              targetPositions[i] = new Vec3(curNode.position.x, y, curNode.position.z);
            }
          }

          // 应用到全部节点：动画或直接设置
          if (isAnima) {
            let remaining = this.itemList.length;
            for (let i = 0; i < this.itemList.length; i++) {
              const node = this.itemList[i];
              const toPos = targetPositions[i] ?? node.position.clone();
              Tween.stopAllByTarget(node);
              tween(node).to(0.3, {
                position: new Vec3(toPos.x, toPos.y, node.position.z)
              }, {
                easing: 'quadOut'
              }).call(() => {
                remaining--;
                if (remaining === 0) {
                  this.normalizePositions();
                }
              }).start();
            }
          } else {
            for (let i = 0; i < this.itemList.length; i++) {
              const node = this.itemList[i];
              const toPos = targetPositions[i] ?? node.position.clone();
              node.setPosition(toPos.x, toPos.y, node.position.z);
            }
            this.normalizePositions();
          }
        }

        /**
         * 快速滚动 duration 秒后，停在 targetIndex 上（以动画对齐 selectBorder）。
         * @param targetIndex 目标索引（基于 this.item）
         * @param durationSec 持续时间（秒），默认 5
         * @param speed 系数（越大滚动越快），默认 2.0
         */
        quickScrollToIndex(targetIndex, durationSec = 5, speed = 2.0, UIView) {
          if (!this.item || this.item.length === 0) return;
          this._autoScrollActive = true;
          this._autoScrollSpeed = Math.max(0.1, speed);
          this._moveSpeed = this._autoScrollSpeed;
          setTimeout(() => {
            let timer = setInterval(() => {
              const targetNode = this.item[targetIndex];
              if (!targetNode) return;
              const pivotIndex = this.itemList.indexOf(targetNode);
              if (pivotIndex < 0) return;
              const containerUI = this.node.getComponent(UITransform);
              if (!containerUI) return;
              const selectWorldPos = this.selectBorder.worldPosition;
              const selectLocalPos = containerUI.convertToNodeSpaceAR(selectWorldPos);
              if (Math.abs(targetNode.position.x - selectLocalPos.x) >= 10) ;else {
                this._autoScrollActive = false;
                this._moveSpeed = 0;
                clearInterval(timer);
                this.moveItem(targetIndex);
                // this.particle.active = true;
                setTimeout(() => {}, 500);
              }
            }, 1);
          }, durationSec * 1000);
        }
      }, (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "direction", [_dec2], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return Direction.Horizontal;
        }
      }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, "itemOffset", [_dec3], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return 0;
        }
      }), _descriptor3 = _applyDecoratedDescriptor(_class2.prototype, "speed", [_dec4], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return 500;
        }
      }), _descriptor4 = _applyDecoratedDescriptor(_class2.prototype, "rub", [_dec5], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return 1.0;
        }
      }), _descriptor5 = _applyDecoratedDescriptor(_class2.prototype, "scaleMin", [_dec6], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return 0.5;
        }
      }), _descriptor6 = _applyDecoratedDescriptor(_class2.prototype, "scaleMax", [_dec7], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return 1.0;
        }
      }), _descriptor7 = _applyDecoratedDescriptor(_class2.prototype, "selectBorder", [_dec8], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      })), _class2)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/string-util.ts", ['cc'], function (exports) {
  var cclegacy;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      cclegacy._RF.push({}, "30b02zswkVK0aMzqlz+6q3S", "string-util", undefined);
      class StringUtil {
        /**
         * 替换字符串中的模板占位符（如 #{key}）
         * @param input 原始字符串
         * @param replacements 替换规则（键值对）
         * @returns 替换后的字符串
         */
        static replaceTemplateStrings(input, replacements) {
          const regex = /#\{(\w+)\}/g;
          return input.replace(regex, (match, key) => {
            return key in replacements ? replacements[key].toString() : match;
          });
        }
        static timeFormat(time, isZeroShow = true) {
          const hours = Math.floor(time / 3600);
          const minutes = Math.floor(time % 3600 / 60);
          const seconds = time % 60;
          let formatted = '';
          if (isZeroShow || hours > 0) {
            formatted += `${hours}:`;
          }
          formatted += `${this.pad(minutes)}:${this.pad(seconds)}`;
          return formatted;
        }
        static pad(num) {
          if (num < 10) {
            return `0${num.toFixed(0)}`;
          } else {
            return num.toFixed(0);
          }
        }

        /**
         * 校验中国大陆手机号是否合规
         * - 11 位数字
         * - 以 1 开头，第二位为 3-9
         */
        static isValidPhone(phone) {
          if (typeof phone !== 'string') {
            return false;
          }
          const raw = phone.trim();
          return /^1[3-9]\d{9}$/.test(raw);
        }
      }
      exports('StringUtil', StringUtil);
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/svg-util.ts", ['cc', './log-util.ts'], function (exports) {
  var cclegacy, Vec3, LogUtil;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
      Vec3 = module.Vec3;
    }, function (module) {
      LogUtil = module.LogUtil;
    }],
    execute: function () {
      cclegacy._RF.push({}, "d122enOJPdCgpAcQlsyZoc0", "svg-util", undefined);
      class SvgUtil {
        static exportPoints() {
          LogUtil.log("svgPathClub points", JSON.stringify(this.samplePointsFromSvgPath(this.svgPathClub, 52, 780)));
          LogUtil.log("svgPathDiamond points", JSON.stringify(this.samplePointsFromSvgPath(this.svgPathDiamond, 52, 780)));
          LogUtil.log("svgPathHeart points", JSON.stringify(this.samplePointsFromSvgPath(this.svgPathHeart, 52, 780)));
          LogUtil.log("svgPathSpade points", JSON.stringify(this.samplePointsFromSvgPath(this.svgPathSpade, 52, 780)));
        }
        static samplePointsFromSvgPath(svgPath, totalPoints, maxWidth) {
          const commands = this.parseSvgCommands(svgPath);
          const segments = this.analyzeSegments(commands);
          const points = this.generateSmartPoints(segments, totalPoints).map(p => new Vec3(p.x, -p.y, 0));
          const {
            minX,
            maxX,
            minY,
            maxY
          } = this.getBounds(points);
          const width = maxX - minX;
          const height = maxY - minY;
          const scale = maxWidth / Math.max(width, height, 1);
          const offsetX = (maxX + minX) / 2;
          const offsetY = (maxY + minY) / 2;
          return points.map(p => new Vec3((p.x - offsetX) * scale, (p.y - offsetY) * scale, 0));
        }
        static parseSvgCommands(path) {
          const commandRegex = /([A-Za-z])([^A-Za-z]*)/g;
          const commands = [];
          let match;
          while ((match = commandRegex.exec(path)) !== null) {
            const type = match[1];
            const params = match[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
            commands.push({
              type: type.toUpperCase(),
              params,
              isRelative: type === type.toLowerCase()
            });
          }
          return commands;
        }
        static analyzeSegments(commands) {
          const segments = [];
          let current = new Vec3();
          let startPoint = null;
          for (const cmd of commands) {
            const type = cmd.type.toUpperCase();
            switch (type) {
              case 'M':
                current.set(cmd.params[0], cmd.params[1], 0);
                startPoint = current.clone(); // 记录起点
                const length = 0;
                segments.push({
                  type: 'move',
                  length,
                  command: cmd
                });
                break;
              case 'L':
                {
                  const end = new Vec3(cmd.params[0], cmd.params[1], 0);
                  const length = current.subtract(end).length();
                  segments.push({
                    type: 'line',
                    length,
                    command: cmd
                  });
                  current.set(end);
                  break;
                }
              case 'H':
                {
                  const x = cmd.params[0];
                  const end = new Vec3(x, current.y, 0);
                  const length = Math.abs(end.x - current.x);
                  if (cmd.params.length == 1) {
                    cmd.params.push(current.y);
                  }
                  segments.push({
                    type: 'line',
                    length,
                    command: cmd
                  });
                  current.set(end);
                  break;
                }
              case 'V':
                {
                  const y = cmd.params[0];
                  const end = new Vec3(current.x, y, 0);
                  const length = Math.abs(end.y - current.y);
                  if (cmd.params.length == 1) {
                    cmd.params.push(current.x);
                  }
                  segments.push({
                    type: 'line',
                    length,
                    command: cmd
                  });
                  current.set(end);
                  break;
                }
              case 'C':
                {
                  const cp1 = new Vec3(cmd.params[0], cmd.params[1], 0);
                  const cp2 = new Vec3(cmd.params[2], cmd.params[3], 0);
                  const end = new Vec3(cmd.params[4], cmd.params[5], 0);
                  const approxLength = this.cubicBezierApproxLength(current, cp1, cp2, end);
                  segments.push({
                    type: 'curve',
                    length: approxLength,
                    command: cmd
                  });
                  current.set(end);
                  break;
                }
              case 'S':
                {
                  throw new Error('Smooth cubic bezier is not supported');
                }
              case 'Q':
                {
                  const cp = new Vec3(cmd.isRelative ? current.x + cmd.params[0] : cmd.params[0], cmd.isRelative ? current.y + cmd.params[1] : cmd.params[1], 0);
                  const end = new Vec3(cmd.isRelative ? current.x + cmd.params[2] : cmd.params[2], cmd.isRelative ? current.y + cmd.params[3] : cmd.params[3], 0);

                  // 计算二次贝塞尔曲线的近似长度
                  const approxLength = this.quadraticBezierApproxLength(current, cp, end);
                  segments.push({
                    type: 'quadratic',
                    length: approxLength,
                    command: cmd
                  });
                  current.set(end);
                  break;
                }
              case 'A':
                {
                  const [rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y] = cmd.params;
                  const end = new Vec3(cmd.isRelative ? current.x + x : x, cmd.isRelative ? current.y + y : y, 0);
                  const approxLength = this.arcApproxLength(current, end, rx, ry, xAxisRotation, largeArcFlag, sweepFlag);
                  LogUtil.log("approxLength", approxLength);
                  segments.push({
                    type: 'arc',
                    length: approxLength,
                    command: cmd
                  });
                  current.set(end);
                  break;
                }
              case 'Z':
                if (startPoint) {
                  const length = current.subtract(startPoint).length();
                  segments.push({
                    type: 'line',
                    length,
                    command: {
                      type: 'L',
                      params: [startPoint.x, startPoint.y],
                      isRelative: false
                    }
                  });
                  current.set(startPoint);
                }
                break;
              default:
                LogUtil.log("un support command: ", cmd);
                throw new Error(`Unsupported command: ${type}`);
            }
          }
          return segments;
        }

        /** 三次贝塞尔曲线近似长度计算 */
        static cubicBezierApproxLength(p0, p1, p2, p3) {
          const steps = 200; // 增加采样点数量
          let length = 0;
          let prev = p0.clone();
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const point = this.cubicBezier(p0, p1, p2, p3, t);
            length += prev.subtract(point).length();
            prev.set(point);
          }
          return length;
        }

        /** 三次贝塞尔曲线公式 */
        static cubicBezier(p0, p1, p2, p3, t) {
          const u = 1 - t;
          return new Vec3(u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x, u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y, 0);
        }
        static generateSmartPoints(segments, totalPoints) {
          const points = [];
          let current = new Vec3();
          let remainingPoints = totalPoints;

          // 计算总权重（曲线段权重更高）
          const totalWeight = segments.reduce((sum, seg) => {
            const weight = seg.type === 'curve' || seg.type === 'arc' || seg.type === 'quadratic' ? seg.length * 1 : seg.length; // 曲线段权重加倍
            return sum + weight;
          }, 0);
          segments.forEach((seg, index) => {
            if (seg.type === 'move') {
              current.set(seg.command.params[0], seg.command.params[1], 0);
              return;
            }
            const weight = seg.type === 'curve' || seg.type === 'arc' || seg.type === 'quadratic' ? seg.length * 1 : seg.length;
            const ratio = weight / totalWeight;
            let segmentPoints = Math.max(2, Math.round(totalPoints * ratio));
            if (index === segments.length - 1) {
              segmentPoints = remainingPoints; // 分配剩余点数
            }

            remainingPoints -= segmentPoints;

            // 根据段类型生成点
            switch (seg.type) {
              case 'line':
                this.handleLineWithPoints(seg.command, current, points, segmentPoints);
                break;
              case 'curve':
                this.handleCubicWithPoints(seg.command, current, points, segmentPoints);
                break;
              case 'arc':
                this.handleArcWithPoints(seg.command, current, points, segmentPoints);
                break;
              case 'quadratic':
                this.handleQuadraticWithPoints(seg.command, current, points, segmentPoints);
                break;
            }
          });
          return points;
        }

        /** 按点数生成二次贝塞尔曲线 */
        static handleQuadraticWithPoints(cmd, current, points, segmentPoints) {
          const [x1, y1, x, y] = cmd.params;
          const cp = new Vec3(cmd.isRelative ? current.x + x1 : x1, cmd.isRelative ? current.y + y1 : y1, 0);
          const end = new Vec3(cmd.isRelative ? current.x + x : x, cmd.isRelative ? current.y + y : y, 0);
          for (let i = 0; i < segmentPoints - 1; i++) {
            const t = i / (segmentPoints - 1);
            const point = this.quadraticBezier(current, cp, end, t);
            points.push(point);
          }
          current.set(end);
        }

        /** 按点数生成椭圆弧 */
        static handleArcWithPoints(cmd, current, points, segmentPoints) {
          const [rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y] = cmd.params;
          const end = new Vec3(cmd.isRelative ? current.x + x : x, cmd.isRelative ? current.y + y : y, 0);

          // 椭圆弧参数转换为标准参数
          const arcParams = this.convertArcToCenterParams(current, end, rx, ry, xAxisRotation * Math.PI / 180, largeArcFlag, sweepFlag);

          // 生成椭圆弧上的点
          for (let i = 0; i < segmentPoints - 1; i++) {
            const t = i / (segmentPoints - 1);
            const point = this.getArcPoint(arcParams, t, rx, ry, xAxisRotation * Math.PI / 180);
            points.push(point);
          }
          current.set(end);
        }

        /** 按点数生成直线 */
        static handleLineWithPoints(cmd, current, points, segmentPoints) {
          // LogUtil.log("handleLineWithPoints", cmd, current, points, segmentPoints);
          const end = new Vec3(cmd.isRelative ? current.x + cmd.params[0] : cmd.params[0], cmd.isRelative ? current.y + cmd.params[1] : cmd.params[1], 0);
          for (let i = 0; i < segmentPoints - 1; i++) {
            const t = i / (segmentPoints - 1);
            const x = current.x * (1 - t) + end.x * t;
            const y = current.y * (1 - t) + end.y * t;
            points.push(new Vec3(x, y, 0));
          }
          current.set(end);
        }

        /** 按点数生成贝塞尔曲线 */
        static handleCubicWithPoints(cmd, current, points, segmentPoints) {
          const [x1, y1, x2, y2, x, y] = cmd.params;
          const cp1 = new Vec3(cmd.isRelative ? current.x + x1 : x1, cmd.isRelative ? current.y + y1 : y1, 0);
          const cp2 = new Vec3(cmd.isRelative ? current.x + x2 : x2, cmd.isRelative ? current.y + y2 : y2, 0);
          const end = new Vec3(cmd.isRelative ? current.x + x : x, cmd.isRelative ? current.y + y : y, 0);
          for (let i = 0; i < segmentPoints - 1; i++) {
            const t = i / (segmentPoints - 1);
            const point = this.cubicBezier(current, cp1, cp2, end, t);
            points.push(point);
          }
          current.set(end);
        }

        /** 获取坐标范围 */
        static getBounds(points) {
          return points.reduce((acc, p) => ({
            minX: Math.min(acc.minX, p.x),
            maxX: Math.max(acc.maxX, p.x),
            minY: Math.min(acc.minY, p.y),
            maxY: Math.max(acc.maxY, p.y)
          }), {
            minX: Infinity,
            maxX: -Infinity,
            minY: Infinity,
            maxY: -Infinity
          });
        }

        /** 椭圆弧近似长度计算 */
        static arcApproxLength(start, end, rx, ry, xAxisRotation, largeArcFlag, sweepFlag) {
          const steps = 100; // 采样点数量
          let length = 0;

          // 将角度转换为弧度
          const rotation = xAxisRotation * Math.PI / 180;

          // 椭圆弧参数转换为标准参数
          const arcParams = this.convertArcToCenterParams(start, end, rx, ry, rotation, largeArcFlag, sweepFlag);

          // 采样计算长度
          let prevPoint = this.getArcPoint(arcParams, 0, rx, ry, rotation);
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const point = this.getArcPoint(arcParams, t, rx, ry, rotation);
            length += prevPoint.subtract(point).length();
            prevPoint = point;
          }
          return length;
        }

        /** 将椭圆弧参数转换为中心参数 */
        static convertArcToCenterParams(start, end, rx, ry, rotation, largeArcFlag, sweepFlag) {
          // 修正半径
          rx = Math.abs(rx);
          ry = Math.abs(ry);

          // 将起点和终点转换到椭圆的局部坐标系
          const dx = (start.x - end.x) / 2;
          const dy = (start.y - end.y) / 2;
          const cosRotation = Math.cos(rotation);
          const sinRotation = Math.sin(rotation);
          const x1p = cosRotation * dx + sinRotation * dy;
          const y1p = -sinRotation * dx + cosRotation * dy;

          // 修正半径以确保椭圆弧有效
          const rxSq = rx * rx;
          const rySq = ry * ry;
          const x1pSq = x1p * x1p;
          const y1pSq = y1p * y1p;
          let scale = Math.sqrt((rxSq * rySq - rxSq * y1pSq - rySq * x1pSq) / (rxSq * y1pSq + rySq * x1pSq));
          if (scale < 0) scale = 0;
          if (largeArcFlag === sweepFlag) scale = -scale;
          const cxp = scale * (rx * y1p) / ry;
          const cyp = scale * -(ry * x1p) / rx;

          // 将中心点转换回全局坐标系
          const cx = cosRotation * cxp - sinRotation * cyp + (start.x + end.x) / 2;
          const cy = sinRotation * cxp + cosRotation * cyp + (start.y + end.y) / 2;

          // 计算起始角度和角度跨度
          const startAngle = Math.atan2((y1p - cyp) / ry, (x1p - cxp) / rx);
          const endAngle = Math.atan2((-y1p - cyp) / ry, (-x1p - cxp) / rx);
          let deltaAngle = endAngle - startAngle;
          if (sweepFlag === 0 && deltaAngle > 0) {
            deltaAngle -= 2 * Math.PI;
          } else if (sweepFlag === 1 && deltaAngle < 0) {
            deltaAngle += 2 * Math.PI;
          }
          return {
            cx,
            cy,
            startAngle,
            deltaAngle
          };
        }

        /** 获取椭圆弧上某个位置的点 */
        static getArcPoint(arcParams, t, rx, ry, rotation) {
          const angle = arcParams.startAngle + arcParams.deltaAngle * t;

          // 计算未旋转的椭圆上的点
          const xUnrotated = rx * Math.cos(angle);
          const yUnrotated = ry * Math.sin(angle);

          // 应用旋转变换
          const cosRotation = Math.cos(rotation);
          const sinRotation = Math.sin(rotation);
          const x = cosRotation * xUnrotated - sinRotation * yUnrotated + arcParams.cx;
          const y = sinRotation * xUnrotated + cosRotation * yUnrotated + arcParams.cy;
          return new Vec3(x, y, 0);
        }

        /** 二次贝塞尔曲线近似长度计算 */
        static quadraticBezierApproxLength(p0, p1, p2) {
          const steps = 100; // 采样点数量
          let length = 0;
          let prev = p0.clone();
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const point = this.quadraticBezier(p0, p1, p2, t);
            length += prev.subtract(point).length();
            prev.set(point);
          }
          return length;
        }

        /** 二次贝塞尔曲线公式 */
        static quadraticBezier(p0, p1, p2, t) {
          const u = 1 - t;
          return new Vec3(u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x, u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y, 0);
        }
      }
      exports('SvgUtil', SvgUtil);
      SvgUtil.svgPathClub = "M 160 236 H 96 C 94.7274 234.2689 93.4548 232.5378 92.1821 230.8066 L 104.4598 191.5244 A 52.0014 52.0014 0 1 1 76 96 Q 78.0321 96 80.0544 96.1563 A 52.0001 52.0001 0 1 1 175.9454 96.1563 Q 177.966 96.001 180 96 A 52 52 0 1 1 151.5409 191.5254 L 163.8179 230.8066 A 4.0002 4.0002 0 0 1 160 236";
      SvgUtil.svgPathDiamond = "M 250.587 -2 L 43.227 250.587 L 250.587 503.174 L 457.947 250.587 L 250.587 -2";
      SvgUtil.svgPathHeart = "M 43 17.0766 C 43 11 38.4165 6.8393 32.7626 6.8393 C 29.0403 6.8393 25.7918 8.8325 24 11.8033 C 22.2081 8.8325 18.9597 6.8393 15.2374 6.8393 C 9.5835 6.8393 5.0001 11.4227 5.0001 17.0766 C 5.0001 18.3691 5.2497 19.6006 5.6867 20.7393 C 9.0718 30.4761 24.0001 41.1608 24.0001 41.1608 C 24.0001 41.1608 38.9283 30.4761 42.3135 20.7393 C 42.7505 19.6007 43.0002 18.3691 43 17.0766";
      SvgUtil.svgPathSpade = "M 6.0038 32.9805 C 6.0038 38.9336 9.9882 42.918 15.9413 42.918 C 18.5429 42.918 20.957 42.0273 22.6444 40.668 C 21.707 43.1992 19.9726 45.1211 18.9648 46.293 C 17.5116 48.0976 18.1913 50.4883 20.746 50.4883 L 35.2304 50.4883 C 37.7851 50.4883 38.4648 48.0976 37.0116 46.293 C 36.0038 45.1211 34.2695 43.1992 33.3319 40.668 C 35.0195 42.0273 37.457 42.918 40.0351 42.918 C 46.0116 42.918 49.9962 38.9336 49.9962 32.9805 C 49.9962 23.0898 35.9804 18.2383 30.2851 7.2226 C 29.7929 6.2617 29.2538 5.5117 27.9882 5.5117 C 26.7226 5.5117 26.207 6.2617 25.6913 7.2226 C 19.996 18.2383 6.0038 23.0898 6.0038 32.9805";
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/toast.ts", ['cc', './ui-view.ts', './ui-manager.ts'], function (exports) {
  var cclegacy, Animation, Label, _decorator, UIView, UIManager;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
      Animation = module.Animation;
      Label = module.Label;
      _decorator = module._decorator;
    }, function (module) {
      UIView = module.UIView;
    }, function (module) {
      UIManager = module.UIManager;
    }],
    execute: function () {
      var _dec, _class;
      cclegacy._RF.push({}, "d4c43c8xqZJp4OwfnEj3Uhc", "toast", undefined);
      const {
        ccclass,
        property
      } = _decorator;
      let Toast = exports('Toast', (_dec = ccclass('Toast'), _dec(_class = class Toast extends UIView {
        constructor(...args) {
          super(...args);
          this.label = null;
          this.animaiton = null;
          this.onCompleted = null;
        }
        onEnable() {
          if (this.animaiton) {
            this.animaiton.on(Animation.EventType.FINISHED, this.onAnimationFinished, this);
          }
        }
        onDisable() {
          if (this.animaiton) {
            this.animaiton.off(Animation.EventType.FINISHED, this.onAnimationFinished, this);
          }
        }
        init() {
          this.animaiton = this.getComponentInChildren(Animation);
          this.label = this.getComponentInChildren(Label);
        }
        onAnimationFinished() {
          this.onCompleted && this.onCompleted();
          this.onCompleted = null;
          this.animaiton.stop();
          UIManager.instance.hideToast();
        }
        onOpen(fromUI, ...args) {
          let msg = args[0];
          this.label.string = msg.content;
          this.animaiton.play();
        }
      }) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/ui-config.ts", ['cc'], function (exports) {
  var cclegacy;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      cclegacy._RF.push({}, "90bd3/nYpRM4ZddEw9ARTk7", "ui-config", undefined);
      let UIID = exports('UIID', /*#__PURE__*/function (UIID) {
        UIID[UIID["Toast"] = 0] = "Toast";
        UIID[UIID["LoginView"] = 1] = "LoginView";
        UIID[UIID["HomeView"] = 2] = "HomeView";
        return UIID;
      }({})); // Loading,
      // GuideTips,
      // //main
      // UnderView,
      // GmView,
      // DebugInfoView,
      // PolicyPopup,
      // MoreGameView,
      // GuidePopup,
      // RatingPopup,
      // CardThemeView,
      // RewardGetPopup,
      // SignInPopup,
      // TargetPopup,
      // //beyond
      // BeyondPopup,
      // //sg
      // HomeViewSg,
      // VictoryPopupSg,
      // // PictureObtainPopup,
      // // AdUnlockPopup,
      // // SlidePictureView,
      // // IllustrationViewSg,
      // ItemObtainPopupSg,
      // // PictureObtainView,
      // // AlbumView,
      // // AlbumDetailView,
      // PausedPopupSg,
      // // PictureSelectView,
      // StartViewSg,
      // ItemGetPopupSg,
      // PictureView,
      // LoadingSg,
      // // DescriptionView,
      // StatisticsView,
      // SelectModeView,
      // AddMovesPopup,
      // AdBreakPopup,
      // // SpecialRewardPopup,
      // // RandomPictureView,
      let UICF = exports('UICF', {
        //common
        [UIID.Toast]: {
          prefab: "prefab/common/Toast"
        },
        // [UIID.Loading]: { prefab: "prefab/ui/common/LoadingView", preventTouch: true},
        // [UIID.GuideTips]: { prefab: "prefab/ui/common/GuideTips"},
        // //main
        // [UIID.UnderView]: { prefab: "prefab/ui/home/UnderView" },
        // [UIID.GmView]: { prefab: "prefab/ui/home/GmView", preventTouch: true },
        // [UIID.DebugInfoView]: { prefab: "prefab/ui/home/DebugInfoView", preventTouch: true },
        // [UIID.PolicyPopup]: { prefab: "prefab/ui/home/PolicyPopup", preventTouch: true },
        // [UIID.MoreGameView]: { prefab: "prefab/ui/home/MoreGameView", preventTouch: true },
        // [UIID.GuidePopup]: { prefab: "prefab/ui/home/GuidePopup", preventTouch: true},
        // [UIID.RatingPopup]: { prefab: "prefab/ui/home/RatingPopup", preventTouch: true},
        // [UIID.CardThemeView]: { prefab: "prefab/ui/card-theme/CardThemeView", preventTouch: true},
        // [UIID.RewardGetPopup]: { prefab: "prefab/ui/home/RewardGetPopup", preventTouch: true},
        // [UIID.SignInPopup]: { prefab: "prefab/ui/reward-popup/SignInPopup", preventTouch: true},
        // [UIID.TargetPopup]: { prefab: "prefab/ui/home/TargetPopup", preventTouch: true},
        // //map
        // [UIID.PictureView]: { prefab: "prefab/ui/map/PictureView", preventTouch: true},

        [UIID.LoginView]: {
          prefab: "prefab/view/LoginView"
        },
        [UIID.HomeView]: {
          prefab: "prefab/view/HomeView"
        }
      });
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/ui-manager.ts", ['cc', './res-loader.ts', './ui-view.ts', './ui-config.ts'], function (exports) {
  var cclegacy, director, Prefab, instantiate, Node, UITransform, view, log, isValid, resLoader, UIShowTypes, UIView, UIID;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
      director = module.director;
      Prefab = module.Prefab;
      instantiate = module.instantiate;
      Node = module.Node;
      UITransform = module.UITransform;
      view = module.view;
      log = module.log;
      isValid = module.isValid;
    }, function (module) {
      resLoader = module.resLoader;
    }, function (module) {
      UIShowTypes = module.UIShowTypes;
      UIView = module.UIView;
    }, function (module) {
      UIID = module.UIID;
    }],
    execute: function () {
      cclegacy._RF.push({}, "69f08q9TeJAPoDy8eMrlATk", "ui-manager", undefined);
      class UIManager {
        constructor() {
          /** ui层级 */
          this.uiLayer = null;
          this.toastLayer = null;
          this.guideLayer = null;
          /** 资源加载计数器，用于生成唯一的资源占用key */
          this.useCount = 0;
          /** 背景UI（有若干层UI是作为背景UI，而不受切换等影响）*/
          this.BackGroundUI = 0;
          /** 是否正在关闭UI */
          this.isClosing = false;
          /** 是否正在打开UI */
          this.isOpening = false;
          /** UI界面缓存（key为UIId，value为UIView节点）*/
          this.UICache = {};
          /** UI界面栈（{UIID + UIView + UIArgs}数组）*/
          this.UIStack = [];
          /** UI待打开列表 */
          this.UIOpenQueue = [];
          /** UI待关闭列表 */
          this.UICloseQueue = [];
          /** UI配置 */
          this.UIConf = {};
          this.toastView = null;
          this.guideView = null;
          /** UI打开前回调 */
          this.uiOpenBeforeDelegate = null;
          /** UI打开回调 */
          this.uiOpenDelegate = null;
          /** UI关闭回调 */
          this.uiCloseDelegate = null;
        }
        static get instance() {
          if (!this._instance) {
            this._instance = new UIManager();
            this._instance.init();
          }
          return this._instance;
        }
        /**
         * 初始化所有UI的配置对象
         * @param conf 配置对象
         */
        initUIConf(conf) {
          this.UIConf = conf;
        }

        /**
         * 设置或覆盖某uiId的配置
         * @param uiId 要设置的界面id
         * @param conf 要设置的配置
         */
        setUIConf(uiId, conf) {
          this.UIConf[uiId] = conf;
        }
        init() {
          this.setLayer();
        }
        setLayer() {
          let canvas = director.getScene().getChildByName("Canvas");
          this.uiLayer = canvas.getChildByName("uiLayer");
          this.guideLayer = canvas.getChildByName("guideLayer");
          this.toastLayer = canvas.getChildByName("toastLayer");
        }

        /****************** 私有方法，UIManager内部的功能和基础规则 *******************/

        /**
         * 添加防触摸层
         * @param zOrder 屏蔽层的层级
         */
        async preventTouch(zOrder) {
          let prefab = await resLoader.loadAsync('prefab/ui/common/PreventTouch', Prefab);
          let node = prefab ? instantiate(prefab) : new Node();
          node.name = 'preventTouch';
          let uiCom = node.addComponent(UITransform);
          uiCom.setContentSize(view.getVisibleSize());
          node.on(Node.EventType.TOUCH_START, function (event) {
            event.propagationStopped = true;
          }, node);
          this.uiLayer.addChild(node);
          uiCom.priority = zOrder - 0.01;
          return node;
        }

        /** 自动执行下一个待关闭或待打开的界面 */
        autoExecNextUI() {
          // 逻辑上是先关后开
          if (this.UICloseQueue.length > 0) {
            let uiQueueInfo = this.UICloseQueue[0];
            this.UICloseQueue.splice(0, 1);
            this.close(uiQueueInfo);
          } else if (this.UIOpenQueue.length > 0) {
            let uiQueueInfo = this.UIOpenQueue[0];
            this.UIOpenQueue.splice(0, 1);
            this.open(uiQueueInfo.uiId, uiQueueInfo.uiArgs);
          }
        }

        /**
         * 自动检测动画组件以及特定动画，如存在则播放动画，无论动画是否播放，都执行回调
         * @param aniName 动画名
         * @param aniOverCallback 动画播放完成回调
         */
        autoExecAnimation(uiView, aniName, aniOverCallback) {
          // 播放动画
          // 暂时先省略动画播放的逻辑
          if (uiView.animComp && uiView.isPlayAnim) {
            uiView.aniOverCallback = aniOverCallback;
            uiView.animComp.play(aniName);
          } else {
            console.warn(`uiView ${uiView.node.name} animComp is null`);
            aniOverCallback();
          }
        }

        /**
         * 自动检测资源预加载组件，如果存在则加载完成后调用completeCallback，否则直接调用
         * @param completeCallback 资源加载完成回调
         */
        autoLoadRes(uiView, completeCallback) {
          // 暂时先省略
          completeCallback();
        }

        /** 根据界面显示类型刷新显示 */
        updateUI() {
          let hideIndex = 0;
          let showIndex = this.UIStack.length - 1;
          for (; showIndex >= 0; --showIndex) {
            let mode = this.UIStack[showIndex].uiView.showType;
            // 无论何种模式，最顶部的UI都是应该显示的
            this.UIStack[showIndex].uiView.node.active = true;
            if (this.UIStack[showIndex].preventNode) {
              this.UIStack[showIndex].preventNode.active = true;
            }
            if (UIShowTypes.UIFullScreen == mode) {
              break;
            } else if (UIShowTypes.UISingle == mode) {
              for (let i = 0; i < this.BackGroundUI; ++i) {
                this.UIStack[i].uiView.node.active = true;
                if (this.UIStack[i].preventNode) {
                  this.UIStack[i].preventNode.active = true;
                }
              }
              hideIndex = this.BackGroundUI;
              break;
            }
          }
          // 隐藏不应该显示的部分UI
          for (let hide = hideIndex; hide < showIndex; ++hide) {
            let mode = this.UIStack[hide].uiView.showType;
            if (UIShowTypes.UIFullScreen == mode) {
              continue;
            }
            this.UIStack[hide].uiView.node.active = false;
            if (this.UIStack[hide].preventNode) {
              this.UIStack[hide].preventNode.active = false;
            }
          }
          console.log(`updateUI-UIStack-length:${this.UIStack.length}`);
          for (let i = 0; i < this.UIStack.length; i++) {
            console.log(`updateUI-UIStack-id:${this.UIStack[i].uiId}`);
          }
        }

        /**
         * 异步加载一个UI的prefab，成功加载了一个prefab之后
         * @param uiId 界面id
         * @param processCallback 加载进度回调
         * @param completeCallback 加载完成回调
         * @param uiArgs 初始化参数
         */
        getOrCreateUI(uiId, processCallback, completeCallback, uiArgs) {
          var _this$UIConf$uiId;
          // 如果找到缓存对象，则直接返回
          let uiView = this.UICache[uiId];
          if (uiView) {
            completeCallback(uiView);
            return;
          }

          // 找到UI配置
          let config = this.UIConf[uiId];
          if (!config) {
            log(`getOrCreateUI ${uiId} faile, prefab conf not found!`);
            completeCallback(null);
            return;
          }
          let uiPath = config.prefab;
          if (null == uiPath) {
            log(`getOrCreateUI ${uiId} faile, prefab conf not found!`);
            completeCallback(null);
            return;
          }
          let bundle = ((_this$UIConf$uiId = this.UIConf[uiId]) == null ? void 0 : _this$UIConf$uiId.bundle) || 'resources';
          resLoader.load(bundle, uiPath, processCallback, (err, prefab) => {
            // 检查加载资源错误
            if (err) {
              log(`getOrCreateUI loadRes ${uiId} faile, bundle: ${bundle}, path: ${uiPath}, error: ${err}`);
              completeCallback(null);
              return;
            }
            // 检查实例化错误
            let uiNode = instantiate(prefab);
            if (null == uiNode) {
              log(`getOrCreateUI instantiate ${uiId} faile, bundle: ${bundle}, path: ${uiPath}`);
              completeCallback(null);
              prefab.decRef();
              return;
            }
            // 检查组件获取错误
            uiView = uiNode.getComponent(UIView);
            if (null == uiView) {
              log(`getOrCreateUI getComponent ${uiId} faile, bundle: ${bundle}, path: ${uiPath}`);
              uiNode.destroy();
              completeCallback(null);
              prefab.decRef();
              return;
            }
            // 异步加载UI预加载的资源
            this.autoLoadRes(uiView, () => {
              uiView.init(uiArgs);
              completeCallback(uiView);
              uiView.cacheAsset(prefab);
            });
          });
        }

        /**
         * UI被打开时回调，对UI进行初始化设置，刷新其他界面的显示，并根据
         * @param uiId 哪个界面被打开了
         * @param uiView 界面对象
         * @param uiInfo 界面栈对应的信息结构
         * @param uiArgs 界面初始化参数
         */
        onUIOpen(uiId, uiView, uiInfo, uiArgs) {
          if (null == uiView) {
            return;
          }
          // 激活界面
          uiInfo.uiView = uiView;
          uiView.node.active = true;
          let uiCom = uiView.getComponent(UITransform);
          if (!uiCom) {
            uiCom = uiView.addComponent(UITransform);
          }

          // 快速关闭界面的设置，绑定界面中的background，实现快速关闭
          if (uiView.quickClose) {
            let backGround = uiView.node.getChildByName('background');
            if (!backGround) {
              backGround = new Node();
              backGround.name = 'background';
              let uiCom = backGround.addComponent(UITransform);
              uiCom.setContentSize(view.getVisibleSize());
              uiView.node.addChild(backGround);
              uiCom.priority = -1;
            }
            backGround.targetOff(Node.EventType.TOUCH_START);
            backGround.on(Node.EventType.TOUCH_START, event => {
              event.propagationStopped = true;
              this.close(uiView);
            }, backGround);
          }

          // 添加到场景中
          this.uiLayer.addChild(uiView.node);
          uiCom.priority = uiInfo.zOrder || this.UIStack.length;

          // 刷新其他UI
          this.updateUI();

          // 从那个界面打开的
          let fromUIID = 0;
          if (this.UIStack.length > 1) {
            fromUIID = this.UIStack[this.UIStack.length - 2].uiId;
          }

          // 打开界面之前回调
          if (this.uiOpenBeforeDelegate) {
            this.uiOpenBeforeDelegate(uiId, fromUIID);
          }

          // 执行onOpen回调
          uiView.onOpen(fromUIID, uiArgs);
          // this.autoExecAnimation(uiView, UiAni.Open, () => {
          uiView.onOpenAniOver();
          if (this.uiOpenDelegate) {
            this.uiOpenDelegate(uiId, fromUIID);
          }
          // });
        }

        /** 打开界面并添加到界面栈中 */
        async open(uiId, uiArgs = null, progressCallback = null) {
          let uiInfo = {
            uiId: uiId,
            uiArgs: uiArgs,
            uiView: null
          };
          if (this.isOpening || this.isClosing) {
            // 插入待打开队列
            this.UIOpenQueue.push(uiInfo);
            return;
          }
          let uiIndex = this.getUIIndex(uiId);
          if (-1 != uiIndex) {
            // 重复打开了同一个界面，直接回到该界面
            this.closeToUI(uiId, uiArgs);
            return;
          }

          // 设置UI的zOrder
          uiInfo.zOrder = this.UIStack.length + 1;
          this.UIStack.push(uiInfo);
          this.isOpening = true;

          // 先屏蔽点击
          if (this.UIConf[uiId].preventTouch) {
            uiInfo.preventNode = await this.preventTouch(uiInfo.zOrder);
          }

          // 预加载资源，并在资源加载完成后自动打开界面
          this.getOrCreateUI(uiId, progressCallback, uiView => {
            // 如果界面已经被关闭或创建失败
            if (uiInfo.isClose || null == uiView) {
              log(`getOrCreateUI ${uiId} faile!
                        close state : ${uiInfo.isClose} , uiView : ${uiView}`);
              this.isOpening = false;
              if (uiInfo.preventNode) {
                uiInfo.preventNode.destroy();
                uiInfo.preventNode = null;
              }
              return;
            }

            // 打开UI，执行配置
            this.onUIOpen(uiId, uiView, uiInfo, uiArgs);
            this.isOpening = false;
            this.autoExecNextUI();
          }, uiArgs);
        }

        /** 替换栈顶界面 */
        replace(uiId, uiArgs = null) {
          this.close(this.UIStack[this.UIStack.length - 1].uiView);
          this.open(uiId, uiArgs);
        }

        /**
         * 关闭当前界面
         * @param closeUI 要关闭的界面
         */
        close(closeUI) {
          let uiCount = this.UIStack.length;
          if (uiCount < 1 || this.isClosing || this.isOpening) {
            if (closeUI) {
              // 插入待关闭队列
              this.UICloseQueue.push(closeUI);
            }
            return;
          }
          let uiInfo;
          if (closeUI) {
            for (let index = this.UIStack.length - 1; index >= 0; index--) {
              let ui = this.UIStack[index];
              if (ui.uiView === closeUI) {
                uiInfo = ui;
                this.UIStack.splice(index, 1);
                break;
              }
            }
          } else {
            uiInfo = this.UIStack.pop();
          }
          // 找不到这个UI
          if (uiInfo === undefined) {
            return;
          }

          // 关闭当前界面
          let uiId = uiInfo.uiId;
          let uiView = uiInfo.uiView;
          uiInfo.isClose = true;

          // 回收遮罩层
          if (uiInfo.preventNode) {
            uiInfo.preventNode.destroy();
            uiInfo.preventNode = null;
          }
          if (!uiView) {
            return;
          }
          let preUIInfo = this.UIStack[uiCount - 2];
          // 处理显示模式
          this.updateUI();
          let close = () => {
            this.isClosing = false;
            // 显示之前的界面
            if (preUIInfo && preUIInfo.uiView && this.isTopUI(preUIInfo.uiId)) {
              // 如果之前的界面弹到了最上方（中间有肯能打开了其他界面）
              preUIInfo.uiView.node.active = true;
              // 回调onTop
              preUIInfo.uiView.onTop(uiId, uiView.onClose());
            } else {
              uiView.onClose();
            }
            if (this.uiCloseDelegate) {
              this.uiCloseDelegate(uiId);
            }
            if (uiView.cache) {
              this.UICache[uiId] = uiView;
              uiView.node.removeFromParent();
              log(`uiView removeFromParent ${uiInfo.uiId}`);
            } else {
              uiView.releaseAssets();
              uiView.node.destroy();
              log(`uiView destroy ${uiInfo.uiId}`);
            }
            this.autoExecNextUI();
          };
          // 执行关闭动画
          // this.autoExecAnimation(uiView, UiAni.Close, close);
          close();
        }

        /** 关闭所有界面 */
        closeAll() {
          // 不播放动画，也不清理缓存
          for (const uiInfo of this.UIStack) {
            uiInfo.isClose = true;
            if (uiInfo.preventNode) {
              uiInfo.preventNode.destroy();
              uiInfo.preventNode = null;
            }
            if (uiInfo.uiView) {
              var _uiInfo$uiView$node;
              uiInfo.uiView.onClose();
              uiInfo.uiView.releaseAssets();
              (_uiInfo$uiView$node = uiInfo.uiView.node) == null || _uiInfo$uiView$node.destroy();
            }
          }
          if (this.toastView) {
            this.toastView.onClose();
            this.toastView.releaseAssets();
            this.toastView.node.destroy();
            this.toastView = null;
          }
          if (this.guideView) {
            this.guideView.onClose();
            this.guideView.releaseAssets();
            this.guideView.node.destroy();
            this.guideView = null;
          }
          this.UIOpenQueue = [];
          this.UICloseQueue = [];
          this.UIStack = [];
          this.isOpening = false;
          this.isClosing = false;
        }

        /**
         * 关闭界面，一直关闭到顶部为uiId的界面，为避免循环打开UI导致UI栈溢出
         * @param uiId 要关闭到的uiId（关闭其顶部的ui）
         * @param uiArgs 打开的参数
         * @param bOpenSelf 
         */
        closeToUI(uiId, uiArgs, bOpenSelf = true) {
          let idx = this.getUIIndex(uiId);
          if (-1 == idx) {
            return;
          }
          idx = bOpenSelf ? idx : idx + 1;
          for (let i = this.UIStack.length - 1; i >= idx; --i) {
            let uiInfo = this.UIStack.pop();
            if (!uiInfo) {
              continue;
            }
            let uiId = uiInfo.uiId;
            let uiView = uiInfo.uiView;
            uiInfo.isClose = true;

            // 回收屏蔽层
            if (uiInfo.preventNode) {
              uiInfo.preventNode.destroy();
              uiInfo.preventNode = null;
            }
            if (this.uiCloseDelegate) {
              this.uiCloseDelegate(uiId);
            }
            if (uiView) {
              uiView.onClose();
              if (uiView.cache) {
                this.UICache[uiId] = uiView;
                uiView.node.removeFromParent();
              } else {
                uiView.releaseAssets();
                uiView.node.destroy();
              }
            }
          }
          this.updateUI();
          this.UIOpenQueue = [];
          this.UICloseQueue = [];
          bOpenSelf && this.open(uiId, uiArgs);
        }

        /** 清理界面缓存 */
        clearCache() {
          for (const key in this.UICache) {
            let ui = this.UICache[key];
            if (isValid(ui.node)) {
              if (isValid(ui)) {
                ui.releaseAssets();
              }
              ui.node.destroy();
            }
          }
          this.UICache = {};
        }

        /******************** UI的便捷接口 *******************/
        isTopUI(uiId) {
          if (this.UIStack.length == 0) {
            return false;
          }
          return this.UIStack[this.UIStack.length - 1].uiId == uiId;
        }
        getUI(uiId) {
          for (let index = 0; index < this.UIStack.length; index++) {
            const element = this.UIStack[index];
            if (uiId == element.uiId) {
              return element.uiView;
            }
          }
          return null;
        }
        getTopUI() {
          if (this.UIStack.length > 0) {
            return this.UIStack[this.UIStack.length - 1].uiView;
          }
          return null;
        }
        getUIIndex(uiId) {
          for (let index = 0; index < this.UIStack.length; index++) {
            const element = this.UIStack[index];
            if (uiId == element.uiId) {
              return index;
            }
          }
          return -1;
        }
        showToast(msg) {
          this.getOrCreateUI(UIID.Toast, null, uiView => {
            if (null == uiView || !uiView.node) {
              return;
            }
            if (!this.toastLayer) {
              console.warn("toastLayer is null");
              return;
            }
            this.toastLayer.addChild(uiView.node);
            uiView.onOpen(0, {
              content: msg
            });
            this.toastView = uiView;
          }, null);
        }
        hideToast() {
          var _this$toastView, _this$toastView2;
          (_this$toastView = this.toastView) == null || _this$toastView.onClose();
          (_this$toastView2 = this.toastView) == null || _this$toastView2.node.removeFromParent();
          this.toastView = null;
        }
      }
      exports('UIManager', UIManager);
      UIManager._instance = null;
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/ui-screen-adapter.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './log-util.ts'], function (exports) {
  var _applyDecoratedDescriptor, _initializerDefineProperty, cclegacy, Node, _decorator, Component, sys, view, UITransform, LogUtil;
  return {
    setters: [function (module) {
      _applyDecoratedDescriptor = module.applyDecoratedDescriptor;
      _initializerDefineProperty = module.initializerDefineProperty;
    }, function (module) {
      cclegacy = module.cclegacy;
      Node = module.Node;
      _decorator = module._decorator;
      Component = module.Component;
      sys = module.sys;
      view = module.view;
      UITransform = module.UITransform;
    }, function (module) {
      LogUtil = module.LogUtil;
    }],
    execute: function () {
      var _dec, _dec2, _dec3, _dec4, _class, _class2, _descriptor, _descriptor2, _descriptor3;
      cclegacy._RF.push({}, "adde76wrAtHfrB2YJoJUeLh", "ui-screen-adapter", undefined);
      const {
        ccclass,
        property
      } = _decorator;
      let UIScreenAdapter = exports('UIScreenAdapter', (_dec = ccclass('UIScreenAdapter'), _dec2 = property({
        type: Node,
        tooltip: 'Widget组件不要设置纵向对齐'
      }), _dec3 = property({
        type: Node,
        tooltip: '顶部UI'
      }), _dec4 = property(Node), _dec(_class = (_class2 = class UIScreenAdapter extends Component {
        constructor(...args) {
          super(...args);
          _initializerDefineProperty(this, "content", _descriptor, this);
          _initializerDefineProperty(this, "topUI", _descriptor2, this);
          _initializerDefineProperty(this, "topBg", _descriptor3, this);
        }
        start() {
          this.scheduleOnce(() => {
            this.adaptToScreen();
          }, 0);
        }
        adaptToScreen() {
          let safeArea = sys.getSafeAreaRect();
          let winSize = view.getVisibleSize();

          // 内容区域适配
          this.content && this.content.getComponent(UITransform).setContentSize(winSize.width, safeArea.height);
          // 顶部背景
          let topBgHeight = winSize.height - (safeArea.y + safeArea.height);
          this.topBg && LogUtil.log(`(${this.node.name})ScreenAdapter-topBgHeight1`, topBgHeight);
          if (this.topUI) {
            topBgHeight += this.topUI.getComponent(UITransform).contentSize.height + 70;
          }
          if (this.topBg) {
            LogUtil.log(`(${this.node.name})ScreenAdapter-topBgHeight2`, topBgHeight);
            // this.topBg.getComponent(UITransform).setContentSize(winSize.width, topBgHeight);
            this.topBg.getComponent(UITransform).height = topBgHeight;
          }
        }
      }, (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "content", [_dec2], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, "topUI", [_dec3], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      }), _descriptor3 = _applyDecoratedDescriptor(_class2.prototype, "topBg", [_dec4], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return null;
        }
      })), _class2)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/ui-view.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './res-keeper.ts'], function (exports) {
  var _applyDecoratedDescriptor, _initializerDefineProperty, cclegacy, Enum, _decorator, Animation, Vec3, tween, ResKeeper;
  return {
    setters: [function (module) {
      _applyDecoratedDescriptor = module.applyDecoratedDescriptor;
      _initializerDefineProperty = module.initializerDefineProperty;
    }, function (module) {
      cclegacy = module.cclegacy;
      Enum = module.Enum;
      _decorator = module._decorator;
      Animation = module.Animation;
      Vec3 = module.Vec3;
      tween = module.tween;
    }, function (module) {
      ResKeeper = module.ResKeeper;
    }],
    execute: function () {
      var _dec, _class, _class2, _descriptor, _descriptor2, _descriptor3, _descriptor4, _class3;
      cclegacy._RF.push({}, "73698uW9BZIZaebTm/ym8MV", "ui-view", undefined);
      /**
       * UIView界面基础类
       * 
       * 1. 快速关闭与屏蔽点击的选项配置
       * 2. 界面缓存设置（开启后界面关闭不会被释放，以便下次快速打开）
       * 3. 界面显示类型配置
       * 
       * 4. 加载资源接口（随界面释放自动释放），this.loadRes(xxx)
       * 5. 由UIManager释放
       * 
       * 5. 界面初始化回调（只调用一次）
       * 6. 界面打开回调（每次打开回调）
       * 7. 界面打开动画播放结束回调（动画播放完回调）
       * 8. 界面关闭回调
       * 9. 界面置顶回调
       */

      const {
        ccclass,
        property
      } = _decorator;

      /** 界面展示类型 */
      let UIShowTypes = exports('UIShowTypes', /*#__PURE__*/function (UIShowTypes) {
        UIShowTypes[UIShowTypes["UIFullScreen"] = 0] = "UIFullScreen";
        UIShowTypes[UIShowTypes["UIAddition"] = 1] = "UIAddition";
        UIShowTypes[UIShowTypes["UISingle"] = 2] = "UISingle";
        return UIShowTypes;
      }({})); // 单界面显示，只显示当前界面和背景界面，性能较好
      let UIView = exports('UIView', (_dec = property({
        type: Enum(UIShowTypes)
      }), ccclass(_class = (_class2 = (_class3 = class UIView extends ResKeeper {
        constructor(...args) {
          super(...args);
          /** 快速关闭 */
          _initializerDefineProperty(this, "quickClose", _descriptor, this);
          /** 快速关闭 */
          _initializerDefineProperty(this, "isPlayAnim", _descriptor2, this);
          /** 屏蔽点击选项 在UIConf设置屏蔽点击*/
          // @property
          // preventTouch: boolean = true;
          /** 缓存选项 */
          _initializerDefineProperty(this, "cache", _descriptor3, this);
          /** 播放通用UI动画 */
          /** 界面显示类型 */
          _initializerDefineProperty(this, "showType", _descriptor4, this);
          /** 界面id */
          this.UIid = 0;
          this.aniOverCallback = null;
          /** 用于播放UI开关动画的组件，绑定在子节点下面*/
          this.animComp = null;
        }
        onLoad() {
          let content = this.node.getChildByName('Content');
          if (content) {
            this.animComp = content.getComponent(Animation);
          }
        }
        onEnable() {
          if (this.animComp) {
            this.animComp.on(Animation.EventType.FINISHED, () => {
              this.aniOverCallback && this.aniOverCallback();
            }, this);
          }
          this.openAnimation();
        }
        onDisable() {
          if (this.animComp) {
            this.animComp.off(Animation.EventType.FINISHED);
          }
          this.closeAnimation();
        }

        /********************** UI的回调 ***********************/
        /**
         * 当界面被创建时回调，生命周期内只调用
         * @param args 可变参数
         */
        init(...args) {}

        /**
         * 当界面被打开时回调，每次调用Open时回调
         * @param fromUI 从哪个UI打开的
         * @param args 可变参数
         */
        onOpen(fromUI, ...args) {}

        /**
         * 每次界面Open动画播放完毕时回调
         */
        onOpenAniOver() {}

        /**
         * 当界面被关闭时回调，每次调用Close时回调
         * 返回值会传递给下一个界面
         */
        onClose() {}

        /**
         * 当界面被置顶时回调，Open时并不会回调该函数
         * @param preID 前一个ui
         * @param args 可变参数，
         */
        onTop(preID, ...args) {}
        openAnimation() {
          this.node.scale = new Vec3(0, 0, 0);
          tween(this.node).to(0.2, {
            scale: new Vec3(1.1, 1.1, 1.1)
          }).to(0.2, {
            scale: new Vec3(1, 1, 1)
          }).start();
        }
        closeAnimation() {
          this.node.scale = new Vec3(1, 1, 1);
          tween(this.node).to(0.2, {
            scale: new Vec3(1.1, 1.1, 1.1)
          }).to(0.2, {
            scale: new Vec3(1, 1, 1)
          }).start();
        }
      }, _class3.uiIndex = 0, _class3), (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "quickClose", [property], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return false;
        }
      }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, "isPlayAnim", [property], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return true;
        }
      }), _descriptor3 = _applyDecoratedDescriptor(_class2.prototype, "cache", [property], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return false;
        }
      }), _descriptor4 = _applyDecoratedDescriptor(_class2.prototype, "showType", [_dec], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function () {
          return UIShowTypes.UISingle;
        }
      })), _class2)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/VirtualScrollView.ts", ['cc'], function (exports) {
  var cclegacy, Component, Vec3, ScrollView, Size, UITransform, Vec2, Node, instantiate, _decorator;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
      Component = module.Component;
      Vec3 = module.Vec3;
      ScrollView = module.ScrollView;
      Size = module.Size;
      UITransform = module.UITransform;
      Vec2 = module.Vec2;
      Node = module.Node;
      instantiate = module.instantiate;
      _decorator = module._decorator;
    }],
    execute: function () {
      var _dec, _class;
      cclegacy._RF.push({}, "6cb2e/zDQ5BcKEa/9TYmoZB", "VirtualScrollView", undefined);
      const {
        ccclass,
        property
      } = _decorator;
      let VirtualScrollView = exports('VirtualScrollView', (_dec = ccclass('VirtualScrollView'), _dec(_class = class VirtualScrollView extends Component {
        constructor(...args) {
          super(...args);
          this._scrollView = null;
          this._content = null;
          this._view = null;
          this._total = 0;
          this._itemPrefab = null;
          this._itemTemplate = null;
          this._itemSize = null;
          this._spacingX = 0;
          this._spacingY = 0;
          this._paddingTop = 0;
          this._paddingBottom = 0;
          this._paddingLeft = 0;
          this._paddingRight = 0;
          this._bufferRows = 2;
          this._columns = null;
          // null => auto calculate
          this._render = null;
          this._onCreate = null;
          this._onItemClick = null;
          // Reuse pool and active map
          this._pool = [];
          this._activeMap = new Map();
          // index -> container node
          // Cache to reduce allocations
          this._tmpV3 = new Vec3();
        }
        onLoad() {
          this._scrollView = this.getComponent(ScrollView);
          if (!this._scrollView) {
            console.warn('[VirtualScrollView] Please add this component to a node with ScrollView');
            return;
          }
          this._content = this._scrollView.content;
          this._view = this._scrollView.node.getChildByName('view') || this._scrollView.node;
        }
        onEnable() {
          if (this._scrollView && this._scrollView.node) {
            this._scrollView.node.on(ScrollView.EventType.SCROLLING, this._onScrolling, this);
            this._scrollView.node.on(ScrollView.EventType.SCROLL_BEGAN, this._onScrolling, this);
            this._scrollView.node.on(ScrollView.EventType.SCROLL_ENDED, this._onScrolling, this);
          }
        }
        onDisable() {
          if (this._scrollView && this._scrollView.node) {
            this._scrollView.node.off(ScrollView.EventType.SCROLLING, this._onScrolling, this);
            this._scrollView.node.off(ScrollView.EventType.SCROLL_BEGAN, this._onScrolling, this);
            this._scrollView.node.off(ScrollView.EventType.SCROLL_ENDED, this._onScrolling, this);
          }
        }

        /**
         * Initialize the virtualized scroll view.
         * - Either itemPrefab or itemTemplate must be provided.
         * - Supports grid layout filled horizontally then vertically (row-major), vertical scrolling.
         * - If itemSize is provided, it overrides the size read from prefab/template.
         */
        init(options) {
          var _viewParent$getCompon, _this$_scrollView$nod;
          this._assertReady();
          this._total = options.total ?? 0;
          this._itemPrefab = options.itemPrefab ?? null;
          this._itemTemplate = options.itemTemplate ?? null;
          this._spacingX = options.spacingX ?? 0;
          this._spacingY = options.spacingY ?? 0;
          this._paddingTop = options.paddingTop ?? 0;
          this._paddingBottom = options.paddingBottom ?? 0;
          this._paddingLeft = options.paddingLeft ?? 0;
          this._paddingRight = options.paddingRight ?? 0;
          this._bufferRows = options.bufferRows ?? 2;
          this._columns = options.columns ?? null;
          this._render = options.render;
          this._onCreate = options.onCreate ?? null;
          this._onItemClick = options.onItemClick ?? null;

          // Ensure we have a source to instantiate items
          if (!this._itemPrefab && !this._itemTemplate) {
            throw new Error('[VirtualScrollView] itemPrefab or itemTemplate is required');
          }
          if (!this._content) return;

          // Resolve item size: use provided options.itemSize or default 334x557
          if (options.itemSize) {
            this._itemSize = options.itemSize.clone();
          } else {
            this._itemSize = new Size(334, 557);
          }

          // If using a template node from scene, detach and hide it
          if (this._itemTemplate && this._itemTemplate.parent) {
            this._itemTemplate.removeFromParent();
            this._itemTemplate.active = false;
          }
          this._relayoutContent();

          // Log viewport (parent) size and scrollview node size for debugging
          const viewParent = this._content.parent;
          const viewSizeLog = viewParent == null || (_viewParent$getCompon = viewParent.getComponent(UITransform)) == null ? void 0 : _viewParent$getCompon.contentSize;
          const svSizeLog = (_this$_scrollView$nod = this._scrollView.node.getComponent(UITransform)) == null ? void 0 : _this$_scrollView$nod.contentSize;
          if (viewSizeLog && svSizeLog) {
            console.log('[VirtualScrollView] viewport(parent) size:', viewSizeLog.width, viewSizeLog.height);
            console.log('[VirtualScrollView] scrollview node size:', svSizeLog.width, svSizeLog.height);
          }
          // Log scrollview node position (local to its parent)
          const svPos = this._scrollView.node.getPosition();
          console.log('[VirtualScrollView] scrollview node position:', svPos.x, svPos.y, svPos.z);

          // Extra detailed logs for debugging left/top alignment
          const contentUI = this._content.getComponent(UITransform);
          const contentPos = this._content.getPosition();
          const contentAnchor = contentUI.anchorPoint;
          const viewNode = this._content.parent;
          const viewUI = viewNode.getComponent(UITransform);
          const viewAnchor = viewUI.anchorPoint;
          const viewPos = viewNode.getPosition();
          const colsDbg = this._getColumns();
          const rowsDbg = this._getRows();
          const expectedWidth = Math.max(0, this._paddingLeft + this._paddingRight + colsDbg * this._itemSize.width + Math.max(0, colsDbg - 1) * this._spacingX);
          const expectedHeight = Math.max(0, this._paddingTop + this._paddingBottom + rowsDbg * this._itemSize.height + Math.max(0, rowsDbg - 1) * this._spacingY);
          const curOffset = this._scrollView.getScrollOffset();
          const maxOffset = this._scrollView.getMaxScrollOffset();
          const svScale = this._scrollView.node.scale;
          const viewScale = viewNode.scale;
          const contentScale = this._content.scale;
          console.log('[VirtualScrollView] content size:', contentUI.contentSize.width, contentUI.contentSize.height);
          console.log('[VirtualScrollView] content pos:', contentPos.x, contentPos.y, contentPos.z, 'anchor:', contentAnchor.x, contentAnchor.y, 'scale:', contentScale.x, contentScale.y, contentScale.z);
          console.log('[VirtualScrollView] view name:', viewNode.name, 'pos:', viewPos.x, viewPos.y, viewPos.z, 'anchor:', viewAnchor.x, viewAnchor.y, 'scale:', viewScale.x, viewScale.y, viewScale.z);
          console.log('[VirtualScrollView] cols/rows:', colsDbg, rowsDbg, 'expected size:', expectedWidth, expectedHeight);
          console.log('[VirtualScrollView] offsets cur/max:', curOffset.x, curOffset.y, '/', maxOffset.x, maxOffset.y);
          console.log('[VirtualScrollView] spacings:', this._spacingX, this._spacingY, 'paddings:', this._paddingLeft, this._paddingRight, this._paddingTop, this._paddingBottom);
          console.log('[VirtualScrollView] scales sv/view/content:', svScale.x, svScale.y, svScale.z, '/', viewScale.x, viewScale.y, viewScale.z, '/', contentScale.x, contentScale.y, contentScale.z);

          // Print again next frame to avoid init timing issues
          this.scheduleOnce(() => {
            const contentUI2 = this._content.getComponent(UITransform);
            const contentPos2 = this._content.getPosition();
            const viewUI2 = this._content.parent.getComponent(UITransform);
            const viewPos2 = this._content.parent.getPosition();
            const curOffset2 = this._scrollView.getScrollOffset();
            const maxOffset2 = this._scrollView.getMaxScrollOffset();
            console.log('[VirtualScrollView][next] content size:', contentUI2.contentSize.width, contentUI2.contentSize.height);
            console.log('[VirtualScrollView][next] content pos:', contentPos2.x, contentPos2.y, contentPos2.z);
            console.log('[VirtualScrollView][next] view size:', viewUI2.contentSize.width, viewUI2.contentSize.height, 'pos:', viewPos2.x, viewPos2.y, viewPos2.z);
            console.log('[VirtualScrollView][next] offsets cur/max:', curOffset2.x, curOffset2.y, '/', maxOffset2.x, maxOffset2.y);
          }, 0);
          this._refreshVisible(true);
          // Ensure we start at the top after initialization
          this._scrollToOffsetY(0, false);
        }

        /** Update total item count and refresh layout. */
        setTotal(total) {
          this._total = Math.max(0, total | 0);
          this._relayoutContent();
          this._refreshVisible(true);
        }

        /** Reload data: keep scroll position, but re-render current window. */
        reloadData() {
          this._refreshVisible(true);
        }

        /** Scroll to specified index (top-aligned). */
        scrollToIndex(index, animated = false) {
          if (!this._scrollView || !this._content || !this._itemSize) return;
          index = Math.max(0, Math.min(this._total - 1, index | 0));
          const cols = this._getColumns();
          const row = Math.floor(index / cols);
          const targetY = this._paddingTop + row * (this._itemSize.height + this._spacingY);
          const maxOffset = this._getMaxOffsetY();
          const clamped = Math.max(0, Math.min(maxOffset, targetY));
          this._scrollToOffsetY(clamped, animated);
        }

        // Internal helpers

        _assertReady() {
          if (!this._scrollView || !this._content) {
            throw new Error('[VirtualScrollView] Missing ScrollView or content');
          }
        }
        _getViewSize() {
          if (!this._view) {
            const ui = this._scrollView.node.getComponent(UITransform);
            return ui.contentSize;
          }
          const vui = this._view.getComponent(UITransform);
          return vui.contentSize;
        }
        _getColumns() {
          if (!this._itemSize) return 1;
          if (this._columns && this._columns > 0) return this._columns;
          const viewSize = this._getViewSize();
          const avail = Math.max(0, viewSize.width - this._paddingLeft - this._paddingRight);
          const cellW = this._itemSize.width;
          const oneW = cellW + this._spacingX;
          const cols = Math.max(1, Math.floor((avail + this._spacingX) / oneW));
          return cols;
        }
        _getRows() {
          const cols = this._getColumns();
          return this._total > 0 ? Math.ceil(this._total / cols) : 0;
        }
        _relayoutContent() {
          if (!this._content || !this._itemSize) return;
          const cols = this._getColumns();
          const rows = this._getRows();
          const width = Math.max(0, this._paddingLeft + this._paddingRight + cols * this._itemSize.width + Math.max(0, cols - 1) * this._spacingX);
          const height = Math.max(0, this._paddingTop + this._paddingBottom + rows * this._itemSize.height + Math.max(0, rows - 1) * this._spacingY);
          const ui = this._content.getComponent(UITransform);
          ui.setContentSize(width, height);
          // Do NOT realign content; placement will compensate content anchor in _placeNode
        }

        _onScrolling() {
          this._refreshVisible(false);
        }
        _getScrollY() {
          if (!this._scrollView) return 0;
          // Positive value means distance from top
          const off = this._scrollView.getScrollOffset();
          return Math.max(0, off.y);
        }
        _getMaxOffsetY() {
          if (!this._scrollView) return 0;
          const offMax = this._scrollView.getMaxScrollOffset();
          return Math.max(0, offMax.y);
        }
        _scrollToOffsetY(offsetY, animated) {
          if (!this._scrollView) return;
          this._scrollView.scrollToOffset(new Vec2(0, offsetY), animated ? 0.2 : 0);
        }

        /**
         * Creates a container node with the user's content as a child.
         * The container handles layout and positioning, while the user's content retains its original anchor.
         */
        _acquireNode() {
          let containerNode = this._pool.pop();
          if (!containerNode) {
            // Create container node for layout
            containerNode = new Node('ItemContainer');
            const containerUI = containerNode.addComponent(UITransform);
            containerUI.setContentSize(this._itemSize);
            containerUI.setAnchorPoint(0, 1); // Container uses top-left anchor for layout

            // Create user content node as child
            let userContentNode;
            if (this._itemPrefab) {
              userContentNode = instantiate(this._itemPrefab);
            } else if (this._itemTemplate) {
              userContentNode = instantiate(this._itemTemplate);
            } else {
              throw new Error('[VirtualScrollView] No item template to instantiate');
            }

            // Name the user content for easy reference
            userContentNode.name = 'ItemContent';
            containerNode.addChild(userContentNode);

            // Auto-align user content's top-left to container's top-left
            this._alignUserContentToContainer(userContentNode);

            // Call onCreate callback with user content node
            this._onCreate && this._onCreate(userContentNode);
          }
          return containerNode;
        }

        /**
         * Aligns user content node's top-left corner to container's top-left corner.
         * This compensates for different anchor points between container (0,1) and user content (commonly 0.5,0.5).
         * For a user content with anchor (ax, ay), place its origin at (w*ax, -h*(1 - ay)).
         */
        _alignUserContentToContainer(userContentNode) {
          const userUI = userContentNode.getComponent(UITransform);
          if (!userUI) return;
          const anchor = userUI.anchorPoint; // (ax, ay)
          const size = userUI.contentSize; // (w, h)

          // Place user content so that its top-left aligns with container's origin (top-left)
          const x = size.width * anchor.x;
          const y = -size.height * (1 - anchor.y);
          userContentNode.setPosition(x, y, 0);

          // Bind click handlers once for this user content
          this._attachClickHandlers(userContentNode);
        }

        /**
         * Attach touch handlers to detect a tap and emit onItemClick.
         * The listener is bound only once per user node using an internal flag.
         */
        _attachClickHandlers(userContentNode) {
          const anyNode = userContentNode;
          if (anyNode.__vs_click_bound) return;
          anyNode.__vs_click_bound = true;
          let startPos = null;
          let startOffsetY = 0;

          // Record touch start for simple tap detection
          userContentNode.on(Node.EventType.TOUCH_START, e => {
            const loc = e.getUILocation();
            startPos = new Vec2(loc.x, loc.y);
            if (this._scrollView) {
              const off = this._scrollView.getScrollOffset();
              startOffsetY = off.y;
            }
          }, this);

          // On touch end, decide if it's a tap and invoke callback
          userContentNode.on(Node.EventType.TOUCH_END, e => {
            if (!this._onItemClick) return;
            const loc = e.getUILocation();
            const endPos = new Vec2(loc.x, loc.y);
            const dx = startPos ? Math.abs(endPos.x - startPos.x) : 0;
            const dy = startPos ? Math.abs(endPos.y - startPos.y) : 0;
            const moved = Math.max(dx, dy);
            let scrolled = 0;
            if (this._scrollView) {
              const off = this._scrollView.getScrollOffset();
              scrolled = Math.abs(off.y - startOffsetY);
            }
            // Thresholds to filter scrolls/drags
            const MOVE_THRESHOLD = 10; // px
            const SCROLL_THRESHOLD = 10; // px
            if (moved <= MOVE_THRESHOLD && scrolled <= SCROLL_THRESHOLD) {
              const index = userContentNode.__vs_index;
              if (index !== undefined) {
                this._onItemClick(userContentNode, index);
              }
            }
            startPos = null;
          }, this);

          // Also handle cancel -> treat as non-click
          userContentNode.on(Node.EventType.TOUCH_CANCEL, () => {
            startPos = null;
          }, this);
        }
        _placeNode(containerNode, index) {
          if (!this._itemSize || !this._content) return;
          const cols = this._getColumns();
          const row = Math.floor(index / cols);
          const col = index % cols;

          // Base position relative to content's top-left
          const baseX = this._paddingLeft + col * (this._itemSize.width + this._spacingX);
          const baseY = -(this._paddingTop + row * (this._itemSize.height + this._spacingY));

          // Compensate content anchor (respect user's anchor, commonly 0.5,0.5)
          const contentUI = this._content.getComponent(UITransform);
          const cSize = contentUI.contentSize;
          const cAnchor = contentUI.anchorPoint;
          const offsetX = -cSize.width * cAnchor.x;
          const offsetY = cSize.height * (1 - cAnchor.y);
          this._tmpV3.set(baseX + offsetX, baseY + offsetY, 0);
          containerNode.setPosition(this._tmpV3);

          // Update bound index on user content so click callback receives correct index
          const userContentNode = containerNode.getChildByName('ItemContent');
          if (userContentNode) {
            userContentNode.__vs_index = index;
          }
        }
        _recycleNode(index) {
          const containerNode = this._activeMap.get(index);
          if (containerNode) {
            this._activeMap.delete(index);
            containerNode.removeFromParent();
            containerNode.active = false;
            this._pool.push(containerNode);
          }
        }
        _recycleAll() {
          // Recycle all active items back to the pool
          const keys = Array.from(this._activeMap.keys());
          for (const idx of keys) {
            this._recycleNode(idx);
          }
        }

        /**
         * Refresh visible window based on current scrollY and viewport.
         * If force is true, re-render all active items.
         */
        _refreshVisible(force) {
          if (!this._content || !this._itemSize) return;
          const viewSize = this._getViewSize();
          const scrollY = this._getScrollY();
          const cols = this._getColumns();
          const rows = this._getRows();
          if (rows <= 0 || this._total <= 0) {
            this._recycleAll();
            return;
          }
          const cellH = this._itemSize.height + this._spacingY;
          const firstRow = Math.max(0, Math.floor((scrollY - this._paddingTop) / cellH));
          const lastRow = Math.max(0, Math.floor((scrollY + viewSize.height - this._paddingTop) / cellH));
          let startRow = Math.max(0, firstRow - this._bufferRows);
          let endRow = Math.min(rows - 1, lastRow + this._bufferRows);
          const startIndex = startRow * cols;
          const endIndex = Math.min(this._total - 1, (endRow + 1) * cols - 1);

          // Build new window set
          const needed = new Set();
          for (let i = startIndex; i <= endIndex; i++) needed.add(i);

          // Recycle items that are no longer needed
          for (const [idx, containerNode] of this._activeMap.entries()) {
            if (!needed.has(idx)) {
              this._recycleNode(idx);
            }
          }

          // Activate/create needed items
          for (let i = startIndex; i <= endIndex; i++) {
            if (!this._activeMap.has(i)) {
              const containerNode = this._acquireNode();
              this._activeMap.set(i, containerNode);
              containerNode.active = true;
              containerNode.parent = this._content;
              this._placeNode(containerNode, i);

              // Pass user content node to render callback
              const userContentNode = containerNode.getChildByName('ItemContent');
              if (userContentNode && this._render) {
                this._render(userContentNode, i);
              }
            } else if (force) {
              const containerNode = this._activeMap.get(i);
              this._placeNode(containerNode, i);

              // Pass user content node to render callback
              const userContentNode = containerNode.getChildByName('ItemContent');
              if (userContentNode && this._render) {
                this._render(userContentNode, i);
              }
            }
          }
        }

        /**
         * Align content's top-left corner to its parent view's top-left in parent local space.
         * Content is a child of the view node; set its position using the parent's anchor and size.
         */
        _alignContentToTopLeft() {
          if (!this._content) return;
          const parent = this._content.parent;
          if (!parent) return;
          const pui = parent.getComponent(UITransform);
          if (!pui) return;
          const size = pui.contentSize;
          const anchor = pui.anchorPoint;
          const left = -size.width * anchor.x;
          const top = size.height * (1 - anchor.y);
          this._content.setPosition(left, top, 0);
          const cPos = this._content.getPosition();
          console.log('[VirtualScrollView] align content in parent local top-left:', cPos.x, cPos.y, cPos.z, 'parent anchor:', anchor.x, anchor.y);
        }
      }) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/ws-manager.ts", ['cc', './config.ts'], function (exports) {
  var cclegacy, Config;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
    }, function (module) {
      Config = module.Config;
    }],
    execute: function () {
      cclegacy._RF.push({}, "93bf8Vc1npMXbA+XeP47zn3", "ws-manager", undefined);
      /**
       * WebSocket 管理器
       * 对接：wss://test-first-api.haizhixinnet.com/wss
       */
      class WsManager {
        constructor() {
          this.socket = null;
          this.query = {};
          this.onOpen = null;
          this.onClose = null;
          this.onError = null;
          this.onMessage = null;
        }
        static get instance() {
          if (!this._instance) {
            this._instance = new WsManager();
          }
          return this._instance;
        }
        get isConnected() {
          return !!this.socket && this.socket.readyState === WebSocket.OPEN;
        }

        /**
         * 建立 WSS 连接
         * 实际地址形如：wss://host/wss?wsToken=xxx
         */
        connect(query) {
          if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            console.warn("[WsManager] already connected or connecting");
            return;
          }
          this.query = query || {};
          const url = this.buildUrl(Config.WSS_URL, this.query);
          console.log(`[WsManager] connect: ${url}`);
          this.socket = new WebSocket(url);
          this.socket.onopen = () => {
            var _this$onOpen;
            console.log("[WsManager] open");
            (_this$onOpen = this.onOpen) == null || _this$onOpen.call(this);
          };
          this.socket.onclose = () => {
            var _this$onClose;
            console.log("[WsManager] close");
            this.socket = null;
            (_this$onClose = this.onClose) == null || _this$onClose.call(this);
          };
          this.socket.onerror = event => {
            var _this$onError;
            console.error("[WsManager] error", event);
            (_this$onError = this.onError) == null || _this$onError.call(this, event);
          };
          this.socket.onmessage = event => {
            var _this$onMessage;
            const data = typeof event.data === "string" ? event.data : String(event.data);
            console.log(`[WsManager] message: ${data}`);
            (_this$onMessage = this.onMessage) == null || _this$onMessage.call(this, data);
          };
        }

        /** 发送文本或对象（对象会 JSON.stringify） */
        send(data) {
          if (!this.isConnected || !this.socket) {
            console.warn("[WsManager] send ignored, not connected");
            return;
          }
          const payload = typeof data === "string" ? data : JSON.stringify(data);
          this.socket.send(payload);
        }
        close() {
          if (!this.socket) {
            return;
          }
          try {
            this.socket.close();
          } catch (e) {
            console.warn("[WsManager] close error", e);
          }
          this.socket = null;
        }
        buildUrl(base, query) {
          if (!query) {
            return base;
          }
          const parts = [];
          for (const key in query) {
            if (!Object.prototype.hasOwnProperty.call(query, key)) {
              continue;
            }
            const value = query[key];
            if (value === undefined || value === null) {
              continue;
            }
            parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
          }
          if (parts.length === 0) {
            return base;
          }
          return `${base}?${parts.join("&")}`;
        }
      }
      exports('WsManager', WsManager);
      WsManager._instance = void 0;
      cclegacy._RF.pop();
    }
  };
});

(function(r) {
  r('virtual:///prerequisite-imports/main', 'chunks:///_virtual/main'); 
})(function(mid, cid) {
    System.register(mid, [cid], function (_export, _context) {
    return {
        setters: [function(_m) {
            var _exportObj = {};

            for (var _key in _m) {
              if (_key !== "default" && _key !== "__esModule") _exportObj[_key] = _m[_key];
            }
      
            _export(_exportObj);
        }],
        execute: function () { }
    };
    });
});