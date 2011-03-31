/**
 * AJS.js
 * Contains some JS functions
 */

var AJS = AJS || {};
AJS.version = "0.1.00";

/** 
 * Script for dynamically loading external JS libraries from their URLs
 */
AJS.addedScripts = 0;
AJS.load = function(url) {
	var head = document.getElementsByTagName('head')[0];
	var script = document.createElement('script');
	script.type = 'text/javascript';
	script.src = url;
	script.id = "script" + AJS.addedScripts;
	AJS.addedScripts++;
	head.appendChild(script);
	return script;
}

AJS.unload = function(scriptID) {
	var e = document.getElementById(scriptID);
	e.parentNode.removeChild(e);
}
