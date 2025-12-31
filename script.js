// script.js
// 목표
// - 데스크탑: 트랙패드/마우스 휠 "기본 스크롤"을 살리고, 스크롤이 멈추면 가장 가까운 슬라이드로 스냅
// - 모바일: 스와이프 고무줄 저항감 + 릴리즈 시 한 장씩 스냅
//
// 주의: 이 파일에는 JS만 넣으세요. CSS를 섞으면 전체가 깨집니다.

const stage = document.getElementById("stage");
const slides = stage ? Array.from(stage.querySelectorAll(".slide")) : [];

if (!stage || slides.length === 0) {
  console.warn("[story] stage 또는 slide를 찾지 못했습니다. (id='stage', .slide 확인)");
} else {
  const DESKTOP_MEDIA = "(min-width: 900px)";
  let isDesktop = window.matchMedia(DESKTOP_MEDIA).matches;

  let index = 0;

  function clampIndex(i) {
    return Math.max(0, Math.min(slides.length - 1, i));
  }

  function pageH() {
    return stage.clientHeight;
  }

  function syncIndexFromScroll() {
    const h = pageH();
    if (!h) return;
    index = clampIndex(Math.round(stage.scrollTop / h));
  }

  function goTo(i, behavior = "smooth") {
    index = clampIndex(i);
    stage.scrollTo({ top: index * pageH(), left: 0, behavior });
  }

  // ----------------------------
  // Desktop: 기본 스크롤 + "멈추면 스냅"
  // (트랙패드/관성 스크롤을 죽이지 않음)
  // ----------------------------
  let desktopSnapTimer = null;

  function onDesktopScroll() {
    if (!isDesktop) return;

    // 스크롤 중에는 타이머 리셋, 멈춘 뒤 스냅
    clearTimeout(desktopSnapTimer);
    desktopSnapTimer = setTimeout(() => {
      syncIndexFromScroll();
      goTo(index, "smooth");
    }, 90);
  }

  // ----------------------------
  // Mobile: 고무줄 스와이프 + 한 장씩 스냅
  // ----------------------------
  let startY = 0;
  let lastY = 0;
  let startTime = 0;
  let dragging = false;

  let targetTop = 0;
  let currentTop = 0;
  let springRaf = null;

  // 스와이프 판정
  const MIN_DIST = 55;
  const MAX_TIME = 500;

  // 고무줄 느낌(취향)
  const DRAG_FOLLOW = 0.35;
  const EDGE_RESIST = 0.22;
  const RELEASE_SNAP = 0.22;

  function maxScrollTop() {
    return (slides.length - 1) * pageH();
  }

  function springApply() {
    const diff = targetTop - currentTop;
    currentTop += diff * RELEASE_SNAP;
    stage.scrollTop = currentTop;

    if (Math.abs(diff) > 0.5) {
      springRaf = requestAnimationFrame(springApply);
    } else {
      currentTop = targetTop;
      stage.scrollTop = currentTop;
      springRaf = null;
      syncIndexFromScroll();
    }
  }

  function springStart() {
    if (!springRaf) springRaf = requestAnimationFrame(springApply);
  }

  function onTouchStart(e) {
    if (isDesktop) return;
    if (e.touches.length !== 1) return;

    dragging = true;
    syncIndexFromScroll();

    startY = e.touches[0].clientY;
    lastY = startY;
    startTime = performance.now();

    currentTop = stage.scrollTop;
    targetTop = currentTop;

    if (springRaf) cancelAnimationFrame(springRaf);
    springRaf = null;
  }

  function onTouchMove(e) {
    if (isDesktop) return;
    if (!dragging) return;
    e.preventDefault();

    const y = e.touches[0].clientY;
    const dy = y - lastY;
    lastY = y;

    let proposed = targetTop - dy;

    const minTop = 0;
    const maxTop = maxScrollTop();

    if (proposed < minTop) {
      const over = proposed - minTop;
      proposed = minTop + over * EDGE_RESIST;
    } else if (proposed > maxTop) {
      const over = proposed - maxTop;
      proposed = maxTop + over * EDGE_RESIST;
    }

    targetTop = targetTop + (proposed - targetTop) * DRAG_FOLLOW;
    springStart();
  }

  function onTouchEnd() {
    if (isDesktop) return;
    if (!dragging) return;
    dragging = false;

    const dt = performance.now() - startTime;
    const totalDy = lastY - startY;

    const farEnough = Math.abs(totalDy) >= MIN_DIST;
    const fastEnough = dt <= MAX_TIME;

    syncIndexFromScroll();

    if (farEnough && fastEnough) {
      if (totalDy < 0) index = clampIndex(index + 1);
      else index = clampIndex(index - 1);
    }

    targetTop = index * pageH();
    springStart();
  }

  let mobileScrollTimer = null;
  function onMobileScroll() {
    if (isDesktop) return;
    if (dragging) return;

    clearTimeout(mobileScrollTimer);
    mobileScrollTimer = setTimeout(() => {
      syncIndexFromScroll();
      targetTop = index * pageH();
      currentTop = stage.scrollTop;
      springStart();
    }, 90);
  }

  // ----------------------------
  // 모드 업데이트
  // ----------------------------
  function applyMode() {
    syncIndexFromScroll();
    goTo(index, "auto");
  }

  const mq = window.matchMedia(DESKTOP_MEDIA);
  const onMq = (e) => {
    isDesktop = e.matches;
    applyMode();
  };
  if (mq.addEventListener) mq.addEventListener("change", onMq);
  else mq.addListener(onMq);

  window.addEventListener("resize", () => goTo(index, "auto"));

  // 키보드(데스크탑 전시용)
  window.addEventListener("keydown", (e) => {
    if (!isDesktop) return;
    if (e.key === "ArrowDown" || e.key === "PageDown") goTo(index + 1);
    if (e.key === "ArrowUp" || e.key === "PageUp") goTo(index - 1);
    if (e.key === "Home") goTo(0);
    if (e.key === "End") goTo(slides.length - 1);
  });

  // 이벤트 바인딩
  stage.addEventListener("scroll", onDesktopScroll);
  stage.addEventListener("scroll", onMobileScroll);

  stage.addEventListener("touchstart", onTouchStart, { passive: true });
  stage.addEventListener("touchmove", onTouchMove, { passive: false });
  stage.addEventListener("touchend", onTouchEnd, { passive: true });

  // 시작 위치
  goTo(0, "auto");
}