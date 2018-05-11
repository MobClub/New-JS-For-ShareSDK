package cn.sharesdk.js;

import java.util.ArrayList;
import java.util.HashMap;

import android.os.Handler.Callback;
import android.os.Message;
import cn.sharesdk.framework.Platform;
import cn.sharesdk.framework.PlatformActionListener;
import cn.sharesdk.framework.ShareSDK;

import com.mob.tools.utils.Hashon;
import com.mob.tools.utils.UIHandler;

/**
 * Such inherited sharesdk callback interface, added some js callback parameter setting
 *
 */
public class JSPlatformActionListener implements PlatformActionListener {
	private Callback jsCallback;
	private Hashon hashon;
	private String seqId;
	private String callback;
	private String oriCallback;
	private String api;
	
	public JSPlatformActionListener() {
		hashon = new Hashon();
	}
	
	public void setCallback(Callback callback) {
		jsCallback = callback;
	}
	
	public void setSeqId(String seqId) {
		this.seqId = seqId;
	}
	
	public void setJSCallback(String callback) {
		this.callback = callback;
	}
	
	public void setOriCallback(String callback) {
		this.oriCallback = callback;
	}
	
	public void setApi(String api) {
		this.api = api;
	}
	
	public void onComplete(Platform platform, int action, HashMap<String, Object> res) {
		HashMap<String, Object> resp = new HashMap<String, Object>();
		resp.put("seqId", seqId);
		resp.put("state", 1);
		resp.put("method", api);
		resp.put("callback", oriCallback);
		resp.put("platform", ShareSDK.platformNameToId(platform.getName()));
		resp.put("data", res);
		resp.put("action", action);
		Message msg = new Message();
		msg.what = ShareSDKUtils.MSG_LOAD_URL;
		msg.obj = "javascript:" + callback + "(" + hashon.fromHashMap(resp) + ");";
		UIHandler.sendMessage(msg, jsCallback);
	}
	
	public void onError(Platform platform, int action, Throwable t) {
		t.printStackTrace();
		HashMap<String, Object> resp = new HashMap<String, Object>();
		resp.put("seqId", seqId);
		resp.put("state", 2);
		resp.put("method", api);
		resp.put("callback", oriCallback);
		resp.put("platform", ShareSDK.platformNameToId(platform.getName()));
		resp.put("action", action);
		HashMap<String, Object> error = new HashMap<String, Object>();
		error.put("error_level", 1);
		error.put("error_code", 0);
		error.put("error_msg", t.getMessage());
		error.put("error_detail", throwableToMap(t));
		resp.put("error", error);
		
		Message msg = new Message();
		msg.what = ShareSDKUtils.MSG_LOAD_URL;
		msg.obj = "javascript:" + callback + "(" + hashon.fromHashMap(resp) + ");";
		UIHandler.sendMessage(msg, jsCallback);
	}
	
	public void onCancel(Platform platform, int action) {
		HashMap<String, Object> resp = new HashMap<String, Object>();
		resp.put("seqId", seqId);
		resp.put("state", 3);
		resp.put("method", api);
		resp.put("callback", oriCallback);
		resp.put("platform", ShareSDK.platformNameToId(platform.getName()));
		resp.put("action", action);
		
		Message msg = new Message();
		msg.what = ShareSDKUtils.MSG_LOAD_URL;
		msg.obj = "javascript:" + callback + "(" + hashon.fromHashMap(resp) + ");";
		UIHandler.sendMessage(msg, jsCallback);
	}
	
	private HashMap<String, Object> throwableToMap(Throwable t) {
		HashMap<String, Object> map = new HashMap<String, Object>();
		map.put("msg", t.getMessage());
		ArrayList<HashMap<String, Object>> traces = new ArrayList<HashMap<String, Object>>();
		for (StackTraceElement trace : t.getStackTrace()) {
			HashMap<String, Object> element = new HashMap<String, Object>();
			element.put("cls", trace.getClassName());
			element.put("method", trace.getMethodName());
			element.put("file", trace.getFileName());
			element.put("line", trace.getLineNumber());
			traces.add(element);
		}
		map.put("stack", traces);
		Throwable cause = t.getCause();
		if (cause != null) {
			map.put("cause", throwableToMap(cause));
		}
		return map;
	}
	
}
