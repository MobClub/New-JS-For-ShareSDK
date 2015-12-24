//
//  ViewController.m
//  ShareSDKForJavaScript
//
//  Created by 刘靖煌 on 15/11/2.
//  Copyright © 2015年 mob.com. All rights reserved.
//

#import "ViewController.h"
#import "ShareSDKJSBridge.h"

@interface ViewController ()<UIWebViewDelegate>
{
@private
    ShareSDKJSBridge *_bridge;
}

@end

@implementation ViewController

- (void)viewDidLoad
{
    [super viewDidLoad];
    
    NSString *path = [[NSBundle mainBundle] pathForResource:@"Sample" ofType:@"html"];
    NSURL *htmlURL = [NSURL fileURLWithPath:path];
    
    UIWebView *webView = [[UIWebView alloc] initWithFrame:self.view.bounds];
    webView.autoresizingMask = UIViewAutoresizingFlexibleHeight | UIViewAutoresizingFlexibleWidth;
    webView.delegate = self;
    [self.view addSubview:webView];
    [webView loadRequest:[NSURLRequest requestWithURL:htmlURL]];
}

#pragma mark - UIWebViewDelegate

- (BOOL)webView:(UIWebView *)webView shouldStartLoadWithRequest:(NSURLRequest *)request navigationType:(UIWebViewNavigationType)navigationType
{
    return ![[ShareSDKJSBridge sharedBridge] captureRequest:request webView:webView];
}


@end
