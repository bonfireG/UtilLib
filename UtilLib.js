(function(global) {
	"use strict";

	/**
	 * @namespace bonfireG
	 */
	var bonfireG = global.bonfireG || {};

	/**
	 * 1. Core: 기본 설정 및 로그
	 */
	bonfireG.Core = {
		debug: true,
		log: function(message) {
			if (this.debug && global.console) {
				console.log("[bonfireG] " + message);
			}
		}
	};

	/**
	 * 2. Validator: 유효성 검사
	 */
	bonfireG.Validator = {
		isEmpty: function(val) {
			return (val == null || String(val).replace(/\s/g, "") === "");
		},
		isNumber: function(val) {
			return /^[0-9]+$/.test(val);
		},
		isEmail: function(val) {
			return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val);
		}
	};

	/**
	 * 3. Formatter: 데이터 포맷 변환
	 */
	bonfireG.Formatter = {
		comma: function(val) {
			if (bonfireG.Validator.isEmpty(val)) return "0";
			return String(val).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		},
		uncomma: function(val) {
			return String(val).replace(/,/g, "");
		},
		phoneNumber: function(val) {
			if (!val) return "";
			var str = String(val).replace(/[^0-9]/g, "");
			if (str.length === 11) {
				return str.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
			} else if (str.length === 8) {
				return str.replace(/(\d{4})(\d{4})/, "$1-$2");
			} else if (str.indexOf("02") === 0) {
				return str.replace(/(\d{2})(\d{3,4})(\d{4})/, "$1-$2-$3");
			} else {
				return str.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3");
			}
		}
	};

	/**
	 * 4. UI: UI 이벤트 관련
	 */
	bonfireG.UI = {
		addEnterEvent: function(inputId, buttonId) {
			var input = document.getElementById(inputId);
			if (input) {
				input.addEventListener("keyup", function(e) {
					if (e.keyCode === 13) {
						e.preventDefault();
						document.getElementById(buttonId).click();
					}
				});
			}
		},
		// [NEW] 이미지 새로고침 (캐시 방지)
		refreshImage: function(id, url) {
			var img = document.getElementById(id);
			if (!img) return;
			var targetUrl = url ? url : img.src.split('?')[0];
			img.src = targetUrl + "?t=" + new Date().getTime();
		}
	};

	/**
	 * 5. Ajax: 비동기 통신 (최종 개선판)
	 * - upload 지원
	 * - async, useLoader, autoHide 옵션 지원
	 * - requestAnimationFrame으로 렌더링 후 로딩바 종료
	 */
	bonfireG.Ajax = {
		_serialize: function(obj) {
			var str = [];
			for (var p in obj) {
				if (obj.hasOwnProperty(p)) {
					str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
				}
			}
			return str.join("&");
		},
		
		/**
		 * @param options { useLoader: boolean, async: boolean, autoHide: boolean, beforeSend: function, complete: function }
		 */
		_request: function(method, url, data, contentType, successCallback, errorCallback, options) {
			var xhr = new XMLHttpRequest();
			var payload = null;
			
			options = options || {};
			var useLoader = (options.useLoader !== false); // 기본값 true
			var isAsync = (options.async !== false);       // 기본값 true
			var autoHide = (options.autoHide !== false);   // 기본값 true

			if (typeof options.beforeSend === "function") options.beforeSend();
			
			// 로딩바 표시
			if (useLoader && bonfireG.Loading) bonfireG.Loading.show();

			if (method === "GET" && data) {
				var queryString = this._serialize(data);
				url += (url.indexOf("?") === -1 ? "?" : "&") + queryString;
			}

			xhr.open(method, url, isAsync);
			xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

			var csrfToken = document.querySelector("meta[name='_csrf']");
			var csrfHeader = document.querySelector("meta[name='_csrf_header']");
			if (csrfToken && csrfHeader) {
				xhr.setRequestHeader(csrfHeader.getAttribute("content"), csrfToken.getAttribute("content"));
			}

			if (method === "POST") {
				if (contentType === "FORM") {
					xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
					payload = this._serialize(data);
				} 
				else if (contentType === "UPLOAD") {
					// 파일 업로드 시 Content-Type 헤더 생략 (브라우저 자동 설정)
					payload = data; 
				} 
				else {
					xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
					payload = JSON.stringify(data);
				}
			}

			xhr.onreadystatechange = function() {
				if (xhr.readyState === 4) {
					try {
						if (xhr.status >= 200 && xhr.status < 300) {
							if (typeof successCallback === "function") {
								var response = xhr.responseText;
								try { response = JSON.parse(response); } catch (e) {}
								// 성공 콜백 실행 (화면 그리기 등)
								successCallback(response);
							}
						} else {
							if (typeof errorCallback === "function") {
								errorCallback(xhr.status, xhr.statusText);
							} else {
								console.error("AJAX Error: " + xhr.status);
							}
						}
					} catch (e) {
						console.error("Callback Error:", e);
					} finally {
						// 화면 렌더링 완료 감지 후 로딩바 종료 (requestAnimationFrame 사용)
						if (useLoader && bonfireG.Loading && autoHide) {
							requestAnimationFrame(function() {
								requestAnimationFrame(function() {
									bonfireG.Loading.hide();
								});
							});
						}
						
						if (typeof options.complete === "function") options.complete();
					}
				}
			};
			xhr.send(payload);
		},

		get: function(url, data, successCallback, errorCallback, options) {
			this._request("GET", url, data, null, successCallback, errorCallback, options);
		},
		post: function(url, data, successCallback, errorCallback, options) {
			this._request("POST", url, data, "JSON", successCallback, errorCallback, options);
		},
		postForm: function(url, data, successCallback, errorCallback, options) {
			this._request("POST", url, data, "FORM", successCallback, errorCallback, options);
		},
		// 파일 업로드용 (formData 필수)
		upload: function(url, formData, successCallback, errorCallback, options) {
			this._request("POST", url, formData, "UPLOAD", successCallback, errorCallback, options);
		}
	};

	/**
     * 6. Page: 페이지 이동 및 제어
     * - 이동 시 로딩바 표시 기능 추가됨
     */
	bonfireG.Page = {
		move: function(url) {
			if (bonfireG.Validator.isEmpty(url)) return;
			if (bonfireG.Loading) bonfireG.Loading.show(); // 페이지 이동 시 로딩바
			window.location.href = url;
		},
		// 동적 폼 생성 및 POST 전송
		submit: function(url, params) {
			if (bonfireG.Validator.isEmpty(url)) return;
			if (bonfireG.Loading) bonfireG.Loading.show(); // submit 시 로딩바
			
			var form = document.createElement("form");
			form.setAttribute("method", "post");
			form.setAttribute("action", url);
			
			if (params && typeof params === 'object') {
				for (var key in params) {
					if (params.hasOwnProperty(key)) {
						var hiddenField = document.createElement("input");
						hiddenField.setAttribute("type", "hidden");
						hiddenField.setAttribute("name", key);
						hiddenField.setAttribute("value", params[key]);
						form.appendChild(hiddenField);
					}
				}
			}

			document.body.appendChild(form);
			form.submit();
			document.body.removeChild(form);
		},
		open: function(url) {
			if (bonfireG.Validator.isEmpty(url)) return;
			window.open(url, '_blank');
		},
		reload: function() {
			if (bonfireG.Loading) bonfireG.Loading.show();
			window.location.reload();
		},
		back: function() {
			window.history.back();
		}
	};

	/**
	 * 7. Loading: 로딩 오버레이
	 */
	bonfireG.Loading = {
		_id: "bonfire-loading-overlay",
		
		_injectCSS: function() {
			if (document.getElementById("bonfire-loading-style")) return;
			var css = "" +
				".bonfire-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); z-index: 9999; display: none; justify-content: center; align-items: center; }" +
				".bonfire-spinner { width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; }" +
				"@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }";
			
			var style = document.createElement('style');
			style.id = "bonfire-loading-style";
			style.type = 'text/css';
			if (style.styleSheet) { style.styleSheet.cssText = css; }
			else { style.appendChild(document.createTextNode(css)); }
			document.getElementsByTagName('head')[0].appendChild(style);
		},
		
		_createHTML: function() {
			if (document.getElementById(this._id)) return;
			
			var overlay = document.createElement('div');
			overlay.id = this._id;
			overlay.className = "bonfire-overlay";
			overlay.innerHTML = '<div class="bonfire-spinner"></div>';
			document.body.appendChild(overlay);
		},

		show: function() {
			this._injectCSS();
			this._createHTML();
			document.getElementById(this._id).style.display = "flex";
		},

		hide: function() {
			var el = document.getElementById(this._id);
			if (el) el.style.display = "none";
		}
	};
	
	/**
	 * 8. Date: 날짜 관련 처리
	 */
	bonfireG.Date = {
		getDateTime: function(dt) {
			var date = (dt) ? new Date(dt) : new Date();
			
			if (isNaN(date.getTime())) return "";
			var year = date.getFullYear().toString();
			var month = date.getMonth() + 1;
			month = month < 10 ? '0' + month.toString() : month.toString();
			var day = date.getDate();
			day = day < 10 ? '0' + day.toString() : day.toString();
			var hour = date.getHours();
			hour = hour < 10 ? '0' + hour.toString() : hour.toString();
			var minutes = date.getMinutes();
			minutes = minutes < 10 ? '0' + minutes.toString() : minutes.toString();
			var seconds = date.getSeconds();
			seconds = seconds < 10 ? '0' + seconds.toString() : seconds.toString();
			return year + "-" + month + "-" + day + " " + hour + ":" + minutes + ":" + seconds;
		},
		getToday: function(dt) {
			var fullStr = this.getDateTime(dt);
			return fullStr.substring(0, 10);
		}
	};
	
	/**
	 * 9. Storage: 쿠키 및 로컬스토리지 제어
	 */
	bonfireG.Storage = {
		setCookie: function(name, value, days) {
			var expires = "";
			if (days) {
				var date = new Date();
				date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
				expires = "; expires=" + date.toUTCString();
			}
			document.cookie = name + "=" + (value || "") + expires + "; path=/";
		},
		getCookie: function(name) {
			var nameEQ = name + "=";
			var ca = document.cookie.split(';');
			for (var i = 0; i < ca.length; i++) {
				var c = ca[i];
				while (c.charAt(0) === ' ') c = c.substring(1, c.length);
				if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
			}
			return null;
		},
		deleteCookie: function(name) {
			document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
		},
		setLocal: function(key, value) {
			if(!window.localStorage) return;
			var val = (typeof value === 'object') ? JSON.stringify(value) : value;
			window.localStorage.setItem(key, val);
		},
		getLocal: function(key) {
			if(!window.localStorage) return null;
			var val = window.localStorage.getItem(key);
			try { return JSON.parse(val); } catch(e) { return val; }
		}
	};
	
	/**
	 * 10. File: 파일 관련 유틸
	 */
	bonfireG.File = {
		formatSize: function(bytes) {
			if (bytes === 0) return '0 Byte';
			var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
			var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
			return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
		},
		isImage: function(filename) {
			var ext = filename.split('.').pop().toLowerCase();
			return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].indexOf(ext) > -1;
		},
		isExcel: function(filename) {
			var ext = filename.split('.').pop().toLowerCase();
			return ['xls', 'xlsx', 'csv'].indexOf(ext) > -1;
		}
	};
	
	/**
	 * 11. Util: 기타 유틸리티 (클립보드, 팝업)
	 */
	bonfireG.Util = {
		copyToClipboard: function(text) {
			if (navigator.clipboard && window.isSecureContext) {
				navigator.clipboard.writeText(text).catch(function(err){ console.error(err); });
			} else {
				var textArea = document.createElement("textarea");
				textArea.value = text;
				textArea.style.position = "fixed";
				textArea.style.left = "-9999px";
				document.body.appendChild(textArea);
				textArea.focus();
				textArea.select();
				try { document.execCommand('copy'); } catch (err) { console.error(err); }
				document.body.removeChild(textArea);
			}
		},
		openPopupCenter: function(url, title, w, h) {
			var left = (screen.width - w) / 2;
			var top = (screen.height - h) / 2;
			window.open(url, title, 'width=' + w + ',height=' + h + ',top=' + top + ',left=' + left + ',scrollbars=yes,resizable=yes');
		}
	};
	
	/**
	 * 12. Form: Input 제어 및 폼 데이터 처리
	 */
	bonfireG.Form = {
		onlyNumber: function(el) {
			el.value = el.value.replace(/[^0-9]/g, '');
		},
		onlyKorean: function(el) {
			el.value = el.value.replace(/[a-zA-Z0-9]/g, '');
		},
		onlyAlphaNum: function(el) {
			el.value = el.value.replace(/[^a-zA-Z0-9]/g, '');
		},
		val: function(id) {
			var el = document.getElementById(id);
			if (!el) {
				var nodes = document.getElementsByName(id);
				if (nodes.length > 0) {
					for (var i = 0; i < nodes.length; i++) {
						if (nodes[i].checked) return nodes[i].value;
					}
					return null;
				}
				return "";
			}
			if (el.type === 'checkbox') return el.checked ? (el.value || true) : false;
			return el.value;
		},
		serialize: function(formId) {
			var form = document.getElementById(formId);
			if (!form || form.tagName !== "FORM") return {};
			var obj = {};
			var elements = form.querySelectorAll("input, select, textarea");
			for (var i = 0; i < elements.length; i++) {
				var el = elements[i];
				var name = el.name;
				var value = el.value;
				if (!name) continue;
				if (el.type === 'radio') {
					if (el.checked) obj[name] = value;
				} else if (el.type === 'checkbox') {
					if (el.checked) {
						if (obj[name]) obj[name] += "," + value;
						else obj[name] = value;
					}
				} else {
					obj[name] = value;
				}
			}
			return obj;
		}
	};
	
	/**
	 * [필수] 뒤로가기(BFCache) 시 로딩바가 화면에 남아있는 문제 해결
	 */
	window.addEventListener('pageshow', function(event) {
		if (event.persisted || (bonfireG.Loading && document.getElementById("bonfire-loading-overlay") && document.getElementById("bonfire-loading-overlay").style.display === "flex")) {
			if (bonfireG.Loading) bonfireG.Loading.hide();
		}
	});

	global.bonfireG = bonfireG;

})(window);
