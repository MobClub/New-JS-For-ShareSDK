/**
 * Created with JetBrains WebStorm.
 * User: vim888
 * Date: 14-3-17
 * Time: 下午5:10
 * To change this template use File | Settings | File Templates.
 */
(function (window){

    //是否正在与本地进行交互
    var _running = false;

    //流水号
    var _seqId = 0;
    //是否已经发送初始化请求
    var _isSendInitRequest = false;
    //初始化回调方法
    var _initCallbackFuncs = [];
    //API调用器
    var _apiCaller = null;

    var _firstRequest = null;
    var _lastRequest = null;
    var jsLog = null;

    /**
     * SDK方法名称
     * @type {object}
     */
    var ShareSDKMethodName =
    {       
        "InitSDKAndSetPlatfromConfig" : "initSDKAndSetPlatfromConfig",
        "Authorize" : "authorize",
        "CancelAuthorize" : "cancelAuthorize",
        "IsAuthorizedValid" : "isAuthorizedValid",
        "IsClientValid" : "isClientValid",
        "GetUserInfo" : "getUserInfo",
        "GetAuthInfo" : "getAuthInfo",        
        "ShareContent" : "shareContent",
        "OneKeyShareContent" : "oneKeyShareContent",
        "ShowShareMenu" : "showShareMenu",
        "ShowShareView" : "showShareView",
        "GetFriendList" : "getFriendList",
        "AddFriend" : "addFriend",
        "CloseSSOWhenAuthorize" : "closeSSOWhenAuthorize"
    };

    /**
     * 请求信息
     * @param seqId         流水号
     * @param method        方法
     * @param params        参数集合
     * @constructor
     */
    function RequestInfo (seqId, method, params)
    {
        this.seqId = seqId;
        this.method = method;
        this.params = params;
        this.nextRequest = null;
    }

    /**
     * JSON字符串转换为对象
     * @param string        JSON字符串
     * @returns {Object}    转换后对象
     */
    function jsonStringToObject (string)
    {

        try {

            return eval("(" + string + ")");

        } catch (err) {

            return null;

        }

    }

    /**
     * 对象转JSON字符串
     * @param obj           对象
     * @returns {string}    JSON字符串
     */
    function objectToJsonString (obj)
    {
        var S = [];
        var J = null;

        var type = Object.prototype.toString.apply(obj);

        if (type === '[object Array]') {

            for (var i = 0; i < obj.length; i++) {
                S.push(objectToJsonString(obj[i]));
            }

            J = '[' + S.join(',') + ']';
        } else if (type === '[object Date]') {

            J = "new Date(" + obj.getTime() + ")";

        } else if (type === '[object RegExp]'
            || type === '[object Function]') {

            J = obj.toString();

        } else if (type === '[object Object]') {

            for (var key in obj) {

                var value = objectToJsonString(obj[key]);
                if (value != null) {
                    S.push('"' + key + '":' + value);
                }
            }
            J = '{' + S.join(',') + '}';

        } else if (type === '[object String]') {

            J = '"' + obj.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '') + '"';
        } else if (type === '[object Number]') {

            J = obj;
        } else if (type === '[object Boolean]') {

            J = obj;
        }


        return J;
    }

    /**
     * Android接口调用器
     * @constructor
     */
    function AndroidAPICaller()
    {
        /**
         * 调用方法
         * @param request       请求信息
         */
        this.callMethod = function(request)
        {
            jsLog.log("js request: " + request.method);
            
            jsLog.log("    seqId = " + request.seqId.toString());
            jsLog.log("    api = " + request.method);
            jsLog.log("    data = " + objectToJsonString(request.params));
            //java接口
            window.JSInterface.jsCallback(request.seqId.toString(), request.method, objectToJsonString(request.params), "$sharesdk._callback");
        };

        /**
         * 返回回调
         * @param response      回复数据
         *
         * response结构
         * {
         *   "seqId" : "111111",
         *   "platform" : 1,
         *   "state" : 1,
         *   "data" : "user or share response"
         *   "callback" : "function string"
         *   "error" :
         *   {
         *      "error_level" : 1,
         *      "error_code" : 11,
         *      "error_msg" : "adsfdsaf",
         *   }
         * }
         */
        this.callback = function (response)
        {
            var logMsg = "java returns: " + JSON.stringify(response);
            jsLog.log(logMsg);

            if (response.callback)
            {
                jsLog.log("callback = " + response.callback);
                var callbackFunc = eval(response.callback);

                if (callbackFunc)
                {
                    var method = response.method;

                    switch (method)
                    {
                        case ShareSDKMethodName.Authorize:
                            callbackFunc(response.platform, response.state, response.error);
                            break;
                        case ShareSDKMethodName.GetUserInfo:
                            callbackFunc(response.platform, response.state, response.data, response.platformDb, response.error);
                            break;
                        case ShareSDKMethodName.IsAuthorizedValid:
                            callbackFunc(response.platform, response.data);
                            break;
                        case ShareSDKMethodName.IsClientValid:
	                        callbackFunc(response.platform, response.data);
	                        break;
                        case ShareSDKMethodName.ShareContent:
                        case ShareSDKMethodName.OneKeyShareContent:
                        case ShareSDKMethodName.ShowShareMenu:
                        case ShareSDKMethodName.ShowShareView:
                            isShare = true;
                            callbackFunc(response.platform, response.state, response.data, response.error, response.end);
                            break;
                        case ShareSDKMethodName.GetFriendList:
                        	callbackFunc(response.platform, response.state, response.data, response.error);
                        	break;
                        case ShareSDKMethodName.AddFriend:
                        	callbackFunc(response.platform, response.state, response.error);
                        	break;
                        case ShareSDKMethodName.GetAuthInfo:
                        	callbackFunc(response.platform, response.data);
                        	break;
                    }
                }
            }
        };
    }

    /**
     * iOS接口调用器
     */
    function iOSAPICaller()
    {
        this._requestes = {};

        /**
         * 调用方法
         * @param request    请求信息
         */
        this.callMethod = function(request)
        {
            this._requestes[request.seqId] = request;
            window.location.href = "sharesdk://call?seqId=" + request.seqId + "&methodName=" + request.method;

        };

        /**
         * 返回回调
         * @param response      回复数据
         *
         * response结构
         * {
         *   "seqId" : "111111",
         *   "platform" : 1,
         *   "state" : 1,
         *   "data" : "user or share response"
         *   "callback" : "function string"
         *   "error" :
         *   {
         *      "error_level" : 1,
         *      "error_code" : 11,
         *      "error_msg" : "adsfdsaf",
         *   }
         * }
         */
        this.callback = function (response)
        {
            if (response.callback)
            {
                var callbackFunc = eval(response.callback);

                if (callbackFunc)
                {
                    var method = response.method;
                    switch (method)
                    {
                        case ShareSDKMethodName.Authorize:
                            callbackFunc(response.platform, response.state, response.error);
                            break;
                        case ShareSDKMethodName.GetUserInfo:
                            callbackFunc(response.platform, response.state, response.data, response.error);
                            break;
                        case ShareSDKMethodName.IsAuthorizedValid:
                            callbackFunc(response.platform, response.data);
                            break;
                        case ShareSDKMethodName.IsClientValid:
	                        callbackFunc(response.platform, response.data);
	                        break;
                        case ShareSDKMethodName.ShareContent:
                        case ShareSDKMethodName.OneKeyShareContent:
                        case ShareSDKMethodName.ShowShareMenu:
                        case ShareSDKMethodName.ShowShareView:
                            callbackFunc(response.platform, response.state, response.data, response.error, response.end);
                            break;
                        case ShareSDKMethodName.GetFriendList:
                        	break;
                        case ShareSDKMethodName.AddFriend:
                        	break;
                        case ShareSDKMethodName.GetAuthInfo:
                        	break;
                    }
                }
            }
        };

        this.getParams = function (seqId)
        {
            var paramsStr = null;
            var request = this._requestes[seqId];

            if (request && request.params)
            {
                paramsStr = objectToJsonString(request.params);
            }

            this._requestes[seqId] = null;
            delete this._requestes[seqId];

            return paramsStr;
        };
    }

    function ShareSDK ()
    {

    }

    /**
     * 平台类型
     * @type {object}
     */
    ShareSDK.platformID = {
    		Unknown : 0,
    		SinaWeibo : 1,			//Sina Weibo         
    		TencentWeibo : 2,		//Tencent Weibo          
    		DouBan : 5,				//Dou Ban           
    		QZone : 6, 				//QZone           
    		Renren : 7,				//Ren Ren           
    		Kaixin : 8,				//Kai Xin          
    		Pengyou : 9,			//Friends          
    		Facebook : 10,			//Facebook         
    		Twitter : 11,			//Twitter         
    		Evernote : 12,			//Evernote        
    		Foursquare : 13,		//Foursquare      
    		GooglePlus : 14,		//Google+       
    		Instagram : 15,			//Instagram      
    		LinkedIn : 16,			//LinkedIn       
    		Tumblr : 17,			//Tumblr         
    		Mail : 18, 				//Mail          
    		SMS : 19,				//SMS           
    		Print : 20, 			//Print       
    		Copy : 21,				//Copy             
    		WeChatSession : 22,		//WeChat Session    
    		WeChatTimeline : 23,	//WeChat Timeline   
    		QQ : 24,				//QQ              
    		Instapaper : 25,		//Instapaper       
    		Pocket : 26,			//Pocket           
    		YouDaoNote : 27, 		//You Dao Note     
    		SohuKan : 28, 			//Sohu Sui Shen Kan         
    		Pinterest : 30, 		//Pinterest    
    		Flickr : 34,			//Flickr          
    		Dropbox : 35,			//Dropbox          
    		VKontakte : 36,			//VKontakte       
    		WeChatFav : 37,			//WeChat Favorited        
    		YiXinSession : 38, 		//YiXin Session   
    		YiXinTimeline : 39,		//YiXin Timeline   
    		YiXinFav : 40,			//YiXin Favorited  
    		MingDao : 41,          	//明道
    		Line : 42,             	//Line
    		WhatsApp : 43,         	//Whats App
    		KakaoTalk : 44,         //KakaoTalk
    		KakaoStory : 45,        //KakaoStory 
    		FacebookMessenger : 46, //FacebookMessenger
    		Bluetooth : 48,         //Bluetooth
    		Alipay : 50,            //Alipay
    		WechatPlatform : 997,   //Wechat Series
    		QQPlatform : 998,		//QQ Series
    		Any : 999 				//Any Platform  
    };

    /**
     * 回复状态
     * @type {object}
     */
    ShareSDK.responseState = {

        Begin : 0,              //开始
        Success: 1,             //成功
        Fail : 2,               //失败
        Cancel :3               //取消

    };

    /**
     * 内容分享类型
     * @type {object}
     */
    ShareSDK.contentType = {
        Text : 0,
        Image : 1,
        WebPage : 2,
        Music : 3,
        Video : 4,
        Apps : 5,
        NonGif : 6,
        Gif : 7,
        File : 8
    };

    /**
     * 检测是否已经初始化
     * @param callback  回调方法
     * @private
     */
    ShareSDK._checkInit = function (method, params, callback)
    {
        if (_apiCaller == null)
        {
            _initCallbackFuncs.push({
                "method" : method,
                "params" : params,
                "callback" : callback
            });

            if (!_isSendInitRequest)
            {
                window.location.href = "sharesdk://init";
                _isSendInitRequest = true;
            }
        }
        else
        {
            if (callback)
            {
                callback (method, params);
            }
        }
    };

    /**
     * 调用方法
     * @param method        方法
     * @param params        参数
     * @private
     */
    ShareSDK._callMethod = function (method, params)
    {
        ShareSDK._checkInit(method, params, function (method, params) {

            _seqId ++;
            var req = new RequestInfo(_seqId, method, params);

            if (_firstRequest == null)
            {
                _firstRequest = req;
                _lastRequest = _firstRequest;
            }
            else
            {
                _lastRequest.nextRequest = req;
                _lastRequest = req;
            }

            ShareSDK._sendRequest();
        });
    };

    /**
     * 发送请求
     * @private
     */
    ShareSDK._sendRequest = function ()
    {
        if (!_running && _firstRequest)
        {
            _running = true;
            _apiCaller.callMethod(_firstRequest);

            setTimeout(function(){

                _running = false;
                //直接发送下一个请求
                ShareSDK._nextRequest();
                ShareSDK._sendRequest();

            }, 50);

        }
    };

    /**
     * 下一个请求
     * @private
     */
    ShareSDK._nextRequest = function ()
    {
        if (_firstRequest == _lastRequest)
        {
            _firstRequest = null;
            _lastRequest = null;
            _running = false;
        }
        else
        {
            _firstRequest = _firstRequest.nextRequest;
        }
    };

    /**
     * 初始化SDK (由系统调用)
     * @param platform  平台类型，1 安卓 2 iOS
     * @private
     */
    ShareSDK._init = function (platform)
    {
        switch (platform)
        {
            case 1:
                jsLog = {
                    log: function(msg) {
                        window.JSInterface.jsLog(msg);
                    }
                };
                jsLog.log("found platform type: Android");
                _apiCaller = new AndroidAPICaller();
                break;
            case 2:
                jsLog = {
                    log: function(msg) {

                    }
                };
                _apiCaller = new iOSAPICaller();
                break;
        }

        //派发回调
        for (var i = 0; i < _initCallbackFuncs.length; i++)
        {
            var obj = _initCallbackFuncs[i];
            obj.callback (obj.method, obj.params);
        }
        _initCallbackFuncs.splice(0);
    };

    /**
     * 回调方法 (由系统调用)
     * @param response  回复数据
     * @private
     */
    ShareSDK._callback = function (response)
    {
        _apiCaller.callback(response);
    };

    /**
     * 获取参数
     * @param seqId
     * @returns {*}
     * @private
     */
    ShareSDK._getParams = function (seqId)
    {
        return _apiCaller.getParams(seqId);
    };

    /**
     * 设置平台配置
     * @param platform          平台类型
     * @param config            配置信息
     */
    ShareSDK.initSDKAndSetPlatfromConfig = function (appKey, platformConfig)
    {
    	alert(" ShareSDK.initSDKAndSetPlatfromConfig");
        var params =
        {
            "appKey" : appKey,
            // "enableStatistics" : enableStatistics,
            "platformConfig" : platformConfig
        };
        ShareSDK._callMethod(ShareSDKMethodName.InitSDKAndSetPlatfromConfig, params);
    };

    /**
     * 用户授权
     * @param platform          平台类型
     * @param callback          回调方法
     */
    ShareSDK.authorize = function (platform, callback)
    {
        var params =
        {
            "platform" : platform,
            "callback" : "(" + callback.toString() + ")"
        };

        ShareSDK._callMethod(ShareSDKMethodName.Authorize, params);
    };

    /**
     * 取消用户授权
     * @param platform          平台类型
     */
    ShareSDK.cancelAuthorize = function (platform)
    {
        var params =
        {
            "platform" : platform
        };

        ShareSDK._callMethod(ShareSDKMethodName.CancelAuthorize, params);
    };

    /**
     * 是否授权
     * @param platform          平台类型
     * @param callback          回调方法
     *
     */
    ShareSDK.isAuthorizedValid = function (platform, callback)
    {
        var params =
        {
            "platform" : platform,
            "callback" : "(" + callback.toString() + ")"
        };

        ShareSDK._callMethod(ShareSDKMethodName.IsAuthorizedValid, params);

    };

    /**
     * 客户端是否可用
     * @param platform          平台类型
     * @param callback          回调方法
     *
     */
    ShareSDK.isClientValid = function (platform, callback)
    {
        var params =
        {
            "platform" : platform,
            "callback" : "(" + callback.toString() + ")"
        };

        ShareSDK._callMethod(ShareSDKMethodName.IsClientValid, params);

    };
    
    /**
     * 获取用户信息
     * @param platform          平台类型
     * @param callback          回调方法
     */
    ShareSDK.getUserInfo = function (platform, callback)
    {
        var params =
        {
            "platform" : platform,
            "callback" : "(" + callback.toString() + ")"
        };

        ShareSDK._callMethod(ShareSDKMethodName.GetUserInfo, params);
    };
    
    /**
     * 获取授权信息
     * @param platform          平台类型
     * @param callback          回调方法
     */
    ShareSDK.getAuthInfo = function (platform, callback)
    {
        var params =
        {
            "platform" : platform,
            "callback" : "(" + callback.toString() + ")"
        };

        ShareSDK._callMethod(ShareSDKMethodName.GetAuthInfo, params);
    };

    /**
     * 分享内容
     * @param platform          平台类型
     * @param shareParams       分享内容
     * @param callback          回调方法
     */
    ShareSDK.shareContent = function (platform, shareParams, callback)
    {
        var params =
        {
            "platform" : platform,
            "shareParams" : shareParams,
            "callback" : "(" + callback.toString() + ")"
        };

        ShareSDK._callMethod(ShareSDKMethodName.ShareContent, params);
    };
    

    /**
     * 一键分享
     * @param platforms         分享的目标平台类型集合
     * @param shareParams       分享内容
     * @param callback          回调方法
     */
    ShareSDK.oneKeyShareContent = function (platforms, shareParams, callback)
    {
        var params =
        {
            "platforms" : platforms,
            "shareParams" : shareParams,
            "callback" : "(" + callback.toString() + ")"
        };

        ShareSDK._callMethod(ShareSDKMethodName.OneKeyShareContent, params);
    };
    
    /**
     * 显示分享菜单
     * @param platforms         分享的目标平台类型集合
     * @param shareParams       分享内容
     * @param x                 弹出菜单的原点横坐标（仅用于iPad）
     * @param y                 弹出菜单的原点纵坐标（仅用于iPad）
     * @param direction         弹出菜单的箭头方向（仅用于iPad）
     * @param callback          回调方法
     */
    ShareSDK.showShareMenu = function (platforms, shareParams, x, y, callback)
    {
        var params =
        {
            "platforms" : platforms,
            "shareParams" : shareParams,
            "x" : x,
            "y" : y,
            "theme" : "skyblue",
            "callback" : "(" + callback.toString() + ")"
        };

        ShareSDK._callMethod(ShareSDKMethodName.ShowShareMenu, params);
    };

    /**
     * 显示分享视图
     * @param platform
     * @param shareParams
     * @param callback
     */
    ShareSDK.showShareView = function (platform, shareParams, callback)
    {
        var params =
        {
            "platform" : platform,
            "shareParams" : shareParams,
            "callback" : "(" + callback.toString() + ")"
        };

        ShareSDK._callMethod(ShareSDKMethodName.ShowShareView, params);
    };
    
    /**
     * 获取朋友列表
     * @param platform
     * @param page
     * @param count
     * @param account
     * @param callback
     */
    ShareSDK.getFriendList = function (platform, page, count, account, callback)
    {
    	 var params =
         {
             "platform" : platform,
             "page" : page,
             "count" : count,
             "account" : account,
             "callback" : "(" + callback.toString() + ")"
         };
    	ShareSDK._callMethod(ShareSDKMethodName.GetFriendList, params);
    };
    
    /**
     * 关注好友
     * @param platform
     * @param friendName
     * @param callback 
     */
    ShareSDK.addFriend = function(platform, friendName, callback){
    	var params = 
    	{
    			"platform" : platform,
                "friendName" : friendName,
                "callback" : "(" + callback.toString() + ")"	
    	}
    	ShareSDK._callMethod(ShareSDKMethodName.AddFriend, params);
    };
    
    /**
     * 设置平台配置
     * @param platform          平台类型
     * @param config            配置信息
     */
    ShareSDK.closeSSOWhenAuthorize = function (disableSSO)
    {
        var params =
        {
            "disableSSO" : disableSSO
        };

        ShareSDK._callMethod(ShareSDKMethodName.CloseSSOWhenAuthorize, params);
    };

    window.$sharesdk = ShareSDK;

})(window)