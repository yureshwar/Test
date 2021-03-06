/* 
Voice plugin Javascript SDK Library
IMPORTANT NOTE: Copying this library and hosting it locally is strongly discouraged.
 */
// creating the sdk variable
if (typeof Voicepluginsdk === 'undefined') {
	var badBrowser=false;
	if(navigator.appName.indexOf("Internet Explorer") !== -1){
		badBrowser=(navigator.appVersion.indexOf("MSIE 1") === -1);
	}
	var speechrecognitionavailable=false;
	var voiceRecognition;

	// initializing voice recognition library
	if(!window.hasOwnProperty("webkitSpeechRecognition")){
		speechrecognitionavailable=false;
	} else {
		speechrecognitionavailable=true;
		voiceRecognition = window.webkitSpeechRecognition;
	}

	// listening for user session data from extension call
	document.addEventListener("UserSessionkey", function(data) {
		// Voicepluginsdk.createsession(data.detail.data);
	});

	document.addEventListener("Usersessiondata", function(data) {
		Voicepluginsdk.createsession(JSON.parse(data.detail.data));
	});

	document.addEventListener("AuthenticatedUsersessiondata", function(data) {
		Voicepluginsdk.createsession(JSON.parse(data.detail.data));
		Voicepluginsdk.openmodal();
	});

	document.addEventListener("Alertmessagedata", function(data) {
		alert(JSON.parse(data.detail.data));
	});

	var debugsetevent = new CustomEvent("Debugsetevent", {detail: {data: {action:'Debugvalueset',value:voicedebug}}, bubbles: false, cancelable: false});
	document.dispatchEvent(debugsetevent);

	// initializing the sdk variable need to change to a new variable in future.
	var Voicepluginsdk = {
		sdkUrl: "/",
		apihost: (voicedebug)?"http://localhost:11080/voiceapi":"https://voicetest.nistapp.com/voiceapi",
		totalScripts: 0,
		scriptsCompleted:0,
		totalotherScripts:0,
		totalotherScriptsCompleted:0,
		functionsToRunWhenReady: [],
		jqueryready: false,
		request:{},
		userdata:{},
		ignoreelements : ["script","h1","h2","h3","link","noscript","style"],
		availablenavtabs : [],
		htmlindex : [],
		textfromspeech : "",
		nodeid : 0,
		speechrecognitionavailable: false,
		SpeechRecognition : [],
        recognition : {},
		targetNode : [],
		updatesOccur : true,
		updatecounter : 0,
		lastupdatecounter : 0,
		menuitems: [],
		extensionpath:document.currentScript.src.toString().replace("js/Voicepluginsdk.js",""),
		indexnewnodes:false,
		previousurl:"",
		currenturl:"",
		sessionID:"",
		sessiondata:{sessionkey:"",authenticated:false,authenticationsource:"",authdata:{}},
		cookiename:"nist-voice-usersessionid",
		recordingcookiename:"nistsequence",
		recordedsequenceids:[],
		recordclicknodecookiename:"nistclickrecord",
		cookieexpires:365,
		addedtoslidingdiv:false,
		elastic:{apiurl:"http://localhost:9200",indexname:"nistapp",currentpage:0,querystring:""},
		navigationcookiename:"nistnavshow",
		autoplay:false,
		processcount:0,
		totalcount:0,
		rerenderhtml:true,
		processingnodes:false,
		processedclickobjectscount:0,
		recording:false,
		inarray:function(value,object){
			return jQuery.inArray(value, object);
		},
		// constructor for the sdk class which will be initialized on loading of the variable.
		init: function() {
			// loading jquery if not available
			if(typeof jQuery === "undefined") {
				// loading jquery from installed extension path
				this.loadScript(this.extensionpath+"js/jquery-3.4.1.min.js");
			} else {
				// load other scripts if jquery available
				this.jqueryready=true;
				this.otherscripts();
			}
		},

		//adding required script functionality to the head of the page.
		loadScript: function(url) {

			var script = document.createElement("script");
			script.type = "text/javascript";

			if (script.readyState){
				script.onreadystatechange = function(){
					if (script.readyState === "loaded" || script.readyState === "complete"){
						script.onreadystatechange = null;
						Voicepluginsdk.scriptsCompleted++;
						if (typeof jQuery !== 'undefined') {
							this.jqueryready=true;
							Voicepluginsdk.otherscripts();
						}
					}
				};
			} else {
				script.onload = function(){
					Voicepluginsdk.scriptsCompleted++;
					if (typeof jQuery !== 'undefined') {
						this.jqueryready=true;
						if(this.ready !== true){
							Voicepluginsdk.otherscripts();
						}
					}
				};
			}

			script.src = url;
			document.getElementsByTagName("head")[0].appendChild(script);
		},
		loadOtherScript: function(url) {
			var script = document.createElement("script");
			script.type = "text/javascript";
			script.src = url;
			if (script.readyState){
				script.onreadystatechange = function(){
					if (script.readyState === "loaded" || script.readyState === "complete"){
						script.onreadystatechange = null;
						Voicepluginsdk.totalotherScriptsCompleted++;
						if (Voicepluginsdk.totalotherScriptsCompleted === Voicepluginsdk.totalotherScripts) {
							Voicepluginsdk.allReady();
						}
					}
				};
			} else {
				script.onload = function(){
					Voicepluginsdk.totalotherScriptsCompleted++;
					if (Voicepluginsdk.totalotherScriptsCompleted === Voicepluginsdk.totalotherScripts) {
						Voicepluginsdk.allReady();
					}
				};
			}
			document.body.appendChild(script);
		},
		loadCssScript: function(url) {
			var script = document.createElement("link");
			script.rel="stylesheet";
			script.type = "text/css";
			script.href = url;
			document.getElementsByTagName("head")[0].appendChild(script);
		},
		otherscripts: function(){
			this.totalotherScripts=1;
			this.loadCssScript(this.extensionpath+"css/extension.css");
			this.loadOtherScript(this.extensionpath+"js/domJSON.js");
		},
		allReady: function() {
			// execute the parsing method after everything is ready.
			this.onReady();
		},
		queueOrRun: function(fname, param1, param2) {
			if (!this.ready) {
				this.functionsToRunWhenReady.push({
					functionSelf: this[fname],
					param1: param1,
					param2: param2
				});
				return
			}
			this[fname](param1, param2)
		},
		onContent: function (data) {},
		onComplete: function () {},
		onReady: function () {

			// check user session exists and create if not available
			this.checkuserkeyexists();

			// adding speech recognition functionality based on the library availability
			if(speechrecognitionavailable){
				this.recognition = new voiceRecognition();
				this.speechrecognitionavailable = true;
				
				this.recognition.onstart = function() {
					textfromspeech = "";
				};

				this.recognition.onspeechend = function() {

				};

				this.recognition.onerror = function(event) {
					if(event.error === 'no-speech') {
						alert('No speech was detected. Try again.');
					}
				};

				this.recognition.onresult = function(event) {
					if (event.results.length > 0) {
						var current = event.resultIndex;
						// Get a transcript of what was said.
						var transcript = event.results[current][0].transcript;
						jQuery("#voicesearchinput").val(transcript);
						Voicepluginsdk.searchinelastic();
					}
				};
			}

			this.ready = true;

			// listen for when to start the indexing of the dom based on the clicknodes availability
			document.addEventListener("Indexnodes", function(data) {
				if(data.detail.data==="indexclicknodes") {
					Voicepluginsdk.indexclicknodes();
				} else if(data.detail.data==="indexnewclicknodes") {
					Voicepluginsdk.indexnewclicknodes();
				}
			});

			// We need to wait till all dom content is loaded. We initially used a standard wait time but shifted to
			//      use https://developer.mozilla.org/en-US/docs/Web/API/Window/load_event
			//      This still produces some discrepancy where it hangs up the web page.
			//      This needs to be improved at some point.
			window.addEventListener('load', (event) => {
				Voicepluginsdk.modifybodyhtml();
			});
		},
		getcookievalue:function(cookiename){
			var cookievalue=null;

			// Split cookie string and get all individual name=value pairs in an array
			var cookieArr = document.cookie.split(";");

			// Loop through the array elements
			for(var i = 0; i < cookieArr.length; i++) {
				var cookiePair = cookieArr[i].split("=");

				// Removing whitespace at the beginning of the cookie name and compare it with the given string
				if(cookiename === cookiePair[0].trim()) {
					// Decode the cookie value and return
					cookievalue = decodeURIComponent(cookiePair[1]);
				}
			}

			return cookievalue;
		},
		checkuserkeyexists:function(){
			var sessiondata=this.getstoragedata(this.cookiename);
			if(sessiondata){
				var parsedsessiondata=JSON.parse(sessiondata);
				this.sessiondata=parsedsessiondata;
				this.sessionID=parsedsessiondata.sessionkey;
				this.recorddocumentclick();
			}else{
				var sessionevent = new CustomEvent("RequestSessiondata", {detail: {data: "getusersessiondata"}, bubbles: false, cancelable: false});
				document.dispatchEvent(sessionevent);
			}
		},
		createcookie:function(cookiename,cookievalue,expiringdays,path){
			var d = new Date();
			d.setTime(d.getTime() + (expiringdays*24*60*60*1000));
			var expires = "expires="+ d.toUTCString();
			document.cookie = cookiename + "=" + cookievalue + ";" + expires + ";path="+path;
		},
		createsession:function(data){
			var sessiondata=this.getstoragedata(this.cookiename);
			if(sessiondata){
				this.sessiondata=data;
				this.sessionID=data.sessionkey;
				this.createstoragedata(this.cookiename,JSON.stringify(data));
			}else{
				sessionID=data.sessionkey;
				this.sessiondata=data;
				this.sessionID=data.sessionkey;
				this.createstoragedata(this.cookiename,JSON.stringify(data));
			}
			this.recorddocumentclick();
		},
		modifybodyhtml:function(){
			var html='<div id="nistBtn" nist-voice="true"></div><div id="original-content"></div><div id="steps-content" style="display: none;"><div id="voicemodalhtml" nist-voice="true"></div></div>';

			jQuery(document.body).prepend(html);

			if(typeof isvoicesdk === 'undefined') {
				jQuery(window).trigger('resize').promise().done(function () {
					Voicepluginsdk.indexclicknodes();
					Voicepluginsdk.addbuttonhtml();
				});
			} else {
				Voicepluginsdk.indexclicknodes();
				Voicepluginsdk.addbuttonhtml();
			}
			setInterval(function () {
				Voicepluginsdk.indexnewclicknodes();
			},POST_INTERVAL);
		},
		addbuttonhtml:function(){
			jQuery("#nistBtn").unbind("click").html("");
			var buttonhtml='<img src="'+this.extensionpath+'assets/uda-logo.png" width="50px" height="50px" nist-voice="true">';
			var modal =jQuery("#nistBtn");
			modal.append(buttonhtml);
			modal.click(function () {
				Voicepluginsdk.openmodal();
			});
			if(this.rerenderhtml) {
				this.showhtml();
			}
		},
		addvoicesearchmodal:function(addnisticon=true){
			// var recbtn ='	   <button nist-voice="true" id="nistvoicerecbtn" class="voice-record-img"><img nist-voice="true" style="vertical-align:middle" src="'+this.extensionpath+'assets/voice-record.png"> <span nist-voice="true">Rec</span></button>';
			var recbtn ='	   <button nist-voice="true" id="nistvoiceadvbtn" class="voice-record-img"><span nist-voice="true">Advanced</span></button>';

			if(!addnisticon){
				recbtn ='	   <button nist-voice="true" id="nistvoicerecstpbtn" class="voice-record-img"><img nist-voice="true" style="vertical-align:middle" src="'+this.extensionpath+'assets/voice-stop.png"> <span nist-voice="true">Stop</span></button>';
			}
			var html =  '<div class="voice-redmine-rght">'+
						'<div class="">'+
						'	<div class="voice-hng-left"><h3>How Can I Help You Today?</h3></div>'+
						'	<div class="voice-hng-right"><img id="closenistmodal" style="vertical-align:middle;" src="'+this.extensionpath+'assets/voice-close.png"></div>'+
						'   <div class="nist-clear"></div>'+
						'</div>'+
						'	<div class="voice-red-hr-line"></div>'+
						// '	<button class="voice-suggesion-lbl">Create a new issue</button><button class="voice-suggesion-lbl">Assign an issue to Ajay</button><button class="voice-suggesion-lbl">Show list of issues assigned to me</button><br>'+
						'	<div class="voice-srch-bg">'+
						'		<span class="voice-srch"><img src="'+this.extensionpath+'assets/voice-search.png"></span><input type="search" class="voice-srch-fld" nist-voice="true" id="voicesearchinput" placeholder="Search..." />' +
						'       <span id="nist-voice-icon-start" class="voice-voice-srch" nist-voice="true"><img nist-voice="true" src="'+this.extensionpath+'assets/voice-voice.png" /></span>'+
						'       <span style="display:none;" class="voice-voice-srch" id="nist-voice-icon-stop" nist-voice="true"><img src="'+this.extensionpath+'assets/stop.png" nist-voice="true" /></span>' +
						'	</div>'+
								recbtn +
						'<div class="nist-clear"></div>'+
						'   <div id="nistvoicesearchresults"></div>'+
						'</div>';
			jQuery("#voicemodalhtml").html(html);
			jQuery("#closenistmodal").click(function(){
				Voicepluginsdk.closemodal();
			});
			jQuery("#voicesearch").click(function(){
				Voicepluginsdk.searchinelastic();
			});
			jQuery("#voicesearchinput").keydown(function (e) {
				if (e.keyCode === 13) {
					jQuery("#nistvoicesearchresults").html("");
					Voicepluginsdk.searchinelastic();
					return false;
				}
			});
			if(speechrecognitionavailable){
				jQuery("#nist-voice-icon-start").click(function () {
					jQuery("#nistvoicesearchresults").html("");
					Voicepluginsdk.recognition.start();
					jQuery("#nist-voice-icon-start").hide();
					jQuery("#nist-voice-icon-stop").show();
				});
				jQuery("#nist-voice-icon-stop").click(function () {
					Voicepluginsdk.recognition.stop();
					jQuery("#nist-voice-icon-stop").hide();
					jQuery("#nist-voice-icon-start").show();
				});
			} else {
				jQuery("#nist-voice-icon-start").hide();
				jQuery("#nist-voice-icon-stop").hide();
			}
			if(addnisticon) {
				/*jQuery("#nistvoicerecbtn").click(function () {
					Voicepluginsdk.gettimestamp("start");
				});*/
				jQuery("#nistvoiceadvbtn").click(function () {
					Voicepluginsdk.showadvancedhtml();
				});
			} else {
				jQuery("#nistvoicerecstpbtn").click(function () {
					Voicepluginsdk.gettimestamp("stop");
				});
			}
		},
		//opening the UDA screen
		openmodal:function(focus=true){
			if(this.sessiondata.authenticated) {
				jQuery("#nistBtn").hide();
				jQuery('#steps-content').show();
				jQuery("#nistModal").css("display", "block");
				var searchinput=jQuery("#voicesearchinput");
				searchinput.val("");
				if (focus) {
					searchinput.focus();
				}
			} else {
				var sessionevent = new CustomEvent("RequestSessiondata", {detail: {data: "authtenicate"}, bubbles: false, cancelable: false});
				document.dispatchEvent(sessionevent);
			}
		},
		//closing the UDA screen
		closemodal:function(){
			jQuery('#steps-content').hide();
			jQuery("#nistModal").css("display","none");
			jQuery("#nistvoicesearchresults").html("");
			jQuery("#nistrecordresults").html("");
			this.recordedsequenceids=[];
			jQuery("#nistBtn").show();
			var navcookiedata = {shownav: false, data: {}, autoplay:false, pause:false, stop:false, navcompleted:false, navigateddata:[],searchterm:''};
			this.createstoragedata(this.navigationcookiename,JSON.stringify(navcookiedata));
			this.cancelrecordingsequence(false);
		},
		//render the required html for showing up the proper html
		showhtml:function(){
			this.rerenderhtml=false;
			var addnisticon=true;
			var checkrecording = this.getstoragedata(this.recordingcookiename);
			if(checkrecording){
				var checkrecordingdata=JSON.parse(checkrecording);
				if(checkrecordingdata.hasOwnProperty("recording") && checkrecordingdata.recording){
					addnisticon=false;
					this.recording=true;
					this.openmodal();
				}
			}
			if(addnisticon){
				this.addvoicesearchmodal(addnisticon);
				var navigationcookie=this.getstoragedata(this.navigationcookiename);
				if(navigationcookie){
					var navigationcookiedata = JSON.parse(navigationcookie);
					if(navigationcookiedata.shownav) {
						this.openmodal();
						if(navigationcookiedata.autoplay){
							this.autoplay=true;
						}
						this.showselectedrow(navigationcookiedata.data,navigationcookiedata.data.id,true, navigationcookiedata);
					}
				}
			} else {
				this.addvoicesearchmodal(addnisticon);
				this.showrecordedresults();
			}
		},
		// indexing all nodes after all the clicknodes are available
		indexclicknodes: function(){
			this.processcount=clickObjects.length;
			this.previousurl=this.currenturl=window.location.href;
			this.processingnodes=true;
			// indexing method called
			this.indexdom(document.body);
			this.processedclickobjectscount=this.processcount;
			this.totalcount=clickObjects.length;
			this.processingnodes=false;
			if(this.processcount<this.totalcount){
				//	todo refine the processing nodes.
				this.indexnewclicknodes();
				return;
			}
			//send all the indexnodes to server
			if(this.processcount===this.totalcount) {
				// this.sendtoserver();
			}
		},
		// indexing new clicknodes after new html got loaded
		indexnewclicknodes:function(){
			if(this.processingnodes){
				return;
			}
			this.processcount=clickObjects.length;
			if(this.processedclickobjectscount===this.processcount){
				return;
			}
			this.processingnodes=true;
			this.removefromhtmlindex();
			this.indexnewnodes=true;
			this.currenturl=window.location.href;
			this.indexdom(document.body);
			this.processedclickobjectscount=this.processcount;
			this.processingnodes=false;
			this.totalcount=clickObjects.length;
			if(this.processcount<this.totalcount){
				//todo new nodes added need to reprocess
				// this.indexnewclicknodes();
				return;
			}
			// send all the indexed nodes to server
			if(this.processedclickobjectscount===this.totalcount){
				// this.sendtoserver();
			}
		},
		removefromhtmlindex:function(){
			var newhtmlindex=[];
			if(this.htmlindex.length>0){
				for(var htmli=0;htmli<this.htmlindex.length;htmli++){
					var checknode=this.htmlindex[htmli];
					for (var i = 0; i < clickObjects.length; i++) {
						if(clickObjects[i].element === window){
							continue;
						}
						if (checknode['element-data'].isEqualNode(clickObjects[i].element)) {
							newhtmlindex.push(checknode);
						}
					}
				}
				this.htmlindex=[];
				this.htmlindex=newhtmlindex;
			}
		},
		// indexing functionality for the entire dom
		indexdom: function( node, ret=false, parentnode="", textlabel="", hasparentnodeclick=false ) {
			switch (node.nodeType) {
				case Node.ELEMENT_NODE:

					if(!ret && parentnode!=="") {
						node = this.indexnode(node, parentnode);
					}

					if(node.hasChildNodes()){
						var childnodes =  node.childNodes;
						var hasparentclick = false;
						if(node.hasOwnProperty("hasclick")){
							hasparentclick=true;
						}

						if(childnodes.length>0){
							for (var i=0;i<childnodes.length;i++){
								var childnode=childnodes[i];
								this.nodeid++;
								if(this.ignoreelements.indexOf(childnode.nodeName.toLowerCase())===-1) {
									if(ret){
										if(textlabel===""){
											textlabel = this.indexdom(childnode, ret, node, textlabel);
										}else {
											textlabel += " " + this.indexdom(childnode, ret, node, textlabel);
										}
									} else {
										node.childNodes[i] = this.indexdom(childnode, ret, node,"", hasparentclick);
									}
								}
							}
						}
					}
					break;
				case Node.TEXT_NODE:
					if(node.nodeValue!=="") {
						textlabel = node.nodeValue;
					}
					break;
			}

			if(ret && textlabel!==""){
				return textlabel;
			} else if(!ret) {
				return node;
			}
		},
		// Check for each node and then match it with the available clicknodes which are identified by links.js
		indexnode: function(node, parentnode, hasparentnodeclick=false, fromdocumentclick=false){
			var elementdata = {"element-type": "", "element-labels" : [], "element-action" : "", "element-path" : "","element-url":"", "element-data":[],"menu-items":[]};

			if(parentnode.classList && parentnode.classList.contains("tab-content")){
				node.displaytype = "tab-content";
				node.tabid = node.id;
			}

			var clickobjectexists=false;
			var clickobject={};

			if(node.hasAttribute("nist-voice") && node.getAttribute("nist-voice")){
				return node;
			}

			if(this.htmlindex.length>0){
				for(var htmli=0;htmli<this.htmlindex.length;htmli++){
					if(node.isEqualNode(this.htmlindex[htmli]['element-data'])){
						return node;
					}
				}
			}

			for (var i = 0; i < clickObjects.length; i++) {
				if(clickObjects[i].element===window){
					continue;
				}
				if (node.isEqualNode(clickObjects[i].element)) {
					clickobjectexists = true;
					clickobject = clickObjects[i];
				}
			}

			if(node.hasAttribute("type") && node.getAttribute("type") === "hidden"){
				return node;
			}

			if(fromdocumentclick){
				clickobjectexists = true;
				clickobject = node;
			}

			if(clickobjectexists){
				node.hasclick=true;
				elementdata["element-type"] = node.nodeName.toLowerCase();
				elementdata["element-url"] =  window.location.href;

				if(parentnode.classList && parentnode.classList.contains("tab-content")){
					node.displaytype = "tab-content";
				}

				if(elementdata["element-labels"].length===0){
					elementdata["element-labels"] = this.getInputLabels(node,[],1);
				}

				if(elementdata["element-labels"].length===0){
					return node;
				}

				if((node.hasOwnProperty("displaytype") && node.displaytype==="tab-content") || (node.hasOwnProperty("navtype") && node.navtype==="navtab")){
					for(var j=0;j<this.menuitems.length;j++){
						var menuitem=this.menuitems[j];
						if(menuitem.refid === node.tabid) {
							if(menuitem.menunode.hasOwnProperty("path")){
								node.path =  menuitem.menunode.path+">"+menuitem.name;
							}else {
								node.path = menuitem.name;
							}
							if(node.hasOwnProperty("menuitems")){
								node.menuitems.push(menuitem);
							} else {
								node.menuitems=[];
								node.menuitems.push(menuitem);
							}
						}
					}
				}

				if(elementdata["element-path"]==="") {
					if (node.hasOwnProperty("path")) {
						elementdata["element-path"] = node.path;
					}
				}

				if(node.getAttribute("data-toggle") && node.getAttribute("data-toggle")==="tab"){
					node.navtype="navtab";
					elementdata["element-action"] = "navtab";
				}
				elementdata["element-data"] = node;
				elementdata["clickobject"] = clickobject;

				this.htmlindex.push(elementdata);

				// add click to node to send what user has clicked.
				this.addClickToNode(node);
			}

			return node;
		},
		// getting the text for the clicknodes.
		getInputLabels: function(node, inputlabels, iterationno, iterate=true, getchildlabels=true, fromclick=false, iteratelimit=3, ignorenode=[]){

			if(Array.isArray(ignorenode)){
				ignorenode=node;
			}

			if((node.nodeName.toLowerCase() === "select" || node.nodeName.toLowerCase() === "checkbox") && iterate && inputlabels.length===0){
				iterationno++;
				inputlabels = this.getInputLabels(node.parentNode, inputlabels, iterationno, iterate, true, fromclick, iteratelimit, ignorenode);
				if(fromclick) {
					//todo need to rework
				}
			}

			if(getchildlabels && node.childNodes.length>0){
				var childnodes = node.childNodes;
				childnodes.forEach(function (childnode, key) {
					if(childnode.nodeName.toLowerCase()!=="script" || childnode.nodeName.toLowerCase()!=="select") {
						var textcontent = childnode.textContent.replace(/[\n\r]+|[\s]{2,}/g, ' ').trim();
						if (textcontent !== "" && ignorenode.isEqualNode(childnode) === false) {
							inputlabels.push({"text": textcontent, "match": false});
						}
					}
				});
			}

			if(inputlabels.length===0 && node.getAttribute("data-tooltip")){
				inputlabels.push({"text":node.getAttribute("data-tooltip").toString(),"match":false});
			}

			if(inputlabels.length===0 && node.getAttribute("aria-label")){
				inputlabels.push({"text":node.getAttribute("aria-label").toString(),"match":false});
			}

			//todo fix for image tags
			if(iterate && node.nodeName.toLowerCase() !== "img" && inputlabels.length === 0 && iterationno<=iteratelimit){
				iterationno++;
				inputlabels = this.getInputLabels(node.parentNode,[], iterationno, iterate, getchildlabels, fromclick, iteratelimit);
			}

			if(node.nodeName.toLowerCase() === "input" || node.nodeName.toLowerCase() === "textarea" || node.nodeName.toLowerCase() === "img"){

				if(node.getAttribute("placeholder") && node.getAttribute("placeholder")!=="") {
					inputlabels.push({"text":node.getAttribute("placeholder").toString(),"match":false});
				}
				if(node.getAttribute("type") && (node.getAttribute("type")==="submit" || node.getAttribute("type")==="file")) {
					if(node.getAttribute("value")){
						inputlabels.push({"text":node.getAttribute("value").toString(),"match":false});
					}
				}
				if(node.getAttribute("alt")){
					inputlabels.push({"text":node.getAttribute("alt").toString(),"match":false});
				}
			}

			if(inputlabels.length===0 && node.id!==""){
				inputlabels.push({"text":(node.nodeName.toLowerCase()+"-"+node.id),"match":false});
			}

			return inputlabels;
		},
		getsingleinputlabel: function(parentnode, inputlabel){
			var childnodes = parentnode.childNodes;

			childnodes.forEach(function (childnode, key) {
				if(inputlabel === ""){
					inputlabel = childnode.textContent.replace(/[\n\r]+|[\s]{2,}/g, ' ').trim();
				}
			});

			if(inputlabel === ""){
				inputlabel = this.getinputlabel(parentnode.parentNode,"");
			}

			return inputlabel;
		},
		addClickToNode:function(node){
			var nodename=node.nodeName.toLowerCase();
			switch (nodename) {
				case "select":
					jQuery(node).on({"change":function () {
							Voicepluginsdk.recorduserclick(node, false, true);
						},"focus":function(){
							Voicepluginsdk.recorduserclick(node, false,false);
						}
					});
					break;
				case "input":
					if(!node.hasAttribute("type")){
						return;
					}
					var inputtype=node.getAttribute("type").toLowerCase();
					switch (inputtype) {
						case "email":
						case "text":
						case "button":
						case "checkbox":
						case "color":
						case "date":
						case "datetime-local":
						case "file":
						case "hidden":
						case "image":
						case "month":
						case "number":
						case "password":
						case "radio":
						case "range":
						case "reset":
						case "search":
						case "submit":
						case "tel":
						case "text":
						case "time":
						case "url":
						case "week":
							jQuery(node).click(function () {
								Voicepluginsdk.recorduserclick(node, false);
							});
							break;
						default:
							jQuery(node).click(function () {
								Voicepluginsdk.recorduserclick(node, false);
							});
							break;
					}
					break;
				case "mat-select":
					jQuery(node).click(function () {
						Voicepluginsdk.recorduserclick(node, false);
					});
					break;
				default:
					jQuery(node).click(function () {
						Voicepluginsdk.recorduserclick(node, false);
					});
					break;
			}
		},
		//searching all the nodes for the given input
		searchnodes: function(){
			var searchtext = jQuery("#voicesearchinput").val();
			var matchnodes = [];
			if(searchtext !== "" && this.htmlindex.length>0){
				for(var i=0;i<this.htmlindex.length;i++){
					var searchnode = this.htmlindex[i];
					var searchlabelexists=false;
					for(var j=0;j<searchnode['element-labels'].length;j++){
						var label = searchnode['element-labels'][j].text.toString().toLowerCase();
						if(label.indexOf(searchtext.toString().toLowerCase()) !==-1){
							searchlabelexists=true;
							searchnode['element-labels'][j].match=true;
						}
					}
					if(searchlabelexists){
						matchnodes.push(searchnode);
					}
				}
			}
			if(matchnodes.length>0){
				if(matchnodes.length===1){
					this.matchaction(matchnodes[0]);
					return;
				}
				this.rendersearchresults();
				for(var k=0;k<matchnodes.length;k++){
					this.renderresultrow(matchnodes[k],k);
				}
			}
		},
		//render results html
		rendersearchresults:function(){
			var html =  '<table class="nist-voice-search-tb" nist-voice="true">' +
						'  <tbody id="nist-voiceresultrow" nist-voice="true">' +
						'  </tbody>' +
						'</table>';
			jQuery("#nistvoicesearchresults").html(html);
		},
		//render result row html
		renderresultrow:function(data,index){
			var matchindex=0;
			for(var i=0;i<data["element-labels"].length;i++){
				if(data["element-labels"][i].match){
					matchindex=i;
				}
			}
			var html =  '<tr nist-voice="true">' +
						'<td nist-voice="true">' +
						' <h5 nist-voice="true">'+data["element-labels"][matchindex].text.toString()+'</h5>' +
						' <ul class="nistbreadcrumb" id="nistbreadcrumb'+index+'" nist-voice="true">' +
						' </ul>' +
						'</td>' +
						'</tr>';
			var element=jQuery(html);
			element.click(function(){
				Voicepluginsdk.matchaction(data);
			});
			jQuery("#nist-voiceresultrow").append(element);
			if(data['element-path']!==""){
				var paths=data['element-path'].split(">");
				if(paths.length>0){
					for (var i=0;i<paths.length;i++){
						jQuery("#nistbreadcrumb"+index).append(this.renderpathsearch(paths[i]));
					}
				}
			}
		},
		//render path if available
		renderpathsearch:function(data){
			var template = jQuery("<li nist-voice=\"true\"><a nist-voice=\"true\">"+data+"</a></li>");
			return template;
		},
		//matching the action of the node and invoking whether to click or focus
		matchaction:function(data,close=true,selectednode){
			if(close) {
				this.closemodal();
			}
			var node=data["element-data"];
			var timetoinvoke=1000;
			switch (node.nodeName.toLowerCase()) {
				case "input":
					switch (node.getAttribute("type")) {
						case "text":
							node.focus();
							break;
						case "password":
							node.focus();
							break;
						case "text":
							node.focus();
							break;
						case "checkbox":
							node.click();
							break;
						default:
							// node.click();
							node.focus();
					}
					break;
				case "textarea":
					node.focus();
					break;
				case "select":
					var inputlabel=this.getclickedinputlabels(node);
					var labelmatch=false;
					if (inputlabel.toLowerCase() === selectednode.clickednodename.toLowerCase()) {
						labelmatch=true;
						node.focus();
					}
					if(!labelmatch){
						var childnodes=node.childNodes;
						var finalchildnode=null;
						if(childnodes.length>0){
							jQuery(node).find(":selected").attr("selected",null);
							for(var i=0;i<childnodes.length;i++){
								var childnode=childnodes[i];
								var textcontent = childnode.textContent.replace(/[\n\r]+|[\s]{2,}/g, ' ').trim();
								if(textcontent.toLowerCase()===selectednode.clickednodename.toLowerCase()){
									finalchildnode=childnode;
								}
							}
						}
						if(finalchildnode!==null){
							jQuery(finalchildnode).attr("selected","selected");
						}
					}
					break;
				case "option":
					node.parentNode.focus();
					break;
				case "checkbox":
					node.click();
					break;
				default:
					node.click();
			}
			this.invokenextitem(node,timetoinvoke);
		},
		//invoke the click of next item
		invokenextitem:function(node,timetoinvoke){
			var link=false;
			timetoinvoke=timetoinvoke+4000;
			if(node.hasOwnProperty("href")){
				link=true;
			}
			if(!link) {
				setTimeout(function(){Voicepluginsdk.showhtml();}, timetoinvoke);
			}
		},
		//firing an event if event available for the node. Currently not implemented
		eventFire:function(el, etype){
			if (el.fireEvent) {
				el.fireEvent('on' + etype);
			} else {
				var evObj = document.createEvent('Events');
				evObj.initEvent(etype, true, false);
				el.dispatchEvent(evObj);
			}
		},
		//reindex all nodes
		reindexnodes:function(){
			this.indexdom(document.body);
			this.sendtoserver();
		},
		// sending all the indexed nodes to server
		sendtoserver: function(){
			var indexednodes = this.htmlindex;
			var items = [];
			if(indexednodes.length>0){
				for(var i=0;i<indexednodes.length;i++){
					var itemdata = {id:'', textlabels:[], path:'', objectdata:''};
					var indexednode = indexednodes[i];
					itemdata.id = indexednode.clickobject.id;
					if(indexednode["element-labels"].length>0){
						var textlabels=[];
						for(var j=0;j<indexednode["element-labels"].length;j++){
							textlabels.push(indexednode["element-labels"][j].text);
						}
						itemdata.textlabels = textlabels.toString();
					}
					itemdata.path = indexednode["element-path"];
					itemdata.objectdata=JSON.stringify(domJSON.toJSON(indexednode["element-data"]));
					items.push(itemdata);
				}
				var data = {sessionid:this.sessionID,domain:window.location.host,urlpath:window.location.pathname, clickednodename:"", data:JSON.stringify(items)};
				var clickednodenamedata=this.getstoragedata(this.recordclicknodecookiename);
				if(clickednodenamedata){
					data.clickednodename=clickednodenamedata;
				}
				var outputdata = JSON.stringify(data);
				var xhr = new XMLHttpRequest();
				xhr.open("POST", this.apihost+"/clickevents/", true);
				xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
				xhr.onload = function(event){
					if(xhr.status === 200){

					} else {
						console.log(xhr.status+" : "+xhr.statusText);
					}
					Voicepluginsdk.addclickedrecordcookie("");
				};
				xhr.send(outputdata);
			}
		},
		//adding user click to the processing node.
		recorduserclick:function(node, fromdocument=false, selectchange=false){
			if(fromdocument){
				// todo from document click functionality;
			}
			if(node.hasAttribute("nist-voice")){
				return true;
			}
			var processclick=true;
			if(fromdocument && this.htmlindex.length>0){
				for(var i=0;i<this.htmlindex.length;i++){
					var processnode=this.htmlindex[i];
					if(node.isEqualNode(processnode['element-data'])){
						processclick=false;
					}
				}
			}
			if(processclick===false){
				return true;
			}

			if(node.nodeName.toLowerCase()==="input" && node.getAttribute("type")==="radio"){
				var postdata = {
					domain: window.location.host,
					urlpath: window.location.pathname,
					sessionid: this.sessionID,
					clickednodename: "",
					html5: 0,
					clickedpath: "",
					objectdata: ""
				};
				var cache = [];
				var domjson=domJSON.toJSON(node);
				var stringifiednode=JSON.stringify(domjson.node, function(key, value) {
					if (typeof value === 'object' && value !== null) {
						if (cache.indexOf(value) !== -1) {
							// Duplicate reference found, discard key
							return;
						}
						// Store value in our collection
						cache.push(value);
					}
					return value;
				});
				cache = null;
				domjson.node=JSON.parse(stringifiednode);
				postdata.objectdata=JSON.stringify(domjson);
			} else {
				var postdata = {
					domain: window.location.host,
					urlpath: window.location.pathname,
					sessionid: this.sessionID,
					clickednodename: "",
					html5: 0,
					clickedpath: "",
					objectdata: domJSON.toJSON(node, {stringify: true})
				};
			}
			postdata.clickednodename = this.getclickedinputlabels(node,fromdocument,selectchange);
			this.rerenderhtml=true;
			this.addclickedrecordcookie(postdata.clickednodename);
			var outputdata = JSON.stringify(postdata);
			var xhr = new XMLHttpRequest();
			xhr.open("POST", this.apihost+"/user/clickednode");
			xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
			xhr.onload = function(event){
				if(xhr.status === 200){
					// console.log(xhr.response);
				} else {
					console.log(xhr.status+" : "+xhr.statusText);
				}
			};
			xhr.send(outputdata);

			//processing new clicknodes if available after the click action.
			// setTimeout(function (){Voicepluginsdk.indexnewclicknodes();},POST_INTERVAL);

			// rerender html if recording is enabled.
			if(node.nodeName.toLowerCase()!=='select' && this.recording) {
				setTimeout(function () {
					Voicepluginsdk.showhtml();
				}, POST_INTERVAL);
			}
		},
		//getting input label for the clicked node
		getclickedinputlabels:function(node, fromdocument=false, selectchange=false){
			var inputlabels="";
			var nodename=node.nodeName.toLowerCase();
			switch (nodename) {
				case "select":
					if(selectchange) {
						inputlabels = jQuery(node).find(":selected").text();
					} else {
						var textlabels = this.getInputLabels(node, [], 1, true, false, true);
						if (textlabels.length > 0) {
							var labels = [];
							for (var j = 0; j < textlabels.length; j++) {
								labels.push(textlabels[j].text);
							}
							inputlabels = labels.toString();
						}
					}
					break;
				case "input":
					if(!node.hasAttribute("type")){
						var textlabels = this.getInputLabels(node, [], 1, true, true, true);
						if (textlabels.length > 0) {
							var labels = [];
							for (var j = 0; j < textlabels.length; j++) {
								labels.push(textlabels[j].text);
							}
							inputlabels = labels.toString();
						}
					} else {
						switch (node.getAttribute("type").toLowerCase()) {
							default:
								var textlabels = this.getInputLabels(node, [], 1, true, true, true);
								if (textlabels.length > 0) {
									var labels = [];
									for (var j = 0; j < textlabels.length; j++) {
										labels.push(textlabels[j].text);
									}
									inputlabels = labels.toString();
								}
						}
						break;
					}
				case "textarea":
					var textlabels = this.getInputLabels(node, [], 1, true, true, true);
					if (textlabels.length > 0) {
						var labels = [];
						for (var j = 0; j < textlabels.length; j++) {
							labels.push(textlabels[j].text);
						}
						inputlabels = labels.toString();
					}
					break;
				case "img":
					var textlabels = this.getInputLabels(node, [], 1, true, false, true);
					if (textlabels.length > 0) {
						var labels = [];
						for (var j = 0; j < textlabels.length; j++) {
							labels.push(textlabels[j].text);
						}
						inputlabels = labels.toString();
					}
					break;
				default:
					var textlabels = this.getInputLabels(node, [], 1, false, true, true);
					if (textlabels.length > 0) {
						var labels = [];
						for (var j = 0; j < textlabels.length; j++) {
							labels.push(textlabels[j].text);
						}
						inputlabels = labels.toString();
					}
			}
			return inputlabels;
		},
		//record page click todo functionality
		recorddocumentclick:function(){
			jQuery(document).ready(function(){
				document.body.addEventListener('click', function (event) { }, false);
			});
		},
		//adding current timestamp to the required actions under recording functionality
		gettimestamp:function(buttonclicked){
			if(buttonclicked !== "") {
				var result = Date.now();
				if(buttonclicked==="start"){
					this.startrecordingsequence(result);
				} else if(buttonclicked==="stop"){
					this.stoprecordingsequence(result);
				}
			}
		},
		//show recorded results in UDA screen
		showrecordedresults:function(){
			var recordingcookie = this.getstoragedata(this.recordingcookiename);
			var starttime=null;
			var endtime=Date.now();
			if(recordingcookie){
				var recordingcookiedata=JSON.parse(recordingcookie);
				starttime=recordingcookiedata.starttime;
			} else {
				return false;
			}

			jQuery("#nistvoicesearchresults").html("");
			var xhr = new XMLHttpRequest();
			xhr.open("GET", this.apihost+"/clickevents/fetchrecorddata?start="+starttime+"&end="+endtime+"&sessionid="+Voicepluginsdk.sessionID+"&domain="+recordingcookiedata.domain, true);
			xhr.onload = function(event){
				if(xhr.status === 200){
					Voicepluginsdk.addrecordresultshtml(JSON.parse(xhr.response));
				} else {
					console.log(xhr.status+" : "+xhr.statusText);
				}
			};
			xhr.send();
		},
		//start recording the user click to form a sequence
		startrecordingsequence:function(currenttimestamp){
			var recordingcookie = this.getstoragedata(this.recordingcookiename);
			if (recordingcookie) {
				var recordingcookiedata = JSON.parse(recordingcookie);
				recordingcookiedata.starttime = currenttimestamp;
				recordingcookiedata.recording = true;
				recordingcookiedata.endtime = null;
			} else {
				var recordingcookiedata = {recording: true, starttime: currenttimestamp, endtime: null};
			}
			recordingcookiedata.domain = window.location.host;
			this.createstoragedata(this.recordingcookiename,JSON.stringify(recordingcookiedata));
			this.showhtml();

			//add analtytics
			this.recordclick('recordingstart',recordingcookiedata.domain);
		},
		//stop recording sequence that has been started and show recorded results
		stoprecordingsequence:function(currenttimestamp){
			var recordingcookie = this.getstoragedata(this.recordingcookiename);
			if(recordingcookie){
				var recordingcookiedata=JSON.parse(recordingcookie);
				recordingcookiedata.endtime=currenttimestamp;
				recordingcookiedata.recording=false;
			} else {
				return false;
			}
			this.createstoragedata(this.recordingcookiename,JSON.stringify(recordingcookiedata));

			//add analtytics
			this.recordclick('recordingstop',recordingcookiedata.domain);

			this.showhtml();
			jQuery("#nistvoicesearchresults").html("");
			var xhr = new XMLHttpRequest();
			xhr.open("GET", this.apihost+"/clickevents/fetchrecorddata?start="+recordingcookiedata.starttime+"&end="+recordingcookiedata.endtime+"&sessionid="+Voicepluginsdk.sessionID+"&domain="+recordingcookiedata.domain, true);
			xhr.onload = function(event){
				if(xhr.status === 200){
					Voicepluginsdk.addrecordresultshtml(JSON.parse(xhr.response));
				} else {
					console.log(xhr.status+" : "+xhr.statusText);
				}
			};
			xhr.send();
		},
		//cancel the recording sequence
		cancelrecordingsequence:function(render=true){
			var recordingcookie = this.getstoragedata(this.recordingcookiename);
			if(recordingcookie){
				var recordingcookiedata=JSON.parse(recordingcookie);
				recordingcookiedata.endtime=Date.now();
				recordingcookiedata.recording=false;
			} else {
				return false;
			}
			this.createstoragedata(this.recordingcookiename,JSON.stringify(recordingcookiedata));
			var navcookiedata = {shownav: false, data: {}, autoplay:false, pause:false, stop:false, navcompleted:false, navigateddata:[],searchterm:''};
			this.createstoragedata(this.navigationcookiename,JSON.stringify(navcookiedata));

			//add analtytics
			this.recordclick('recordingcancel',recordingcookiedata.domain);

			if(render) {
				this.showhtml();
			}
		},
		//show sequence list html
		addrecordresultshtml:function(data){
			if(data.length>0) {
				this.recordedsequenceids=data;
				var html =  '   <div class="voice-suggesion-card">'+
							'		<div class="voice-card-left">'+
							'			<h4>Recorded Sequence</h4>'+
							'			<ul id="nist-recordresultrow" class="voice-sugggesion-bullet">'+
							'			</ul>'+
							'			<div>'+
							'				<input id="nistsequencelabel" type="text" name="save-recrded" class="voice-save-recrded-inpt" placeholder="Enter label" nist-voice="true">'+
							'				<button class="voice-cancel-btn" onclick="Voicepluginsdk.cancelrecordingsequence();">Cancel and exit</button> <button onclick="Voicepluginsdk.submitrecordedlabel();" class="voice-submit-btn">Submit</button>'+
							'			</div>'+
							'		</div>'+
							'	</div>';
				jQuery("#nistvoicesearchresults").html(html);
				for(var i=0;i<data.length;i++){
					this.renderrecordresultrow(data[i],i);
				}
				this.openmodal(false);
			}
		},
		//render record row html of the sequence
		renderrecordresultrow:function(data,index){
			index++;
			var html =  '<li nist-voice="true" class="active">' +
							data.clickednodename +
						'</li>';
			var element=jQuery(html);
			jQuery("#nist-recordresultrow").append(element);
		},
		// submit functionality of the recorded sequence.
		submitrecordedlabel:function(submittype="recording"){
			var sequencename=jQuery("#nistsequencelabel").val();
			var sequencelistdata={name:"",domain:window.location.host,usersessionid:this.sessiondata.authdata.id.toString(),userclicknodelist:[].toString(),userclicknodesSet:this.recordedsequenceids,isValid:1,isIgnored:0};
			if(submittype==='recording') {
				if (sequencename === '') {
					alert('Please enter proper label');
					jQuery("#nistsequencelabel").focus();
					return false;
				}
			} else if(submittype === 'invalid'){
				if(sequencename===''){
					sequencename="Declared as not valid sequence by user";
				}
				sequencelistdata.isValid=0;
			} else if(submittype === 'ignore'){
				if(sequencename===''){
					sequencename="Ignored by user";
				}
				sequencelistdata.isValid=0;
				sequencelistdata.isIgnored=1;
			}
			var sequenceids = [];
			for(var i=0;i<this.recordedsequenceids.length;i++){
				sequenceids.push(this.recordedsequenceids[i].id);
			}
			sequencelistdata.name=sequencename;
			sequencelistdata.userclicknodelist=sequenceids.toString();
			// var sequencelistdata={name:sequencename,domain:window.location.host,usersessionid:this.sessionID,userclicknodelist:sequenceids.toString(),userclicknodesSet:this.recordedsequenceids};
			console.log(sequencelistdata);
			this.cancelrecordingsequence(true);
			var xhr = new XMLHttpRequest();
			xhr.open("POST", this.apihost + "/clickevents/recordsequencedata", true);
			xhr.setRequestHeader('Content-Type', 'application/json');
			xhr.onload = function(event){
				if(xhr.status === 200){
					Voicepluginsdk.backtomodal();
				} else {
					console.log(xhr.status+" : "+xhr.statusText);
				}
			};
			xhr.send(JSON.stringify(sequencelistdata));
		},
		// adding the last clicked record to the storage
		addclickedrecordcookie:function(clickednodename){
			this.createstoragedata(this.recordclicknodecookiename,clickednodename);
		},
		// search from elastic functionality
		searchinelastic:function(searchterm=''){
			if(searchterm) {
				var searchtext = searchterm;
			} else {
				var searchtext = jQuery("#voicesearchinput").val();
			}
			this.cancelrecordingsequence(false);

			//add analtytics
			this.recordclick('search',searchtext);

			var xhr = new XMLHttpRequest();
			xhr.open("GET", this.apihost + "/clickevents/sequence/search?query="+searchtext+"&domain="+encodeURI(window.location.host), true);
			xhr.onload = function(event){
				if(xhr.status === 200){
					Voicepluginsdk.renderelasticresults(JSON.parse(xhr.response));
				} else {
					console.log(xhr.status+" : "+xhr.statusText);
				}
			};
			xhr.send();
		},
		//rendering search results screen
		renderelasticresults:function(data){
			var matchnodes = data;
			if(matchnodes.length>0){
				jQuery("#nistvoicesearchresults").html('');
				for(var k=0;k<matchnodes.length;k++){
					if(matchnodes[k].hasOwnProperty("deleted") && matchnodes[k].deleted===0) {
						this.renderelasticresultrow(matchnodes[k], k);
					} else if(!matchnodes[k].hasOwnProperty("deleted")) {
						this.renderelasticresultrow(matchnodes[k], k);
					}
				}
			}
		},
		//rendering each row html of the search result
		renderelasticresultrow:function(data){
			var path='';
			for(var i=0;i<data.userclicknodesSet.length;i++){
				if(path!==''){
					path +=' > ';
				}
				path += data.userclicknodesSet[i].clickednodename;
			}
			var html=   '	<div nist-voice="true" class="voice-sugtns-list"><h4><a>'+data.name.toString()+'</a></h4>'+
						'		<p>'+path+'</p>'+
						'	</div>';
			var element=jQuery(html);
			element.click(function () {
				Voicepluginsdk.elasticresultaction(data);
			});
			jQuery("#nistvoicesearchresults").append(element);
		},
		//selected search result functionality
		elasticresultaction:function(data){
			var navcookiedata = {shownav: true, data: data, autoplay:false, pause:false, stop:false, navcompleted:false, navigateddata:[],searchterm:''};
			navcookiedata.searchterm=jQuery("#voicesearchinput").val();
			this.createstoragedata(this.navigationcookiename,JSON.stringify(navcookiedata));
			this.showselectedrow(data,data.id,true, navcookiedata);
			//add analtytics
			this.recordclick('sequencerecord',data.name.toString(),data.id);
		},
		//showing the selected search result screen functionality
		showselectedrow:function(data,index,shownodelist=false, navcookiedata={}){
			if(shownodelist && navcookiedata.data.userclicknodesSet.length===navcookiedata.navigateddata.length){
				navcookiedata.navcompleted=true;
			}
			var playiconhtml =  '<div class="voice-autoplay-stop">';
								// '	<span><img nist-voice="true" id="nist-autoplay" src="' + this.extensionpath + 'assets/voice-pause.png"></span>'+

			if(shownodelist) {
				if (navcookiedata.navcompleted) {
					playiconhtml += '	<span><img nist-voice="true" id="nist-autoplay" src="' + this.extensionpath + 'assets/voice-play.png"></span>'+
									'   <span><img nist-voice="true" src="' + this.extensionpath + 'assets/voice-stop-disable.png"></span>';
				} else {
					if(navcookiedata.autoplay) {
						playiconhtml += '	<span><img nist-voice="true" src="' + this.extensionpath + 'assets/voice-play-disable.png"></span>'+
										'	<span><img nist-voice="true" id="nist-autoplay" src="' + this.extensionpath + 'assets/voice-stop.png"></span>';
					} else {
						playiconhtml += '	<span><img nist-voice="true" id="nist-autoplay" src="' + this.extensionpath + 'assets/voice-play.png"></span>'+
										'   <span><img nist-voice="true" src="' + this.extensionpath + 'assets/voice-stop-disable.png"></span>';
					}

				}
			}
			playiconhtml   +=   '</div>';
			var html =  '<div class="voice-suggesion-card">'+
						'	<div class="voice-card-left">'+
						'		<div class="voice-back-btn"><img nist-voice="true" id="backtosearch" src="'+this.extensionpath+'assets/voice-back.png"></div>'+
						'       <div class="voice-feedback-btns">' +
						'		    <img nist-voice="true" id="nist-upvote" class="voice-like-violet" src="'+this.extensionpath+'assets/voice-like.png">'+
						'		    <img nist-voice="true" id="nist-downvote" class="voice-dislike-violet" src="'+this.extensionpath+'assets/voice-dislike.png">'+
						'		    <img nist-voice="true" id="deletesequence" class="voice-delete-violet" src="'+this.extensionpath+'assets/voice-delete.png">'+
						'       </div>'+
						'		<h4>'+data.name.toString()+'</h4>'+
						'		<ul class="voice-sugggesion-bullet" id="nistvoicesteps">'+
						'		</ul>'+
						'	</div>'+
						'   <div class="nist-clear"></div>'+
						'</div>'+
						playiconhtml;
			var element=jQuery(html);
			jQuery("#nistvoicesearchresults").html(element);
			var performactionnode=false;
			for(var i=0;i<data.userclicknodesSet.length;i++){
				var visited = -1;
				if(navcookiedata.navigateddata.length>0) {
					visited = this.inarray(data.userclicknodesSet[i].id, navcookiedata.navigateddata);
				}
				if(navcookiedata.autoplay && (!navcookiedata.pause || !navcookiedata.stop)){
					if(visited===-1 && !performactionnode){
						performactionnode=data.userclicknodesSet[i];
					}
				}
				jQuery("#nistvoicesteps").append(this.rendersteps(data.userclicknodesSet[i],visited,navcookiedata));
			}

			if(this.sessionID===data.usersessionid || this.sessiondata.authdata.id===data.usersessionid){
				jQuery("#deletesequence").click(function () {
					Voicepluginsdk.deletesequencelist(data);
				});
			} else {
				jQuery("#deletesequence").hide();
			}

			jQuery('#nist-upvote').click(function () {
				Voicepluginsdk.addvote("up",data);
			});
			jQuery('#nist-downvote').click(function () {
				Voicepluginsdk.addvote("down",data);
			});

			jQuery("#nist-autoplay").click(function () {
				Voicepluginsdk.toggleautoplay(navcookiedata);
			});

			// need to improve the autoplay functionality.
			if(typeof performactionnode=="object" && this.autoplay) {
				this.performclickaction(performactionnode,navcookiedata);
			} else if(this.autoplay){
				this.toggleautoplay(navcookiedata);
			}
			jQuery("#backtosearch").click(function () {
				Voicepluginsdk.backtosearchresults(navcookiedata);
			});
		},
		//showing the sequence steps html
		rendersteps:function(data,visited=false, navcookiedata={}){
			if(visited>-1) {
				var template = jQuery("<li nist-voice=\"true\" class='active'>" + data.clickednodename + "</li>");
			} else {
				var template = jQuery("<li nist-voice=\"true\" class=''>" + data.clickednodename + "</li>");
			}
			if(visited===-1) {
				template.click(function () {
					Voicepluginsdk.performclickaction(data,navcookiedata);
				});
			}
			return template;
		},
		//perform click action of the sequence steps
		performclickaction:function(selectednode,navcookiedata){
			var matchnodes = [];
			if(selectednode.objectdata) {
				var originalnode=JSON.parse(selectednode.objectdata);
				if(selectednode && this.htmlindex.length>0){
					for(var i=0;i<this.htmlindex.length;i++){
						var searchnode = this.htmlindex[i];
						var searchlabelexists=false;
						var comparenode=domJSON.toJSON(searchnode["element-data"]);
						var match=this.comparenodes(comparenode.node,originalnode.node);

						if((match.matched+26)>=match.count){
							searchlabelexists=true;
						}

						if(searchlabelexists){
							var matchnodeexists=false;

							if(matchnodes.length>0){
								for(var j=0;j<matchnodes.length;j++){
									if(matchnodes[j]["element-data"].isEqualNode(searchnode["element-data"])){
										matchnodeexists=true;
									}
								}
							}

							if(matchnodeexists===false) {
								matchnodes.push(searchnode);
							}
						}
					}
				}
			}

			if(matchnodes.length === 1){
				if(this.updatenavcookiedata(navcookiedata,selectednode.id)){
					this.matchaction(matchnodes[0],false,selectednode);
				}
				return;
			} else if(matchnodes.length>1) {
				//todo need to perform some user intervention
				var finalmatchnode={};
				matchnodes.forEach(function (matchnode, matchnodeindex) {
					if(matchnode.hasOwnProperty("element-data")) {
						var inputlabels = Voicepluginsdk.getclickedinputlabels(matchnode["element-data"]);
						if (inputlabels === selectednode.clickednodename) {
							finalmatchnode = matchnode;
						}
					}
				});

				if(finalmatchnode.hasOwnProperty("element-data")) {
					if(this.updatenavcookiedata(navcookiedata,selectednode.id)) {
						this.matchaction(finalmatchnode, false, selectednode);
					}
				}
				return;
			} else {
				alert("Unable to find the action");
			}
		},
		//comparing nodes of indexed and the sequence step selected
		comparenodes:function(comparenode,originalnode,match={count:0,matched:0}){
			for(var key in originalnode){
				if(key==="className" || key==='class'){
					continue;
				}
				match.count++;
				if(comparenode.hasOwnProperty(key) && (typeof originalnode[key] === 'object') && (typeof comparenode[key] === 'object')){
					match.matched++
					match=this.comparenodes(comparenode[key], originalnode[key],match);
				} else if(comparenode.hasOwnProperty(key) && Array.isArray(originalnode[key]) && originalnode[key].length>0 && Array.isArray(comparenode[key]) && comparenode[key].length>0){
					match.matched++;
					if(comparenode[key].length===originalnode[key].length) {
						for (var i = 0; i < originalnode[key].length; i++) {
							match=this.comparenodes(comparenode[key][i], originalnode[key][i],match);
						}
					}
				} else if(comparenode.hasOwnProperty(key) && comparenode[key]===originalnode[key]){
					match.matched++;
				}
			}
			return match;
		},
		//adding data to the storage
		createstoragedata:function(key,value){
			try {
				window.localStorage.setItem(key, value);
				return true;
			} catch (e) {
				console.log(e);
				return false;
			}
		},
		//getting the data from the storage
		getstoragedata:function(key){
			try {
				var result=window.localStorage.getItem(key);
				return result;
			} catch (e) {
				console.log(e);
				return false;
			}
		},
		//delete sequence list functionality for the owner
		deletesequencelist:function(data){
			var confirmdialog=confirm("Are you sure want to delete "+data.name);
			if(confirmdialog === true){
				Voicepluginsdk.confirmdelete(data);
			}
		},
		//confirmation for the deletion of the sequence list
		confirmdelete:function (data) {
			// var senddata=JSON.stringify({usersessionid:this.sessionID,id:data.id});
			var senddata=JSON.stringify({usersessionid:this.sessiondata.authdata.id,id:data.id});
			var xhr = new XMLHttpRequest();
			xhr.open("POST", this.apihost + "/clickevents/sequence/delete", true);
			xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
			xhr.onload = function(event){
				if(xhr.status === 200){
					Voicepluginsdk.closemodal();
				} else {
					console.log(xhr.status+" : "+xhr.statusText);
				}
			};
			xhr.send(senddata);
		},
		//adding vote functionality
		addvote:function(votetype,data){
			var senddata={"usersessionid": this.sessionID, "sequenceid" : data.id, "upvote":0, "downvote":0};
			if(votetype==="up"){
				senddata.upvote=1;
			} else if(votetype==="down"){
				senddata.downvote=1;
			}
			var xhr = new XMLHttpRequest();
			xhr.open("POST", this.apihost + "/clickevents/sequence/addvote", true);
			xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
			xhr.onload = function(event){
				if(xhr.status === 200){
					// console.log(xhr.response);
				} else {
					console.log(xhr.status+" : "+xhr.statusText);
				}
			};
			xhr.send(JSON.stringify(senddata));
		},
		//autoplay functionality to stop and play
		toggleautoplay:function(navcookiedata){
			if(navcookiedata.autoplay){
				navcookiedata.autoplay=false;
				this.autoplay=false;
				//add analtytics
				this.recordclick('stop',navcookiedata.data.name.toString(),navcookiedata.data.id);
			} else {
				navcookiedata.autoplay=true;
				this.autoplay=true;
				//add analtytics
				this.recordclick('play',navcookiedata.data.name.toString(),navcookiedata.data.id);
			}

			this.createstoragedata(this.navigationcookiename,JSON.stringify(navcookiedata));
			this.showselectedrow(navcookiedata.data,navcookiedata.data.id,true, navcookiedata);
		},
		//updating the navigated data
		updatenavcookiedata:function(navcookiedata,selectednodeid){
			navcookiedata.navigateddata.push(selectednodeid);
			return this.createstoragedata(this.navigationcookiename,JSON.stringify(navcookiedata));
		},
		//back to search results functionality
		backtosearchresults:function (navcookiedata) {
			if(navcookiedata.searchterm!==''){
				var navcookiedata1 = {shownav: false, data: {}, autoplay:false, pause:false, stop:false, navcompleted:false, navigateddata:[],searchterm:navcookiedata.searchterm};
			} else {
				var navcookiedata1 = {shownav: false, data: {}, autoplay:false, pause:false, stop:false, navcompleted:false, navigateddata:[],searchterm:""};
			}
			this.createstoragedata(this.navigationcookiename,JSON.stringify(navcookiedata1));
			this.autoplay=false;
			jQuery("#voicesearchinput").val(navcookiedata.searchterm);

			//add analtytics
			this.recordclick('back',navcookiedata.data.name.toString(),navcookiedata.data.id);

			this.searchinelastic(navcookiedata.searchterm);
		},
		recordclick:function (clicktype='sequencerecord',clickedname='',recordid=0) {
			var senddata={usersessionid:this.sessionID,clicktype:clicktype,clickedname:clickedname,recordid:recordid};
			var xhr = new XMLHttpRequest();
			xhr.open("PUT", this.apihost + "/clickevents/userclick", true);
			xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
			xhr.onload = function(event){
				if(xhr.status === 200){
					// console.log(xhr.response);
				} else {
					console.log(xhr.status+" : "+xhr.statusText);
				}
			};
			xhr.send(JSON.stringify(senddata));
		},
		showadvancedhtml:function(){
			jQuery("#nistvoiceadvbtn").hide();
			jQuery("#nistvoicesearchresults").html('');
			var html=   '<div class="voice-modalback-btn"><img nist-voice="true" id="nistvoiceback" src="'+this.extensionpath+'assets/voice-back.png"></div><br />'+
						'<div class="nist-clear"></div>'+
						'   <div class="voice-suggesion-card">' +
						'		<div class="voice-card-left">' +
						'			<h4 class="voice-card-noborder">Create your own action <button nist-voice="true" id="nistvoicerecbtn" class="voice-modal-btn"><img nist-voice="true" style="vertical-align:middle" src="'+this.extensionpath+'assets/voice-record.png"> <span nist-voice="true">Rec</span></button></h4>' +
						'       </div>'+
						'   </div>';
						// '<div class="name-heading"><h2 nist-voice="true">Create your own action <button nist-voice="true" id="nistvoicerecbtn" class="voice-record-img"><img nist-voice="true" style="vertical-align:middle" src="'+this.extensionpath+'assets/voice-record.png"> <span nist-voice="true">Rec</span></button></h2><br /></div>';
			jQuery("#nistvoicesearchresults").append(html);
			jQuery("#nistvoicerecbtn").click(function () {
				Voicepluginsdk.gettimestamp("start");
			});
			jQuery("#nistvoiceback").click(function () {
				Voicepluginsdk.backtomodal();
			});
			var xhr = new XMLHttpRequest();
			xhr.open("GET", this.apihost + "/clickevents/suggested?domain="+encodeURI(window.location.host), true);
			xhr.onload = function(event){
				if(xhr.status === 200){
					Voicepluginsdk.showsuggestedhtml(JSON.parse(xhr.response));
				} else {
					console.log(xhr.status+" : "+xhr.statusText);
				}
			};
			xhr.send();
		},
		showsuggestedhtml:function(data){
			if(data.length>0) {
				this.recordedsequenceids = data;
				var html = '   <div class="voice-suggesion-card">' +
					'		<div class="voice-card-left">' +
					'			<h4>Our AI detected this sequence. <br /> Do you want to name it? <br /><span style="color:#ff4800;font-weight:bold;">(Alpha version: Not reliable)</span></h4>' +
					'			<ul id="nist-recordresultrow" class="voice-sugggesion-bullet">' +
					'			</ul>' +
					'			<div>' +
					'				<input id="nistsequencelabel" type="text" name="save-recrded" class="voice-save-recrded-inpt" placeholder="Enter label" nist-voice="true">' +
					'				<button onclick="Voicepluginsdk.submitrecordedlabel(\'recording\');" class="voice-submit-btn">Submit</button><button class="voice-cancel-btn" onclick="Voicepluginsdk.submitrecordedlabel(\'invalid\');">Invalid Sequence</button><button class="voice-cancel-btn" onclick="Voicepluginsdk.submitrecordedlabel(\'ignore\');">Ignore</button>' +
					'			</div>' +
					'		</div>' +
					'	</div>';

				jQuery("#nistvoicesearchresults").append(html);
				for (var i = 0; i < data.length; i++) {
					this.renderrecordresultrow(data[i], i);
				}
			}
		},
		backtomodal:function(){
			jQuery("#nistvoiceadvbtn").show();
			jQuery("#nistvoicesearchresults").html('');
		}
	};
	Voicepluginsdk.init();
} else {
	// this script has already been loaded
}

/**
 * Protect window.console method calls, e.g. console is not defined on IE
 * unless dev tools are open, and IE doesn't define console.debug
 */
(function() {
	if (!window.console) {
		window.console = {};
	}
	// union of Chrome, FF, IE, and Safari console methods
	var m = [
		"log", "info", "warn", "error", "debug", "trace", "dir", "group",
		"groupCollapsed", "groupEnd", "time", "timeEnd", "profile", "profileEnd",
		"dirxml", "assert", "count", "markTimeline", "timeStamp", "clear"
		];
	// define undefined methods as to prevent errors
	for (var i = 0; i < m.length; i++) {
		if (!window.console[m[i]]) {
			window.console[m[i]] = function() {};
		}    
	} 
})();