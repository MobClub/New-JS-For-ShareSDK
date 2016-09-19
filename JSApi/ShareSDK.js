function ShareSDK()
{
    var isRunning = false;         //是否正在与本地进行交互
    var isDebug = true;            //是否打开调试
    var isSendInitRequest = false; //是否已经发送初始化请求
    var initCallbackFuncs = [];    //初始化回调方法
    var apiCaller = null;          //API调用器

    var seqId = 0;
    var firstRequest = null;
    var lastRequest = null;
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
        "CloseSSOWhenAuthorize" : "closeSSOWhenAuthorize",
        "ShareWithConfigurationFile" : "shareWithConfigurationFile"
    };

    /**
     * 请求信息
     * @param seqId         流水号
     * @param method        方法
     * @param params        参数集合
     * @constructor
     */
    var RequestInfo = function (seqId, method, params)
    {
        this.seqId = seqId;
        this.method = method;
        this.params = params;
        this.nextRequest = null;
    };

    /**
     * JSON字符串转换为对象
     * @param string        JSON字符串
     * @returns {Object}    转换后对象
     */
    var JsonStringToObject = function (string)
    {
        try
        {
            return eval("(" + string + ")");
        }
        catch (err)
        {
            return null;
        }
    };

    /**
     * 对象转JSON字符串
     * @param obj           对象
     * @returns {string}    JSON字符串
     */
    var ObjectToJsonString = function (obj)
    {
        var S = [];
        var J = null;

        var type = Object.prototype.toString.apply(obj);

        if (type === '[object Array]')
        {
            for (var i = 0; i < obj.length; i++)
            {
                S.push(ObjectToJsonString(obj[i]));
            }
            J = '[' + S.join(',') + ']';
        }
        else if (type === '[object Date]')
        {
            J = "new Date(" + obj.getTime() + ")";
        }
        else if (type === '[object RegExp]'
            || type === '[object Function]')
        {
            J = obj.toString();
        }
        else if (type === '[object Object]')
        {
            for (var key in obj)
            {
                var value = ObjectToJsonString(obj[key]);
                if (value != null)
                {
                    S.push('"' + key + '":' + value);
                }
            }
            J = '{' + S.join(',') + '}';
        }
        else if (type === '[object String]')
        {
            J = '"' + obj.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '') + '"';
        }
        else if (type === '[object Number]')
        {
            J = obj;
        }
        else if (type === '[object Boolean]')
        {
            J = obj;
        }

        return J;
    };

    /**
     * Android接口调用器
     * @constructor
     */
    var AndroidAPICaller = function ()
    {
        /**
         * 调用方法
         * @param request       请求信息
         */
        this.callMethod = function (request)
        {
        	if (isDebug) {
	            jsLog.log("js request: " + request.method);
	            jsLog.log("seqId = " + request.seqId.toString());
	            jsLog.log("api = " + request.method);
	            jsLog.log("data = " + ObjectToJsonString(request.params));
        	}
                                                         
            //java接口
            window.JSInterface.jsCallback(request.seqId.toString(), request.method, ObjectToJsonString(request.params), "$sharesdk.callback");
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
         *      "error_code" : 11,
         *      "error_msg" : "adsfdsaf",
         *   }
         * }
         */
        this.callback = function (response)
        {
            var logMsg = "java returns: " + JSON.stringify(response);
            if (isDebug) {
            	jsLog.log(logMsg);
            }
            if (response.callback)
            {
                var callbackFunc = eval(response.callback);

                if (callbackFunc)
                {
                    var method = response.method;

                    switch (method)
                    {
                        case ShareSDKMethodName.Authorize:
                            callbackFunc(response.seqId, response.platform, response.state, response.error);
                            break;
                        case ShareSDKMethodName.GetUserInfo:
                            callbackFunc(response.seqId, response.platform, response.state, response.data, response.error);
                            break;
                        case ShareSDKMethodName.IsAuthorizedValid:
                            callbackFunc(response.seqId, response.platform, response.data);
                            break;
                        case ShareSDKMethodName.IsClientValid:
	                        callbackFunc(response.seqId, response.platform, response.data);
	                        break;
                        case ShareSDKMethodName.ShareContent:
                        case ShareSDKMethodName.OneKeyShareContent:
                        case ShareSDKMethodName.ShowShareMenu:
                        case ShareSDKMethodName.ShowShareView:
                            isShare = true;
                            callbackFunc(response.seqId, response.platform, response.state, response.data, response.error);
                            break;
                        case ShareSDKMethodName.GetFriendList:
                        	callbackFunc(response.seqId, response.platform, response.state, response.data, response.error);
                        	break;
                        case ShareSDKMethodName.AddFriend:
                        	callbackFunc(response.seqId, response.platform, response.state, response.error);
                        	break;
                        case ShareSDKMethodName.GetAuthInfo:
                        	callbackFunc(response.seqId, response.platform, response.data);
                        	break;
                    }
                }
            }
        };
    };

    /**
     * iOS接口调用器
     */
    var IOSAPICaller = function ()
    {
        var requestes = {};
                                                         
        /**
         * 调用方法
         * @param request    请求信息
         */
        this.callMethod = function(request)
        {
            requestes[request.seqId] = request;
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
                            callbackFunc(response.seqId, response.platform, response.state, response.error);
                            break;
                        case ShareSDKMethodName.GetUserInfo:
                            callbackFunc(response.seqId, response.platform, response.state, response.data, response.error);
                            break;
                        case ShareSDKMethodName.IsAuthorizedValid:
                            callbackFunc(response.seqId, response.platform, response.data);
                            break;
                        case ShareSDKMethodName.IsClientValid:
	                        callbackFunc(response.seqId, response.platform, response.data);
	                        break;
                        case ShareSDKMethodName.ShareContent:
                        case ShareSDKMethodName.OneKeyShareContent:
                        case ShareSDKMethodName.ShowShareMenu:
                        case ShareSDKMethodName.ShowShareView:
                        case ShareSDKMethodName.ShareWithConfigurationFile:
                            callbackFunc(response.seqId, response.platform, response.state, response.data, response.error);
                            break;
                        case ShareSDKMethodName.GetFriendList:
                            callbackFunc(response.seqId, response.platform, response.state, response.data, response.error);
                        	break;
                        case ShareSDKMethodName.AddFriend:
                            callbackFunc(response.seqId, response.platform, response.state, response.error);
                        	break;
                        case ShareSDKMethodName.GetAuthInfo:
                            callbackFunc(response.seqId, response.platform, response.data);
                        	break;
                    }
                }
            }
        };

        this.getParams = function (seqId)
        {
            var paramsStr = null;
            var request = requestes[seqId];

            if (request && request.params)
            {
                paramsStr = ObjectToJsonString(request.params);
            }

            requestes[seqId] = null;
            delete requestes[seqId];
            return paramsStr;
        };
    };

    /**
     * 平台类型
     * @type {object}
     */
    this.PlatformID = {
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
    		WeChat : 22,		    //WeChat Friends    
    		WeChatMoments : 23,	    //WeChat Timeline   
    		QQ : 24,				//QQ              
    		Instapaper : 25,		//Instapaper       
    		Pocket : 26,			//Pocket           
    		YouDaoNote : 27, 		//You Dao Note
    		Pinterest : 30, 		//Pinterest    
    		Flickr : 34,			//Flickr          
    		Dropbox : 35,			//Dropbox          
    		VKontakte : 36,			//VKontakte       
    		WeChatFavorites : 37,	//WeChat Favorited        
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
            KakaoPlatform : 995,    //Kakao Series
            EvernotePlatform : 996, //Evernote Series
    		WechatPlatform : 997,   //Wechat Series
    		QQPlatform : 998,		//QQ Series
    		Any : 999 				//Any Platform  
    };

    /**
     * 回复状态
     * @type {object}
     */
    this.ResponseState = {
        Begin : 0,              //开始
        Success: 1,             //成功
        Fail : 2,               //失败
        Cancel :3               //取消
    };

    /**
     * 内容分享类型
     * @type {object}
     */
    this.ContentType = {
    	Auto : 0,
        Text : 1,
        Image : 2,
        WebPage : 4,
        Music : 5,
        Video : 6,
        App : 7,
        File : 8,
        Emoji : 9
    };

    /**
     * 检测是否已经初始化
     * @param callback  回调方法
     * @private
     */
    var CheckInit = function (method, params, callback)
    {
        if (apiCaller == null)
        {
            initCallbackFuncs.push({
                "method" : method,
                "params" : params,
                "callback" : callback
            });

            if (!isSendInitRequest)
            {
                window.location.href = "sharesdk://init";
                isSendInitRequest = true;
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
    var CallMethod = function (method, params)
    {
        CheckInit(method, params, function (method, params) {
            seqId ++;
            var req = new RequestInfo(seqId, method, params);

            if (firstRequest == null)
            {
                firstRequest = req;
                lastRequest = firstRequest;
            }
            else
            {
                lastRequest.nextRequest = req;
                lastRequest = req;
            }

            SendRequest();
        });
        return seqId;
    };
                                                         
    /**
     * 发送请求
     * @private
     */
    var SendRequest = function ()
    {
        if (!isRunning && firstRequest)
        {
            isRunning = true;
            apiCaller.callMethod(firstRequest);
            
            setTimeout(function(){

                isRunning = false;
                //直接发送下一个请求
                NextRequest();
                SendRequest();

            }, 50);
        }
    };

    /**
     * 下一个请求
     * @private
     */
    var NextRequest = function ()
    {
        if (firstRequest == lastRequest)
        {
            firstRequest = null;
            lastRequest = null;
            isRunning = false;
        }
        else
        {
            firstRequest = firstRequest.nextRequest;
        }
    };

    /**
     * 初始化SDK (由系统调用)
     * @param platform  平台类型，1 安卓 2 iOS
     * @private
     */
    this.initSDK = function (platform)
    {
        switch (platform)
        {
            case 1:
                jsLog = {
                    log: function(msg) {
                        window.JSInterface.jsLog(msg);
                    }
                };
                if(isDebug) {
                	jsLog.log("found platform type: Android");
        		}
                apiCaller = new AndroidAPICaller();
                break;
            case 2:
                jsLog = {
                    log: function(msg) {
                    }
                };
                                                         
                apiCaller = new IOSAPICaller();
                break;
        }

        //派发回调
        for (var i = 0; i < initCallbackFuncs.length; i++)
        {
            var obj = initCallbackFuncs[i];
            obj.callback (obj.method, obj.params);
        }
        initCallbackFuncs.splice(0);
    };

    /**
     * 回调方法 (由系统调用)
     * @param response  回复数据
     * @private
     */
    this.callback = function (response)
    {
        apiCaller.callback(response);
    };

    /**
     * 获取参数
     * @param seqId
     * @returns {*}
     * @private
     */
    this.getParams = function (seqId)
    {
        return apiCaller.getParams(seqId);
    };

    /**
     * 设置平台配置
     * @param platform          平台类型
     * @param config            配置信息
     */
    this.initSDKAndSetPlatfromConfig = function (appKey, platformConfig)
    {
        var params =
        {
            "appKey" : appKey,
            "platformConfig" : platformConfig
        };
        CallMethod(ShareSDKMethodName.InitSDKAndSetPlatfromConfig, params);
    };

    /**
     * 用户授权
     * @param platform          平台类型
     * @param callback          回调方法
     */
    this.authorize = function (platform, callback)
    {
        var params =
        {
            "platform" : platform,
            "callback" : "(" + callback.toString() + ")"
        };
                                                         
        return CallMethod(ShareSDKMethodName.Authorize, params);
    };

    /**
     * 取消用户授权
     * @param platform          平台类型
     */
    this.cancelAuthorize = function (platform)
    {
        var params =
        {
            "platform" : platform
        };

        CallMethod(ShareSDKMethodName.CancelAuthorize, params);
    };

    /**
     * 是否授权
     * @param platform          平台类型
     * @param callback          回调方法
     *
     */
    this.isAuthorizedValid = function (platform, callback)
    {
        var params =
        {
            "platform" : platform,
            "callback" : "(" + callback.toString() + ")"
        };

        return CallMethod(ShareSDKMethodName.IsAuthorizedValid, params);
    };

    /**
     * 客户端是否可用
     * @param platform          平台类型
     * @param callback          回调方法
     *
     */
    this.isClientValid = function (platform, callback)
    {
        var params =
        {
            "platform" : platform,
            "callback" : "(" + callback.toString() + ")"
        };

        return CallMethod(ShareSDKMethodName.IsClientValid, params);
    };
    
    /**
     * 获取用户信息
     * @param platform          平台类型
     * @param callback          回调方法
     */
    this.getUserInfo = function (platform, callback)
    {
        var params =
        {
            "platform" : platform,
            "callback" : "(" + callback.toString() + ")"
        };

        return CallMethod(ShareSDKMethodName.GetUserInfo, params);
    };
    
    /**
     * 获取授权信息
     * @param platform          平台类型
     * @param callback          回调方法
     */
    this.getAuthInfo = function (platform, callback)
    {
        var params =
        {
            "platform" : platform,
            "callback" : "(" + callback.toString() + ")"
        };

        return CallMethod(ShareSDKMethodName.GetAuthInfo, params);
    };

    /**
     * 分享内容
     * @param platform          平台类型
     * @param shareParams       分享内容
     * @param callback          回调方法
     */
    this.shareContent = function (platform, shareParams, callback)
    {
        var params =
        {
            "platform" : platform,
            "shareParams" : shareParams,
            "callback" : "(" + callback.toString() + ")"
        };

        return CallMethod(ShareSDKMethodName.ShareContent, params);
    };       
    
    /**
     * 使用配置文件的方式分享
     * @param contentName  ShareContent.xml内<Content>标签name属性的值
     * @param platform     平台类型
     * @param customFields 自定义字段
     * @param callback     状态变更回调处理
     */                         
    this.shareWithConfigurationFile = function(contentName, platform , customFields, callback)
    {
        var params = 
        {
            "contentName" : contentName,
            "platform" : platform,
            "customFields" : customFields,
            "callback" : "(" + callback.toString() + ")"
        };
        return CallMethod(ShareSDKMethodName.ShareWithConfigurationFile, params);
    };

    /**
     * 一键分享
     * @param platforms         分享的目标平台类型集合
     * @param shareParams       分享内容
     * @param callback          回调方法
     */
    this.oneKeyShareContent = function (platforms, shareParams, callback)
    {
        var params =
        {
            "platforms" : platforms,
            "shareParams" : shareParams,
            "callback" : "(" + callback.toString() + ")"
        };

        return CallMethod(ShareSDKMethodName.OneKeyShareContent, params);
    };
    
    /**
     * 显示分享菜单
     * @param platforms         分享的目标平台类型集合
     * @param shareParams       分享内容
     * @param x                 弹出菜单的原点横坐标（仅用于iPad）
     * @param y                 弹出菜单的原点纵坐标（仅用于iPad）
     * @param callback          回调方法
     */
    this.showShareMenu = function (platforms, shareParams, x, y, callback)
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

        return CallMethod(ShareSDKMethodName.ShowShareMenu, params);
    };

    /**
     * 显示分享视图
     * @param platform
     * @param shareParams
     * @param callback
     */
    this.showShareView = function (platform, shareParams, callback)
    {
        var params =
        {
            "platform" : platform,
            "shareParams" : shareParams,
            "callback" : "(" + callback.toString() + ")"
        };

        return CallMethod(ShareSDKMethodName.ShowShareView, params);
    };
    
    /**
     * 获取朋友列表
     * @param platform
     * @param page
     * @param count
     * @param account
     * @param callback
     */
    this.getFriendList = function (platform, page, count, account, callback)
    {
    	 var params =
         {
             "platform" : platform,
             "page" : page,
             "count" : count,
             "account" : account,
             "callback" : "(" + callback.toString() + ")"
         };
    	 return CallMethod(ShareSDKMethodName.GetFriendList, params);
    };
    
    /**
     * 关注好友
     * @param platform
     * @param friendName
     * @param callback 
     */
    this.addFriend = function(platform, friendName, callback){
    	var params = 
    	{
    			"platform" : platform,
                "friendName" : friendName,
                "callback" : "(" + callback.toString() + ")"	
    	}
    	return CallMethod(ShareSDKMethodName.AddFriend, params);
    };
    
    /**
     * 设置平台配置（这个接口仅对Android有效果）
     * @param platform          平台类型
     * @param config            配置信息
     */
    this.closeSSOWhenAuthorize = function (disableSSO)
    {
        var params =
        {
            "disableSSO" : disableSSO
        };

        CallMethod(ShareSDKMethodName.CloseSSOWhenAuthorize, params);
    };                                        
};
                                                         
var $sharesdk = new ShareSDK();