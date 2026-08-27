/**
 * ============================================================================
 * [독립형 반응형 커스텀 Alert / Confirm 다이얼로그 모듈]
 * 파일명: custom-dialog.js
 * 
 * - 외부 라이브러리 및 별도 CSS 파일 불필요 (단일 JS 파일로 완벽 동작)
 * - [케이스 1] 제목 없이 본문 메시지만 있는 경우 지원
 * - [케이스 2] 제목 + 본문 메시지가 모두 있는 경우 지원
 * - 0이면 아이콘 숨김, 1이면 경고 아이콘 표시 등 숫자 옵션 지원
 * - Promise(async/await) 및 콜백 완벽 지원
 * - 모바일/태블릿/데스크탑 100% 반응형 지원
 * - ESC / Enter 키보드 접근성 지원 & 배경 스크롤 방지
 * ============================================================================
 */
(function (global) {
	'use strict';

	// 전용 스타일 자동 주입 (별도 CSS 파일 로드 필요 없음)
	function injectStyles() {
		if (document.getElementById('custom-dialog-injected-style')) return;

		var css = 
			'/* 커스텀 다이얼로그 배경 오버레이 */' +
			'.custom-dlg-overlay {' +
			'  position: fixed;' +
			'  top: 0;' +
			'  left: 0;' +
			'  width: 100vw;' +
			'  height: 100vh;' +
			'  background-color: rgba(15, 23, 42, 0.45);' +
			'  backdrop-filter: blur(4px);' +
			'  -webkit-backdrop-filter: blur(4px);' +
			'  display: flex;' +
			'  justify-content: center;' +
			'  align-items: center;' +
			'  z-index: 9999999;' +
			'  opacity: 0;' +
			'  visibility: hidden;' +
			'  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.2s cubic-bezier(0.16, 1, 0.3, 1);' +
			'  padding: 16px;' +
			'  box-sizing: border-box;' +
			'  font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "맑은 고딕", sans-serif;' +
			'}' +
			'.custom-dlg-overlay.active {' +
			'  opacity: 1;' +
			'  visibility: visible;' +
			'}' +
			'/* 다이얼로그 박스 */' +
			'.custom-dlg-box {' +
			'  background: #ffffff;' +
			'  width: 100%;' +
			'  max-width: 380px;' +
			'  border-radius: 20px;' +
			'  box-shadow: 0 20px 40px -5px rgba(0, 0, 0, 0.16), 0 10px 15px -5px rgba(0, 0, 0, 0.05);' +
			'  padding: 30px 24px 22px;' +
			'  box-sizing: border-box;' +
			'  text-align: center;' +
			'  transform: scale(0.92) translateY(12px);' +
			'  transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);' +
			'  position: relative;' +
			'  overflow: hidden;' +
			'}' +
			'.custom-dlg-overlay.active .custom-dlg-box {' +
			'  transform: scale(1) translateY(0);' +
			'}' +
			'/* 아이콘 영역 (원형 배지) */' +
			'.custom-dlg-icon-wrap {' +
			'  width: 60px;' +
			'  height: 60px;' +
			'  margin: 0 auto 18px;' +
			'  border-radius: 50%;' +
			'  display: flex;' +
			'  align-items: center;' +
			'  justify-content: center;' +
			'}' +
			'.custom-dlg-icon-wrap svg {' +
			'  width: 30px;' +
			'  height: 30px;' +
			'  display: block;' +
			'}' +
			'.custom-dlg-icon-wrap.type-warning { background: #FFF4D9; color: #EAB308; }' +
			'.custom-dlg-icon-wrap.type-error   { background: #FEE2E2; color: #EF4444; }' +
			'.custom-dlg-icon-wrap.type-success { background: #D1FAE5; color: #10B981; }' +
			'.custom-dlg-icon-wrap.type-info    { background: #EEF2FF; color: #6366F1; }' +
			'.custom-dlg-icon-wrap.type-question{ background: #EDE9FE; color: #7C3AED; }' +
			'/* 제목 (Title) */' +
			'.custom-dlg-title {' +
			'  font-size: 1.2rem;' +
			'  font-weight: 700;' +
			'  color: #1e293b;' +
			'  margin: 0 0 10px 0;' +
			'  word-break: keep-all;' +
			'  line-height: 1.4;' +
			'}' +
			'/* 본문 메시지 (Message) */' +
			'.custom-dlg-message {' +
			'  font-size: 0.96rem;' +
			'  color: #64748b;' +
			'  line-height: 1.55;' +
			'  margin: 0 0 24px 0;' +
			'  word-break: keep-all;' +
			'  white-space: pre-wrap;' +
			'}' +
			'/* [제목이 없는 경우] 본문 메시지를 메인 텍스트로 강조 */' +
			'.custom-dlg-box.has-no-title .custom-dlg-message {' +
			'  font-size: 1.05rem;' +
			'  font-weight: 600;' +
			'  color: #1e293b;' +
			'  margin-top: 4px;' +
			'  margin-bottom: 26px;' +
			'}' +
			'/* [아이콘이 없는 경우] 상단 패딩 보정 */' +
			'.custom-dlg-box.has-no-icon {' +
			'  padding-top: 34px;' +
			'}' +
			'/* 버튼 액션 그룹 */' +
			'.custom-dlg-actions {' +
			'  display: flex;' +
			'  gap: 10px;' +
			'  justify-content: center;' +
			'  width: 100%;' +
			'}' +
			'.custom-dlg-btn {' +
			'  flex: 1;' +
			'  min-height: 46px;' +
			'  padding: 10px 18px;' +
			'  border: none;' +
			'  border-radius: 12px;' +
			'  font-size: 0.98rem;' +
			'  font-weight: 700;' +
			'  cursor: pointer;' +
			'  outline: none;' +
			'  transition: all 0.15s ease;' +
			'  display: inline-flex;' +
			'  align-items: center;' +
			'  justify-content: center;' +
			'  box-sizing: border-box;' +
			'  text-decoration: none;' +
			'  user-select: none;' +
			'  -webkit-user-select: none;' +
			'}' +
			'.custom-dlg-btn:active {' +
			'  transform: scale(0.97);' +
			'}' +
			'.custom-dlg-btn.btn-confirm {' +
			'  background: linear-gradient(135deg, #5B42F3 0%, #4E33E8 100%);' +
			'  color: #ffffff;' +
			'  box-shadow: 0 4px 14px rgba(91, 66, 243, 0.35);' +
			'}' +
			'.custom-dlg-btn.btn-confirm:hover {' +
			'  background: linear-gradient(135deg, #4f35e5 0%, #4326db 100%);' +
			'  box-shadow: 0 6px 18px rgba(91, 66, 243, 0.45);' +
			'}' +
			'.custom-dlg-btn.btn-cancel {' +
			'  background: #f1f5f9;' +
			'  color: #475569;' +
			'}' +
			'.custom-dlg-btn.btn-cancel:hover {' +
			'  background: #e2e8f0;' +
			'  color: #1e293b;' +
			'}' +
			'/* 모바일 반응형 미디어 쿼리 */' +
			'@media (max-width: 480px) {' +
			'  .custom-dlg-box {' +
			'    max-width: 100%;' +
			'    padding: 24px 18px 20px;' +
			'    border-radius: 18px;' +
			'  }' +
			'  .custom-dlg-icon-wrap {' +
			'    width: 52px;' +
			'    height: 52px;' +
			'    margin-bottom: 14px;' +
			'  }' +
			'  .custom-dlg-icon-wrap svg {' +
			'    width: 26px;' +
			'    height: 26px;' +
			'  }' +
			'  .custom-dlg-title {' +
			'    font-size: 1.1rem;' +
			'  }' +
			'  .custom-dlg-message {' +
			'    font-size: 0.92rem;' +
			'    margin-bottom: 20px;' +
			'  }' +
			'  .custom-dlg-box.has-no-title .custom-dlg-message {' +
			'    font-size: 0.98rem;' +
			'    margin-bottom: 22px;' +
			'  }' +
			'  .custom-dlg-btn {' +
			'    min-height: 44px;' +
			'    font-size: 0.94rem;' +
			'    padding: 8px 14px;' +
			'  }' +
			'}';

		var styleEl = document.createElement('style');
		styleEl.id = 'custom-dialog-injected-style';
		styleEl.type = 'text/css';
		styleEl.appendChild(document.createTextNode(css));
		document.head.appendChild(styleEl);
	}

	// 내장 SVG 고화질 아이콘
	var ICONS = {
		warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
		error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
		success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
		info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
		question: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
	};

	var overlay = null;
	var boxEl, iconWrapEl, titleEl, messageEl, cancelBtn, confirmBtn;
	var currentResolve = null;
	var currentOptions = null;

	function init() {
		if (overlay) return;
		injectStyles();

		overlay = document.createElement('div');
		overlay.className = 'custom-dlg-overlay';
		overlay.innerHTML = 
			'<div class="custom-dlg-box" role="dialog" aria-modal="true">' +
			'  <div class="custom-dlg-icon-wrap" id="customDlgIcon"></div>' +
			'  <h3 class="custom-dlg-title" id="customDlgTitle"></h3>' +
			'  <div class="custom-dlg-message" id="customDlgMessage"></div>' +
			'  <div class="custom-dlg-actions">' +
			'    <button type="button" class="custom-dlg-btn btn-cancel" id="customDlgCancel">취소</button>' +
			'    <button type="button" class="custom-dlg-btn btn-confirm" id="customDlgConfirm">확인</button>' +
			'  </div>' +
			'</div>';

		document.body.appendChild(overlay);

		boxEl = overlay.querySelector('.custom-dlg-box');
		iconWrapEl = overlay.querySelector('#customDlgIcon');
		titleEl = overlay.querySelector('#customDlgTitle');
		messageEl = overlay.querySelector('#customDlgMessage');
		cancelBtn = overlay.querySelector('#customDlgCancel');
		confirmBtn = overlay.querySelector('#customDlgConfirm');

		// 확인 버튼
		confirmBtn.addEventListener('click', function () {
			close(true);
		});

		// 취소 버튼
		cancelBtn.addEventListener('click', function () {
			close(false);
		});

		// ESC 키 닫기 처리
		window.addEventListener('keydown', function (e) {
			if (!overlay.classList.contains('active')) return;

			if (e.key === 'Escape' || e.keyCode === 27) {
				var isOnlyAlert = cancelBtn.style.display === 'none';
				close(isOnlyAlert ? true : false);
			}
		});
	}

	/**
	 * 스마트 파라미터 정규화:
	 * -------------------------------------------------------------
	 * 1) alert("메시지")                          -> 제목X, 메시지만, 아이콘(1)O [이미지1번]
	 * 2) alert("메시지", 0)                       -> 제목X, 메시지만, 아이콘(0)X
	 * 3) alert("메시지", 1)                       -> 제목X, 메시지만, 아이콘(1)O [이미지1번]
	 * 4) alert("메시지", "제목")                  -> 제목O, 메시지O, 아이콘(1)O [이미지2번]
	 * 5) alert("메시지", "제목", 0)               -> 제목O, 메시지O, 아이콘(0)X
	 * 6) alert("메시지", "제목", 1)               -> 제목O, 메시지O, 아이콘(1)O [이미지2번]
	 * 7) alert({ title: "...", message: "...", icon: 1 })
	 * -------------------------------------------------------------
	 */
	function normalizeOptions(arg1, arg2, arg3, isConfirmDefault) {
		var opts = {
			title: '',
			message: '',
			icon: isConfirmDefault ? 5 : 1,
			isConfirm: isConfirmDefault
		};

		// 1개 인자: alert("메시지") 또는 alert({ ... })
		if (arg2 === undefined && arg3 === undefined) {
			if (typeof arg1 === 'object' && arg1 !== null) {
				for (var k in arg1) { opts[k] = arg1[k]; }
				return opts;
			}
			opts.message = (arg1 !== undefined && arg1 !== null) ? String(arg1) : '';
			return opts;
		}

		// 2개 인자
		if (arg3 === undefined) {
			// (A) alert("메시지", 0 또는 1 또는 boolean) -> 제목 없이 메시지만 [이미지 1번 형태]
			if (typeof arg2 === 'number' || typeof arg2 === 'boolean') {
				opts.message = (arg1 !== undefined && arg1 !== null) ? String(arg1) : '';
				opts.icon = arg2;
				return opts;
			}
			// (B) alert("메시지", { ... })
			if (typeof arg2 === 'object' && arg2 !== null) {
				for (var k2 in arg2) { opts[k2] = arg2[k2]; }
				opts.message = opts.message || String(arg1 || '');
				return opts;
			}
			// (C) alert("메시지", "제목") -> 본문 + 제목 [이미지 2번 형태]
			if (typeof arg1 === 'string' && typeof arg2 === 'string') {
				opts.message = arg1;
				opts.title = arg2;
				return opts;
			}
		}

		// 3개 인자: alert("메시지", "제목", 0 또는 1 또는 { ... })
		if (typeof arg1 === 'string' && typeof arg2 === 'string') {
			opts.message = arg1;
			opts.title = arg2;
			if (typeof arg3 === 'number' || typeof arg3 === 'boolean' || typeof arg3 === 'string') {
				opts.icon = arg3;
			} else if (typeof arg3 === 'object' && arg3 !== null) {
				for (var k3 in arg3) { opts[k3] = arg3[k3]; }
			}
			return opts;
		}

		return opts;
	}

	function open(opts) {
		init();
		currentOptions = opts || {};

		var message = currentOptions.message || '';
		var title = currentOptions.title || '';
		var confirmText = currentOptions.confirmText || '확인';
		var cancelText = currentOptions.cancelText || '취소';
		var isConfirm = !!currentOptions.isConfirm;

		// =========================================================================
		// 1. 아이콘 표시 여부 / 타입 판별 (0: 없음, 1: 경고, 2: 에러, 3: 성공, 4: 안내, 5: 질문)
		// =========================================================================
		var iconVal = currentOptions.icon !== undefined ? currentOptions.icon 
		            : (currentOptions.showIcon !== undefined ? currentOptions.showIcon 
		            : currentOptions.type);

		// 0, false, '0', 'none', 'hide' 이면 아이콘 숨김!
		if (iconVal === 0 || iconVal === false || iconVal === '0' || iconVal === 'none' || iconVal === 'hide') {
			iconWrapEl.style.display = 'none';
			boxEl.classList.add('has-no-icon');
		} else {
			boxEl.classList.remove('has-no-icon');
			var type = 'warning'; // 기본값 (1 or true)

			if (iconVal === 1 || iconVal === true || iconVal === '1' || iconVal === 'warning') {
				type = 'warning';   // 노란색 경고
			} else if (iconVal === 2 || iconVal === '2' || iconVal === 'error' || iconVal === 'danger') {
				type = 'error';     // 빨간색 에러
			} else if (iconVal === 3 || iconVal === '3' || iconVal === 'success') {
				type = 'success';   // 초록색 성공
			} else if (iconVal === 4 || iconVal === '4' || iconVal === 'info') {
				type = 'info';      // 파란색 정보
			} else if (iconVal === 5 || iconVal === '5' || iconVal === 'question') {
				type = 'question';  // 보라색 질문
			} else if (typeof iconVal === 'string' && ICONS[iconVal]) {
				type = iconVal;
			} else if (isConfirm) {
				type = 'question';
			}

			iconWrapEl.className = 'custom-dlg-icon-wrap type-' + type;
			iconWrapEl.innerHTML = ICONS[type] || ICONS.warning;
			iconWrapEl.style.display = 'flex';
		}

		// =========================================================================
		// 2. 제목(Title) 유무에 따른 클래스 제어
		// =========================================================================
		if (title && title.trim() !== '') {
			titleEl.textContent = title;
			titleEl.style.display = 'block';
			boxEl.classList.remove('has-no-title');
		} else {
			titleEl.style.display = 'none';
			boxEl.classList.add('has-no-title'); // 제목 없을 땐 본문 텍스트가 메인이 됨
		}

		// 3. 본문 메시지 설정
		messageEl.textContent = message;

		// 4. 버튼 제어
		confirmBtn.textContent = confirmText;
		cancelBtn.textContent = cancelText;
		cancelBtn.style.display = isConfirm ? 'inline-flex' : 'none';

		// 5. 모달 활성화 및 배경 스크롤 방지
		overlay.classList.add('active');
		document.body.style.overflow = 'hidden';

		// 확인 버튼 포커스
		setTimeout(function () {
			confirmBtn.focus();
		}, 50);

		// Promise 반환 (async/await 및 .then 완벽 호환)
		return new Promise(function (resolve) {
			currentResolve = resolve;
		});
	}

	function close(result) {
		if (!overlay || !overlay.classList.contains('active')) return;

		overlay.classList.remove('active');
		document.body.style.overflow = '';

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

	var CustomDialog = {
		/**
		 * 커스텀 Alert
		 * 
		 * 사용법:
		 * [케이스 1: 제목 없이 메시지만] (첫 번째 이미지 형태)
		 * - CustomDialog.alert("이름을 입력해 주세요.")
		 * - CustomDialog.alert("이름을 입력해 주세요.", 1)  // 아이콘 1(경고)
		 * - CustomDialog.alert("이름을 입력해 주세요.", 0)  // 아이콘 0(숨김)
		 * 
		 * [케이스 2: 제목 + 메시지 둘 다] (두 번째 이미지 형태)
		 * - CustomDialog.alert("약관 동의 안내", "모든 필수 약관에 동의해 주세요.")
		 * - CustomDialog.alert("약관 동의 안내", "모든 필수 약관에 동의해 주세요.", 1)
		 * - CustomDialog.alert("약관 동의 안내", "모든 필수 약관에 동의해 주세요.", 0)
		 */
		alert: function (arg1, arg2, arg3) {
			var opts = normalizeOptions(arg1, arg2, arg3, false);
			return open(opts);
		},

		/**
		 * 커스텀 Confirm
		 * 
		 * 사용법:
		 * - CustomDialog.confirm("정말 삭제하시겠습니까?")
		 * - CustomDialog.confirm("삭제 안내", "정말 삭제하시겠습니까?", 1)
		 */
		confirm: function (arg1, arg2, arg3) {
			var opts = normalizeOptions(arg1, arg2, arg3, true);
			return open(opts);
		},

		close: close
	};

	// 전역 헬퍼 등록
	global.CustomDialog = CustomDialog;
	global.customAlert = CustomDialog.alert;
	global.customConfirm = CustomDialog.confirm;

})(typeof window !== 'undefined' ? window : this);
