//
//  ViewController.m
//  ShareSDKForJavaScript
//
//  Created by 刘靖煌 on 15/11/2.
//  Copyright © 2015年 mob.com. All rights reserved.
//

#import "ViewController.h"
#import "ShareSDKJSBridge.h"
#import <AssetsLibrary/AssetsLibrary.h>
#import "ShareSDKHybrid.h"

@interface ViewController ()<UIWebViewDelegate,WKNavigationDelegate,WKUIDelegate>
{
@private
    ShareSDKJSBridge *_bridge; // uiwebview
    ShareSDKHybrid *_hybrid;   // wkwebview
}

@end

@implementation ViewController

- (void)viewDidLoad
{
    [super viewDidLoad];
    
    NSString *path = [[NSBundle mainBundle] pathForResource:@"Sample" ofType:@"html"];
    NSURL *htmlURL = [NSURL fileURLWithPath:path];
    
//    UIWebView *webView = [[UIWebView alloc] initWithFrame:self.view.bounds];
//    webView.autoresizingMask = UIViewAutoresizingFlexibleHeight | UIViewAutoresizingFlexibleWidth;
//    webView.delegate = self;
//    [self.view addSubview:webView];
//    [webView loadRequest:[NSURLRequest requestWithURL:htmlURL]];
    
    WKWebView *webView = [[WKWebView alloc] initWithFrame:self.view.bounds];
    webView.autoresizingMask = UIViewAutoresizingFlexibleHeight | UIViewAutoresizingFlexibleWidth;
    webView.navigationDelegate = self;
    webView.UIDelegate = self;
    [self.view addSubview:webView];
    [webView loadRequest:[NSURLRequest requestWithURL:htmlURL]];
    
}

//#pragma mark - UIWebViewDelegate
//
//- (BOOL)webView:(UIWebView *)webView shouldStartLoadWithRequest:(NSURLRequest *)request navigationType:(UIWebViewNavigationType)navigationType
//{
//    return ![[ShareSDKJSBridge sharedBridge] captureRequest:request webView:webView];
//}

#pragma mark - WKNavigationDelegate

- (void)webView:(WKWebView *)webView decidePolicyForNavigationAction:(WKNavigationAction *)navigationAction decisionHandler:(void (^)(WKNavigationActionPolicy))decisionHandler
{
    if ([[ShareSDKHybrid sharedHybrid] captureRequest:navigationAction.request webView:webView])
    {
        decisionHandler(WKNavigationActionPolicyCancel);
    }
    else
    {
        decisionHandler(WKNavigationActionPolicyAllow);
    }
}

- (void)webView:(WKWebView *)webView runJavaScriptAlertPanelWithMessage:(NSString *)message initiatedByFrame:(WKFrameInfo *)frame completionHandler:(void (^)(void))completionHandler
{
    UIAlertController *alertController = [UIAlertController alertControllerWithTitle:@"提示" message:message?:@"" preferredStyle:UIAlertControllerStyleAlert];
    [alertController addAction:([UIAlertAction actionWithTitle:@"确认" style:UIAlertActionStyleDefault handler:^(UIAlertAction * _Nonnull action) {
        completionHandler();
    }])];
    [self presentViewController:alertController animated:YES completion:nil];
}

@end
