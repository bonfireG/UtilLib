(function(global) {
	"use strict";

	// 기존 객체가 있으면 사용하고, 없으면 새로 생성
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
		// 빈 값 체크 (null, undefined, 공백문자열)
		isEmpty: function(val) {
			return (val == null || String(val).replace(/\s/g, "") === "");
		},
		// 숫자 여부 체크
		isNumber: function(val) {
			return /^[0-9]+$/.test(val);
		},
		// 이메일 형식 체크
		isEmail: function(val) {
			return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val);
		}
	};

	/**
	 * 3. Formatter: 데이터 포맷 변환
	 */
	bonfireG.Formatter = {
		// 천단위 콤마 찍기
		comma: function(val) {
			if (bonfireG.Validator.isEmpty(val)) return "0";
			return String(val).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		},
		// 콤마 제거
		uncomma: function(val) {
			return String(val).replace(/,/g, "");
		},
		// 전화번호 하이픈(-) 처리
		phoneNumber: function(val) {
			if (!val) return "";
			
			var str = String(val).replace(/[^0-9]/g, ""); // 숫자만 남김
			
			// 11자리 (010-XXXX-XXXX)
			if (str.length === 11) {
				return str.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
			} 
			// 8자리 (1588-XXXX)
			else if (str.length === 8) {
				return str.replace(/(\d{4})(\d{4})/, "$1-$2");
			} 
			// 서울 지역번호 (02-XXX-XXXX 또는 02-XXXX-XXXX)
			else if (str.indexOf("02") === 0) {
				return str.replace(/(\d{2})(\d{3,4})(\d{4})/, "$1-$2-$3");
			} 
			// 그 외 (031-XXX-XXXX 등)
			else {
				return str.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3");
			}
		}
	};

	/**
	 * 4. UI: UI 이벤트 관련
	 */
	bonfireG.UI = {
		// 엔터키 입력 시 특정 버튼 클릭 트리거
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
		}
	};

	/**
	 * 5. Ajax: 비동기 통신 (Vanilla JS XMLHttpRequest 사용)
	 */
	bonfireG.Ajax = {
		// 객체를 쿼리 스트링으로 변환 (internal use)
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
		 * @param options : { useLoader: true/false, beforeSend: fn, complete: fn }
		 */
		_request: function(method, url, data, contentType, successCallback, errorCallback, options) {
			var xhr = new XMLHttpRequest();
			var payload = null;
			
			// 옵션 기본값 처리
			options = options || {};
			var useLoader = (options.useLoader !== false); // 기본값 true

			// [1] beforeSend: 요청 전 실행 (버튼 비활성화 등)
			if (typeof options.beforeSend === "function") {
				options.beforeSend();
			}

			// 로딩 화면 (옵션에서 false로 끄지 않았다면 실행)
			if (useLoader && bonfireG.Loading) bonfireG.Loading.show();

			// GET 파라미터 처리
			if (method === "GET" && data) {
				var queryString = this._serialize(data);
				url += (url.indexOf("?") === -1 ? "?" : "&") + queryString;
			}

			xhr.open(method, url, true);
			xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

			// POST Content-Type 처리
			if (method === "POST") {
				if (contentType === "FORM") {
					xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
					payload = this._serialize(data);
				} else {
					xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
					payload = JSON.stringify(data);
				}
			}

			xhr.onreadystatechange = function() {
				if (xhr.readyState === 4) { // 통신 완료 시
					
					// 로딩 끄기
					if (useLoader && bonfireG.Loading) bonfireG.Loading.hide();

					// 성공/실패 핸들링
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

					// [2] complete: 성공이든 실패든 무조건 마지막에 실행
					if (typeof options.complete === "function") {
						options.complete();
					}
				}
			};

			xhr.send(payload);
		},

		// 함수들 파라미터 끝에 options 추가
		get: function(url, data, successCallback, errorCallback, options) {
			this._request("GET", url, data, null, successCallback, errorCallback, options);
		},

		post: function(url, data, successCallback, errorCallback, options) {
			this._request("POST", url, data, "JSON", successCallback, errorCallback, options);
		},

		postForm: function(url, data, successCallback, errorCallback, options) {
			this._request("POST", url, data, "FORM", successCallback, errorCallback, options);
		}
	};
	/**
     * 6. Page: 페이지 이동 및 제어
     */
	bonfireG.Page = {
		move: function(url) {
			if (bonfireG.Validator.isEmpty(url)) return;
			window.location.href = url;
		},
		open: function(url) {
			if (bonfireG.Validator.isEmpty(url)) return;
			window.open(url, '_blank');
		},
		reload: function() {
			window.location.reload();
		},
		back: function() {
			window.history.back();
		}
	};
	/**
	 * 7. Loading: 로딩 오버레이 (CSS 포함)
	 */
	bonfireG.Loading = {
		_id: "bonfire-loading-overlay",
		
		// CSS를 JS에서 직접 주입 (외부 CSS 파일 필요 없음)
		_injectCSS: function() {
			if (document.getElementById("bonfire-loading-style")) return;
			
			var css = "" +
				".bonfire-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); z-index: 9999; display: none; justify-content: center; align-items: center; }" +
				".bonfire-spinner { width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; }" +
				"@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }";
			
			var style = document.createElement('style');
			style.id = "bonfire-loading-style";
			style.type = 'text/css';
			if (style.styleSheet) { style.styleSheet.cssText = css; } // IE
			else { style.appendChild(document.createTextNode(css)); } // Chrome, FF
			document.getElementsByTagName('head')[0].appendChild(style);
		},

		// 로딩 HTML 생성
		_createHTML: function() {
			if (document.getElementById(this._id)) return;
			
			var overlay = document.createElement('div');
			overlay.id = this._id;
			overlay.className = "bonfire-overlay";
			overlay.innerHTML = '<div class="bonfire-spinner"></div>';
			document.body.appendChild(overlay);
		},

		// 로딩 보이기
		show: function() {
			this._injectCSS();
			this._createHTML();
			document.getElementById(this._id).style.display = "flex";
		},

		// 로딩 숨기기
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
			// 입력값이 없으면 현재 시간, 있으면 해당 시간으로 Date 객체 생성
			var date = (dt) ? new Date(dt) : new Date();
			
			// 유효하지 않은 날짜인 경우 빈 문자열 반환 (안전 장치)
			if (isNaN(date.getTime())) return "";

			var year = date.getFullYear().toString();

			var month = date.getMonth() + 1;
			month = month < 10 ? '0' + month.toString() : month.toString();

			var day = date.getDate();
			day = day < 10 ? '0' + day.toString() : day.toString();

			var hour = date.getHours();
			hour = hour < 10 ? '0' + hour.toString() : hour.toString();

			var minutes = date.getMinutes(); // 오타 수정: minites -> minutes
			minutes = minutes < 10 ? '0' + minutes.toString() : minutes.toString();

			var seconds = date.getSeconds();
			seconds = seconds < 10 ? '0' + seconds.toString() : seconds.toString();

			return year + "-" + month + "-" + day + " " + hour + ":" + minutes + ":" + seconds;
		},
		
		/**
		 * 날짜만 "YYYY-MM-DD" 포맷으로 변환 (보너스 기능)
		 */
		getToday: function(dt) {
			var fullStr = this.getDateTime(dt);
			return fullStr.substring(0, 10); // 앞의 10자리만 잘라서 반환
		}
	};
	// 전역 객체에 등록
	global.bonfireG = bonfireG;

})(window);

/*
bonfireG.Ajax.postForm(
	url, 
	data, 
	function(result){
		console.log(result);
	}, function(error){
		console.log(error);
	}
);
*/