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


  let desktopSnapTimer = null;

  function onDesktopScroll() {
    if (!isDesktop) return;

    clearTimeout(desktopSnapTimer);
    desktopSnapTimer = setTimeout(() => {
      syncIndexFromScroll();
      goTo(index, "smooth");
    }, 90);
  }


  let startY = 0;
  let lastY = 0;
  let startTime = 0;
  let dragging = false;

  let targetTop = 0;
  let currentTop = 0;
  let springRaf = null;

  const MIN_DIST = 40;
  const MAX_TIME = 500;

  const DRAG_FOLLOW = 0.25;
  const EDGE_RESIST = 0.3;
  const RELEASE_SNAP = 0.15;

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

  window.addEventListener("keydown", (e) => {
    if (!isDesktop) return;
    if (e.key === "ArrowDown" || e.key === "PageDown") goTo(index + 1);
    if (e.key === "ArrowUp" || e.key === "PageUp") goTo(index - 1);
    if (e.key === "Home") goTo(0);
    if (e.key === "End") goTo(slides.length - 1);
  });

  stage.addEventListener("scroll", onDesktopScroll);
  stage.addEventListener("scroll", onMobileScroll);

  stage.addEventListener("touchstart", onTouchStart, { passive: true });
  stage.addEventListener("touchmove", onTouchMove, { passive: false });
  stage.addEventListener("touchend", onTouchEnd, { passive: true });

  // 시작 위치
  goTo(0, "auto");
}