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
		
		// 실제 요청 처리 함수 (internal use)
		_request: function(method, url, data, successCallback, errorCallback) {
			var xhr = new XMLHttpRequest();

			// GET 방식이고 데이터가 있다면 URL에 파라미터 추가
			if (method === "GET" && data) {
				var queryString = this._serialize(data);
				url += (url.indexOf("?") === -1 ? "?" : "&") + queryString;
			}

			xhr.open(method, url, true);
			xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
			xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

			xhr.onreadystatechange = function() {
				if (xhr.readyState === 4) {
					if (xhr.status >= 200 && xhr.status < 300) {
						// 성공 시
						if (typeof successCallback === "function") {
							var response = xhr.responseText;
							try {
								response = JSON.parse(response);
							} catch (e) {
								// JSON 파싱 실패 시 원본 텍스트 유지
							}
							successCallback(response);
						}
					} else {
						// 실패 시
						if (typeof errorCallback === "function") {
							errorCallback(xhr.status, xhr.statusText);
						} else {
							console.error("AJAX Error: " + xhr.status);
						}
					}
				}
			};

			// POST 방식일 때 데이터 JSON 문자열로 변환하여 전송
			var payload = (method === "POST" && data) ? JSON.stringify(data) : null;
			xhr.send(payload);
		},

		// GET 메서드
		get: function(url, data, successCallback, errorCallback) {
			this._request("GET", url, data, successCallback, errorCallback);
		},

		// POST 메서드
		post: function(url, data, successCallback, errorCallback) {
			this._request("POST", url, data, successCallback, errorCallback);
		}
	};
	
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

	// 전역 객체에 등록
	global.bonfireG = bonfireG;

})(window);