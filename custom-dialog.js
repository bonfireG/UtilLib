/**
 * ============================================================================
 * [독립형 반응형 커스텀 Alert / Confirm 다이얼로그 모듈]
 * 파일명: custom-dialog.js
 * 
 * - 외부 라이브러리 및 별도 CSS 파일 불필요 (단일 JS 파일로 완벽 동작)
 * - Promise(async/await) 및 콜백 완벽 지원
 * - 모바일/태블릿/데스크탑 100% 반응형 지원
 * - 인라인 SVG 고화질 아이콘 내장 (warning, error, success, info, question)
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
			'  background-color: rgba(15, 23, 42, 0.5);' +
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
			'  border-radius: 18px;' +
			'  box-shadow: 0 20px 35px -5px rgba(0, 0, 0, 0.18), 0 10px 15px -5px rgba(0, 0, 0, 0.06);' +
			'  padding: 26px 22px 20px;' +
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
			'/* 아이콘 영역 */' +
			'.custom-dlg-icon-wrap {' +
			'  width: 54px;' +
			'  height: 54px;' +
			'  margin: 0 auto 16px;' +
			'  border-radius: 50%;' +
			'  display: flex;' +
			'  align-items: center;' +
			'  justify-content: center;' +
			'}' +
			'.custom-dlg-icon-wrap svg {' +
			'  width: 28px;' +
			'  height: 28px;' +
			'  display: block;' +
			'}' +
			'.custom-dlg-icon-wrap.type-warning { background: #FEF3C7; color: #D97706; }' +
			'.custom-dlg-icon-wrap.type-error { background: #FEE2E2; color: #DC2626; }' +
			'.custom-dlg-icon-wrap.type-success { background: #D1FAE5; color: #059669; }' +
			'.custom-dlg-icon-wrap.type-info { background: #EEF2FF; color: #4F46E5; }' +
			'.custom-dlg-icon-wrap.type-question { background: #E0E7FF; color: #4338CA; }' +
			'/* 타이틀 & 메시지 */' +
			'.custom-dlg-title {' +
			'  font-size: 1.15rem;' +
			'  font-weight: 700;' +
			'  color: #1e293b;' +
			'  margin: 0 0 8px 0;' +
			'  word-break: keep-all;' +
			'  line-height: 1.4;' +
			'}' +
			'.custom-dlg-message {' +
			'  font-size: 0.95rem;' +
			'  color: #64748b;' +
			'  line-height: 1.55;' +
			'  margin: 0 0 22px 0;' +
			'  word-break: keep-all;' +
			'  white-space: pre-wrap;' +
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
			'  min-height: 44px;' +
			'  padding: 10px 18px;' +
			'  border: none;' +
			'  border-radius: 10px;' +
			'  font-size: 0.95rem;' +
			'  font-weight: 600;' +
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
			'  background: linear-gradient(135deg, #6964DB 0%, #5E3BEE 100%);' +
			'  color: #ffffff;' +
			'  box-shadow: 0 4px 12px rgba(105, 100, 219, 0.3);' +
			'}' +
			'.custom-dlg-btn.btn-confirm:hover {' +
			'  background: linear-gradient(135deg, #5b56cf 0%, #5130dd 100%);' +
			'  box-shadow: 0 6px 16px rgba(105, 100, 219, 0.4);' +
			'}' +
			'.custom-dlg-btn.btn-cancel {' +
			'  background: #f1f5f9;' +
			'  color: #475569;' +
			'}' +
			'.custom-dlg-btn.btn-cancel:hover {' +
			'  background: #e2e8f0;' +
			'  color: #1e293b;' +
			'}' +
			'/* 모바일 화면 (가로 480px 이하) 반응형 스타일 */' +
			'@media (max-width: 480px) {' +
			'  .custom-dlg-box {' +
			'    max-width: 100%;' +
			'    padding: 22px 16px 18px;' +
			'    border-radius: 16px;' +
			'  }' +
			'  .custom-dlg-icon-wrap {' +
			'    width: 48px;' +
			'    height: 48px;' +
			'    margin-bottom: 12px;' +
			'  }' +
			'  .custom-dlg-icon-wrap svg {' +
			'    width: 24px;' +
			'    height: 24px;' +
			'  }' +
			'  .custom-dlg-title {' +
			'    font-size: 1.05rem;' +
			'  }' +
			'  .custom-dlg-message {' +
			'    font-size: 0.9rem;' +
			'    margin-bottom: 18px;' +
			'  }' +
			'  .custom-dlg-btn {' +
			'    min-height: 42px;' +
			'    font-size: 0.9rem;' +
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
		warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
		error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
		success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
		info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
		question: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
	};

	var overlay = null;
	var iconWrapEl, titleEl, messageEl, cancelBtn, confirmBtn;
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

	function open(opts) {
		init();
		currentOptions = opts || {};

		var message = currentOptions.message || '';
		var title = currentOptions.title || '';
		var type = currentOptions.type || (currentOptions.isConfirm ? 'question' : 'warning');
		var confirmText = currentOptions.confirmText || '확인';
		var cancelText = currentOptions.cancelText || '취소';
		var isConfirm = !!currentOptions.isConfirm;

		// 아이콘
		iconWrapEl.className = 'custom-dlg-icon-wrap type-' + type;
		iconWrapEl.innerHTML = ICONS[type] || ICONS.info;
		iconWrapEl.style.display = currentOptions.showIcon === false ? 'none' : 'flex';

		// 타이틀
		if (title) {
			titleEl.textContent = title;
			titleEl.style.display = 'block';
		} else {
			titleEl.style.display = 'none';
		}

		// 메시지
		messageEl.textContent = message;

		// 버튼 제어
		confirmBtn.textContent = confirmText;
		cancelBtn.textContent = cancelText;
		cancelBtn.style.display = isConfirm ? 'inline-flex' : 'none';

		// 모달 활성화 및 배경 스크롤 방지
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
		 * @param {string} message 알림 메시지
		 * @param {string} [title] 알림 제목
		 * @param {Object} [options] 추가 옵션 (type: 'warning'|'error'|'success'|'info', confirmText, onConfirm, showIcon)
		 * @returns {Promise<boolean>}
		 */
		alert: function (message, title, options) {
			var opts = typeof title === 'object' ? title : (options || {});
			if (typeof title === 'string') opts.title = title;
			opts.message = message;
			opts.isConfirm = false;
			return open(opts);
		},

		/**
		 * 커스텀 Confirm
		 * @param {string} message 확인 질문 메시지
		 * @param {string} [title] 확인창 제목
		 * @param {Object} [options] 추가 옵션 (type: 'question'|'warning'|'info', confirmText, cancelText, onConfirm, onCancel, showIcon)
		 * @returns {Promise<boolean>} 사용자가 확인 누르면 true, 취소/ESC 시 false 반환
		 */
		confirm: function (message, title, options) {
			var opts = typeof title === 'object' ? title : (options || {});
			if (typeof title === 'string') opts.title = title;
			opts.message = message;
			opts.isConfirm = true;
			return open(opts);
		},

		close: close
	};

	// 전역 변수 등록
	global.CustomDialog = CustomDialog;
	global.customAlert = CustomDialog.alert;
	global.customConfirm = CustomDialog.confirm;

})(typeof window !== 'undefined' ? window : this);
