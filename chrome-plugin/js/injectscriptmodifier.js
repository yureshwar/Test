var s = document.createElement('script');
var scriptpath = chrome.extension.getURL('js/links.js');
s.src = scriptpath;
s.onload = function() {
};
(document.head || document.documentElement).appendChild(s);