/*
구본한 개인 코드
*/
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
		// 이미지 새로고침 (캐시 방지)
		refreshImage: function(id, url) {
			var img = document.getElementById(id);
			if (!img) return;
			var targetUrl = url ? url : img.src.split('?')[0];
			img.src = targetUrl + "?t=" + new Date().getTime();
		}
	};

	/**
	 * 5. Dialog: 모던 반응형 커스텀 Alert / Confirm 다이얼로그 (Core 로그와 독립 동작)
	 */
	bonfireG.Dialog = (function() {
		var overlay = null;
		var boxEl, titleEl, messageEl, cancelBtn, confirmBtn;
		var currentResolve = null;
		var currentOptions = null;
		var isBodyLocked = false;
		var originalBodyOverflow = '';
		var originalBodyPaddingRight = '';

		function injectStyles() {
			if (document.getElementById('bonfire-dialog-style')) return;

			var css = 
				'/* 배경 오버레이 */' +
				'.bonfire-dlg-overlay {' +
				'  position: fixed;' +
				'  top: 0;' +
				'  left: 0;' +
				'  width: 100vw;' +
				'  height: 100vh;' +
				'  background-color: rgba(0, 0, 0, 0.45);' +
				'  backdrop-filter: blur(3px);' +
				'  -webkit-backdrop-filter: blur(3px);' +
				'  display: flex;' +
				'  justify-content: center;' +
				'  align-items: center;' +
				'  z-index: 9999999;' +
				'  opacity: 0;' +
				'  visibility: hidden;' +
				'  transition: opacity 0.18s ease-out, visibility 0.18s ease-out;' +
				'  padding: 16px;' +
				'  box-sizing: border-box;' +
				'  font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "맑은 고딕", sans-serif;' +
				'}' +
				'.bonfire-dlg-overlay.active {' +
				'  opacity: 1;' +
				'  visibility: visible;' +
				'}' +
				'/* 다이얼로그 본체 박스 (두 번째 팝업 형태) */' +
				'.bonfire-dlg-box {' +
				'  background: #ffffff;' +
				'  width: 100%;' +
				'  max-width: 440px;' +
				'  border-radius: 16px;' +
				'  box-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.16), 0 4px 10px -2px rgba(0, 0, 0, 0.06);' +
				'  padding: 26px 26px 22px;' +
				'  box-sizing: border-box;' +
				'  text-align: left;' +
				'  transform: scale(0.95) translateY(6px);' +
				'  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);' +
				'}' +
				'.bonfire-dlg-overlay.active .bonfire-dlg-box {' +
				'  transform: scale(1) translateY(0);' +
				'}' +
				'/* 타이틀 헤더 */' +
				'.bonfire-dlg-title {' +
				'  font-size: 1.18rem;' +
				'  font-weight: 700;' +
				'  color: #111827;' +
				'  margin: 0 0 10px 0;' +
				'  line-height: 1.4;' +
				'  word-break: keep-all;' +
				'}' +
				'/* 본문 보조 텍스트 */' +
				'.bonfire-dlg-message {' +
				'  font-size: 0.98rem;' +
				'  font-weight: 400;' +
				'  color: #4b5563;' +
				'  line-height: 1.55;' +
				'  margin: 0 0 24px 0;' +
				'  word-break: keep-all;' +
				'  white-space: pre-wrap;' +
				'}' +
				'/* 제목이 없을 때 본문 강조 */' +
				'.bonfire-dlg-box.has-no-title .bonfire-dlg-message {' +
				'  font-size: 1.05rem;' +
				'  font-weight: 600;' +
				'  color: #1f2937;' +
				'  margin-bottom: 22px;' +
				'}' +
				'/* 하단 액션 버튼 그룹 (우측 정렬) */' +
				'.bonfire-dlg-actions {' +
				'  display: flex;' +
				'  justify-content: flex-end;' +
				'  align-items: center;' +
				'  gap: 10px;' +
				'}' +
				'/* 공통 버튼 */' +
				'.bonfire-dlg-btn {' +
				'  min-width: 78px;' +
				'  height: 44px;' +
				'  padding: 0 18px;' +
				'  border: none;' +
				'  border-radius: 8px;' +
				'  font-size: 0.95rem;' +
				'  font-weight: 600;' +
				'  cursor: pointer;' +
				'  outline: none;' +
				'  display: inline-flex;' +
				'  align-items: center;' +
				'  justify-content: center;' +
				'  box-sizing: border-box;' +
				'  user-select: none;' +
				'  transition: background-color 0.15s ease, transform 0.1s ease;' +
				'}' +
				'.bonfire-dlg-btn:active {' +
				'  transform: scale(0.97);' +
				'}' +
				'/* 확인 버튼 (파란색 메인) */' +
				'.bonfire-dlg-btn.btn-confirm {' +
				'  background-color: #2563EB;' +
				'  color: #ffffff;' +
				'}' +
				'.bonfire-dlg-btn.btn-confirm:hover {' +
				'  background-color: #1D4ED8;' +
				'}' +
				'/* 취소 버튼 (연회색 서브) */' +
				'.bonfire-dlg-btn.btn-cancel {' +
				'  background-color: #F1F5F9;' +
				'  color: #475569;' +
				'}' +
				'.bonfire-dlg-btn.btn-cancel:hover {' +
				'  background-color: #E2E8F0;' +
				'  color: #1E293B;' +
				'}' +
				'/* 모바일 반응형 최적화 */' +
				'@media (max-width: 480px) {' +
				'  .bonfire-dlg-box {' +
				'    padding: 22px 20px 18px;' +
				'    border-radius: 14px;' +
				'  }' +
				'  .bonfire-dlg-title {' +
				'    font-size: 1.1rem;' +
				'  }' +
				'  .bonfire-dlg-message {' +
				'    font-size: 0.93rem;' +
				'  }' +
				'  .bonfire-dlg-btn {' +
				'    height: 42px;' +
				'    min-width: 70px;' +
				'    font-size: 0.92rem;' +
				'    padding: 0 14px;' +
				'  }' +
				'}';

			var styleEl = document.createElement('style');
			styleEl.id = 'bonfire-dialog-style';
			styleEl.type = 'text/css';
			styleEl.appendChild(document.createTextNode(css));
			document.head.appendChild(styleEl);
		}

		function lockScroll() {
			if (isBodyLocked) return;
			var scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
			originalBodyOverflow = document.body.style.overflow;
			originalBodyPaddingRight = document.body.style.paddingRight;

			if (scrollbarWidth > 0) {
				var currentPadding = parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
				document.body.style.paddingRight = (currentPadding + scrollbarWidth) + 'px';
			}
			document.body.style.overflow = 'hidden';
			isBodyLocked = true;
		}

		function unlockScroll() {
			if (!isBodyLocked) return;
			document.body.style.overflow = originalBodyOverflow;
			document.body.style.paddingRight = originalBodyPaddingRight;
			isBodyLocked = false;
		}

		function init() {
			if (overlay) return;
			injectStyles();

			overlay = document.createElement('div');
			overlay.className = 'bonfire-dlg-overlay';
			overlay.innerHTML = 
				'<div class="bonfire-dlg-box" role="dialog" aria-modal="true">' +
				'  <h3 class="bonfire-dlg-title" id="bonfireDlgTitle"></h3>' +
				'  <div class="bonfire-dlg-message" id="bonfireDlgMessage"></div>' +
				'  <div class="bonfire-dlg-actions">' +
				'    <button type="button" class="bonfire-dlg-btn btn-cancel" id="bonfireDlgCancel">취소</button>' +
				'    <button type="button" class="bonfire-dlg-btn btn-confirm" id="bonfireDlgConfirm">확인</button>' +
				'  </div>' +
				'</div>';

			document.body.appendChild(overlay);

			boxEl = overlay.querySelector('.bonfire-dlg-box');
			titleEl = overlay.querySelector('#bonfireDlgTitle');
			messageEl = overlay.querySelector('#bonfireDlgMessage');
			cancelBtn = overlay.querySelector('#bonfireDlgCancel');
			confirmBtn = overlay.querySelector('#bonfireDlgConfirm');

			confirmBtn.addEventListener('click', function () { close(true); });
			cancelBtn.addEventListener('click', function () { close(false); });

			// ESC 키 및 Focus Trap 이벤트
			window.addEventListener('keydown', function (e) {
				if (!overlay.classList.contains('active')) return;

				if (e.key === 'Escape' || e.keyCode === 27) {
					var isOnlyAlert = cancelBtn.style.display === 'none';
					close(isOnlyAlert ? true : false);
					return;
				}

				if (e.key === 'Tab' || e.keyCode === 9) {
					var focusable = [cancelBtn, confirmBtn].filter(function (btn) {
						return btn.style.display !== 'none';
					});
					if (focusable.length === 0) return;

					var first = focusable[0];
					var last = focusable[focusable.length - 1];

					if (e.shiftKey) {
						if (document.activeElement === first) {
							last.focus();
							e.preventDefault();
						}
					} else {
						if (document.activeElement === last) {
							first.focus();
							e.preventDefault();
						}
					}
				}
			});

			overlay.addEventListener('touchmove', function (e) {
				if (e.target === overlay) e.preventDefault();
			}, { passive: false });
		}

		function normalizeOptions(arg1, arg2, isConfirmDefault) {
			var opts = {
				title: '',
				message: '',
				confirmText: '확인',
				cancelText: '취소',
				isConfirm: isConfirmDefault
			};

			if (typeof arg1 === 'object' && arg1 !== null) {
				for (var key in arg1) { opts[key] = arg1[key]; }
				return opts;
			}

			if (arg2 === undefined) {
				opts.message = (arg1 !== undefined && arg1 !== null) ? String(arg1) : '';
				return opts;
			}

			if (typeof arg1 === 'string' && typeof arg2 === 'string') {
				opts.title = arg1;
				opts.message = arg2;
				return opts;
			}

			return opts;
		}

		function open(opts) {
			init();
			currentOptions = opts || {};

			var title = currentOptions.title || '';
			var message = currentOptions.message || '';
			var confirmText = currentOptions.confirmText || '확인';
			var cancelText = currentOptions.cancelText || '취소';
			var isConfirm = !!currentOptions.isConfirm;

			if (title && title.trim() !== '') {
				titleEl.textContent = title;
				titleEl.style.display = 'block';
				boxEl.classList.remove('has-no-title');
			} else {
				titleEl.style.display = 'none';
				boxEl.classList.add('has-no-title');
			}

			messageEl.textContent = message;
			confirmBtn.textContent = confirmText;
			cancelBtn.textContent = cancelText;
			cancelBtn.style.display = isConfirm ? 'inline-flex' : 'none';

			overlay.classList.add('active');
			lockScroll();

			setTimeout(function () {
				confirmBtn.focus();
			}, 30);

			return new Promise(function (resolve) {
				currentResolve = resolve;
			});
		}

		function close(result) {
			if (!overlay || !overlay.classList.contains('active')) return;

			overlay.classList.remove('active');
			unlockScroll();

			var opts = currentOptions || {};
			if (result && typeof opts.onConfirm === 'function') {
				opts.onConfirm();
			} else if (!result && typeof opts.onCancel === 'function') {
				opts.onCancel();
			}

			if (currentResolve) {
				var resolveFunc = currentResolve;
				currentResolve = null;
				resolveFunc(result);
			}
		}

		return {
			alert: function(arg1, arg2) {
				return open(normalizeOptions(arg1, arg2, false));
			},
			confirm: function(arg1, arg2) {
				return open(normalizeOptions(arg1, arg2, true));
			},
			close: close
		};
	})();

	// bonfireG 바로 밑에서 직접 호출 가능하도록 연결
	bonfireG.alert = bonfireG.Dialog.alert;
	bonfireG.confirm = bonfireG.Dialog.confirm;

	/**
	 * 6. Ajax: 비동기 통신
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
		
		_request: function(method, url, data, contentType, successCallback, errorCallback, options) {
			var xhr = new XMLHttpRequest();
			var payload = null;
			
			options = options || {};
			var useLoader = (options.useLoader !== false);
			var isAsync = (options.async !== false);
			var autoHide = (options.autoHide !== false);

			if (typeof options.beforeSend === "function") options.beforeSend();
			
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
		upload: function(url, formData, successCallback, errorCallback, options) {
			this._request("POST", url, formData, "UPLOAD", successCallback, errorCallback, options);
		}
	};

	/**
     * 7. Page: 페이지 이동 및 제어
     */
	bonfireG.Page = {
		move: function(url) {
			if (bonfireG.Validator.isEmpty(url)) return;
			if (bonfireG.Loading) bonfireG.Loading.show();
			window.location.href = url;
		},
		submit: function(url, params, target) {
			if (bonfireG.Validator.isEmpty(url)) return;
			if (target && target !== "_self") {
				if (bonfireG.Loading) bonfireG.Loading.hide();
			} else {
				if (bonfireG.Loading) bonfireG.Loading.show();
			}
			
			var form = document.createElement("form");
			form.setAttribute("method", "post");
			form.setAttribute("action", url);
			
			if (target) {
				form.setAttribute("target", target);
			}
		
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
	 * 8. Loading: 로딩 오버레이
	 */
	bonfireG.Loading = {
		_id: "bonfire-loading-overlay",
		_textId: "bonfire-loading-msg",
		_timer: null,
		_messages: [
			"질문을 분석하고 있어요",
			"최적의 답변을 찾는 중입니다",
			"내용을 정리하고 있어요",
			"답변을 작성하는 중이에요",
			"조금만 기다려주세요",
			"곧 답변해드릴게요!"
		],
		
		_injectCSS: function() {
			if (document.getElementById("bonfire-loading-style")) return;
			var css = "" +
				".bonfire-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 9999; display: none; align-items: center; justify-content: center; flex-direction: column; }" +
				".bonfire-spinner { display: block; width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px auto; }" +
				".bonfire-loading-text { display: block; color: #ffffff; font-size: 16px; font-weight: bold; text-align: center; line-height: 1.5; min-height: 24px; white-space: pre-wrap; width: 100%; }" +
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
			overlay.innerHTML = '<div class="bonfire-spinner"></div><div id="' + this._textId + '" class="bonfire-loading-text"></div>';
			document.body.appendChild(overlay);
		},

		show: function(mode, showMessage) {
			this._injectCSS();
			this._createHTML();
			var el = document.getElementById(this._id);

			var txtEl = document.getElementById(this._textId);
			showMessage = (showMessage === true);
			
			if (mode === 'block') {
				el.style.display = "block";
				var spinner = el.querySelector('.bonfire-spinner');
				if(spinner) {
					spinner.style.position = "absolute";
					spinner.style.top = "50%";
					spinner.style.left = "50%";
					spinner.style.transform = "translate(-50%, -50%)";
				}

				if(txtEl) {
					txtEl.style.position = "absolute";
					txtEl.style.top = "calc(50% + 50px)"; 
					txtEl.style.left = "50%";
					txtEl.style.transform = "translate(-50%, -50%)";
					txtEl.style.width = "100%";
				}
			} else {
				el.style.display = "flex";
				var spinner = el.querySelector('.bonfire-spinner');
				if(spinner) {
					spinner.style.position = "";
					spinner.style.top = "";
					spinner.style.left = "";
					spinner.style.transform = "";
				}

				if(txtEl) {
					txtEl.style.position = "";
					txtEl.style.top = "";
					txtEl.style.left = "";
					txtEl.style.transform = "";
					txtEl.style.width = "";
				}
			}

			if (showMessage) {
				var self = this;
				var idx = 0;
				var loopStartIndex = 3;
				txtEl.innerText = self._messages[idx];
				
				if (this._timer) clearInterval(this._timer);

				this._timer = setInterval(function() {
					idx++;
					if (idx >= self._messages.length) {
						idx = loopStartIndex;
					}
					txtEl.innerText = self._messages[idx];
				}, 3000);
			} else {
				txtEl.innerText = "";
				if (this._timer) {
					clearInterval(this._timer);
					this._timer = null;
				}
			}
		},
		hide: function() {
			var el = document.getElementById(this._id);
			if (el) el.style.display = "none";
		}
	};
	
	/**
	 * 9. Date: 날짜 관련 처리
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
	 * 10. Storage: 쿠키 및 로컬스토리지 제어
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
		setCookieMin: function(name, value, minutes) {
			var expires = "";
			if (minutes) {
				var date = new Date();
				date.setTime(date.getTime() + (minutes * 60 * 1000));
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
	 * 11. File: 파일 관련 유틸
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
	 * 12. Util: 기타 유틸리티
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
	 * 13. Form: Input 제어 및 폼 데이터 처리
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
	 * 14. Session: 세션 만료 타이머
	 */
	bonfireG.Session = {
		timer: null,
		limit: 30 * 60 * 1000,
		redirectUrl: null,
		cookieName: "SESSION_ALIVE",
		cookieValue: "Y",
		eventAdded: false,
		watcher: null,
		start: function(minutes, url, cName, cValue) {
			if (minutes) this.limitMin = minutes;
			if (url) this.redirectUrl = url;
			if (cName) this.cookieName = cName;
			if (cValue) this.cookieValue = cValue;

			this.extend();
			if (this.watcher) clearInterval(this.watcher);
			
			var self = this;
			this.watcher = setInterval(function() {
				var check = bonfireG.Storage.getCookie(self.cookieName);
				if (check == null) {
					clearInterval(self.watcher);
					self.showExpiredPopup();
				}
			}, 1000); 

			if (!this.eventAdded) {
				document.addEventListener('click', function() { self.extend(); });
				document.addEventListener('keydown', function() { self.extend(); });
				this.eventAdded = true;
			}
		},
		extend: function() {
			bonfireG.Storage.setCookieMin(this.cookieName, this.cookieValue, this.limitMin);
		},
		showExpiredPopup: function() {
			var self = this;
			var overlay = document.createElement("div");
			overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:99999; display:flex; justify-content:center; align-items:center;";
			
			var box = document.createElement("div");
			box.style.cssText = "background:#fff; padding:30px; border-radius:8px; text-align:center; box-shadow:0 4px 6px rgba(0,0,0,0.1); min-width:300px;";
			
			var msg = document.createElement("p");
			msg.innerText = "세션 유효 시간이 만료되었습니다.\n자동 로그아웃 됩니다.";
			msg.style.cssText = "margin-bottom:20px; font-size:16px; color:#333; line-height:1.5;";
			
			var btn = document.createElement("button");
			btn.innerText = "확인";
			btn.style.cssText = "padding:10px 20px; background:#007bff; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:14px;";
			
			btn.onclick = function() {
				if (self.redirectUrl && self.redirectUrl !== 'javascript:void(0)') {
					if (window.top) window.top.location.href = self.redirectUrl;
					else window.location.href = self.redirectUrl;
				} else if (self.redirectUrl !== 'javascript:void(0)') {
					window.location.reload();
				} else {
					document.body.removeChild(overlay);
				}
			};

			box.appendChild(msg);
			box.appendChild(btn);
			overlay.appendChild(box);
			document.body.appendChild(overlay);
		},
		stop: function() {
			if (this.watcher) {
				clearInterval(this.watcher);
				this.watcher = null;
			}
			bonfireG.Storage.deleteCookie(this.cookieName);
		},
	};
	
	window.addEventListener('pageshow', function(event) {
		if (event.persisted || (bonfireG.Loading && document.getElementById("bonfire-loading-overlay") && document.getElementById("bonfire-loading-overlay").style.display === "flex")) {
			if (bonfireG.Loading) bonfireG.Loading.hide();
		}
	});

	global.bonfireG = bonfireG;

})(window);
