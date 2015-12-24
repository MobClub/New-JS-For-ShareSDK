//
//  ShareSDKJSBridge.h
//  ShareSDKForJavaScript
//
//  Created by 刘 靖煌 on 15/11/2.
//  Copyright © 2015年 mob.com. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

@interface ShareSDKJSBridge : NSObject<UIWebViewDelegate>

/**
 *	@brief	根据WebView初始化桥接器
 *
 *	@param 	webView 	WEB视图
 *
 *	@return	JS桥接器
 */
- (id)initWithWebView:(UIWebView *)webView;

/**
 *	@brief	捕获WebView中请求，将此方法放入webView:shouldStartLoadWithRequest:navigationType:委托方法中
 *
 *	@param 	request 	请求对象
 *  @param  webView     Web视图对象
 *
 *	@return	YES 表示为ShareSDK接口请求，请求被捕获。NO 表示非ShareSDK接口请求，不捕获请求
 */
- (BOOL)captureRequest:(NSURLRequest *)request webView:(UIWebView *)webView;

/**
 *	@brief	获取共享桥接器实例
 *
 *	@return	JS桥接器
 */
+ (ShareSDKJSBridge *)sharedBridge;

/**
 *	@brief	创建JS桥接器
 *
 *	@param 	webView 	WEB视图
 *
 *	@return	JS桥接器对象
 */
+ (ShareSDKJSBridge *)bridgeWithWebView:(UIWebView *)webView;

@end
