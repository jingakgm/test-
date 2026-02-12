$(function () {
  const cfg = window.FLIPBOOK_CONFIG;
  const $book = $("#book");
  const $viewport = $("#book-viewport");
  
  const info = (cfg && cfg.bookInfo) ? cfg.bookInfo : { totalPages: 108, imageType: "webp", thumbType: "webp" };
  const TOTAL_PAGES = info.totalPages;
  const imgExt = info.imageType;
  const thumbExt = info.thumbType;

  const $slider = $("#page-slider");
  const $track = $("#thumb-track");
  const $scrollbar = $("#thumb-scrollbar");
  const $scrollContainer = $("#thumb-scroll-container");
  
  let imgRatio = 1.414;
  let isSoundEnabled = true;
  let isAnimEnabled = true;
  let lastWidth = $(window).width();
  let resizeTimer;

  // --- 1. 기능 함수 ---

  function loadPageImage(page) {
    if (!page || isNaN(page) || page < 1 || page > TOTAL_PAGES) return;
    setTimeout(() => {
      const $page = $book.find(".p" + page);
      if ($page.length && !$page.data("loaded")) {
        const num = String(page).padStart(3, "0");
        const imgUrl = `spreads/page-${num}.${imgExt}`;
        $page.html(`<img src="${imgUrl}" style="width:100%; height:100%; object-fit:contain; display:block;" />`);
        $page.data("loaded", true);
      }
    }, 1);
  }

  function getDisplayMode() {
    const windowWidth = $(window).width();
    const windowHeight = $(window).height();
    return (windowWidth >= 1024 || windowHeight <= windowWidth) ? "double" : "single";
  }

  function updateBookSize() {
    const currentWidth = $(window).width();
    if (Math.abs(currentWidth - lastWidth) < 10 && $book.data("done")) return;
    lastWidth = currentWidth;
    const vW = $viewport.width() * 0.94;
    const vH = $viewport.height() * 0.94;
    const mode = getDisplayMode();
    const targetRatio = (mode === "double") ? imgRatio * 2 : imgRatio;
    let w, h;
    if (vW / vH > targetRatio) { h = vH; w = h * targetRatio; }
    else { w = vW; h = w / targetRatio; }
    
    if ($book.data("done")) {
      if ($book.turn("display") !== mode) $book.turn("display", mode);
      $book.turn("size", Math.floor(w), Math.floor(h));
    } else {
      $book.css({ width: Math.floor(w), height: Math.floor(h) });
    }
  }

  function updateTooltip(page) {
    const $tooltip = $("#slider-tooltip");
    const percent = (page - 1) / (TOTAL_PAGES - 1);
    $tooltip.text(page + "P").css("left", (percent * 100) + "%");
  }

  function buildThumbnails() {
    $track.empty();
    for (let i = 1; i <= TOTAL_PAGES; i += 2) {
      const nextP = (i + 1 <= TOTAL_PAGES) ? i + 1 : i;
      const label = (i === nextP) ? `${i}P` : `${i}-${nextP}`;
      const thumb = $(`
        <div class="thumb-item" data-page="${i}">
          <div class="thumb-img-container">
            <img src="thumbs/page-${String(i).padStart(3, '0')}.${thumbExt}" loading="lazy" />
            <div class="thumb-overlay">${label}</div>
          </div>
        </div>
      `);
      thumb.on("click", function(e) {
        e.stopPropagation();
        $book.turn("page", parseInt($(this).attr("data-page")));
        setTimeout(() => { $("#thumb-panel").removeClass("open"); }, 200);
      });
      $track.append(thumb);
    }
    setTimeout(() => {
      const scrollWidth = $track[0].scrollWidth;
      const visibleWidth = $track.width();
      if (scrollWidth > visibleWidth) {
        let barWidth = (visibleWidth / scrollWidth) * $scrollContainer.width();
        $scrollbar.css("width", Math.max(30, barWidth) + "px").show();
      } else { $scrollbar.hide(); }
    }, 500);
  }

  // --- 2. 초기화 ---

  for (let i = 1; i <= TOTAL_PAGES; i++) { $book.append($('<div />', { class: 'page p' + i })); }
  
  const firstImg = new Image();
  firstImg.src = `spreads/page-001.${imgExt}`;
  firstImg.onload = function() {
    imgRatio = firstImg.width / firstImg.height;
    updateBookSize();
    $book.turn({
      pages: TOTAL_PAGES,
      display: getDisplayMode(),
      duration: cfg.flip.duration,
      acceleration: true,
      gradients: true,
      elevation: 50,
      when: {
        missing: (e, pages) => pages.forEach(p => loadPageImage(p)),
        turning: (e, page, view) => {
          if (window.isZoomed && window.isZoomed()) e.preventDefault();
          view.forEach(p => loadPageImage(p));
        },
        turned: (e, page) => {
          $("#page-input, #page-slider").val(page);
          $("#page-label-spread").text(page + " / " + TOTAL_PAGES);
          updateTooltip(page);

          const $thumbs = $(".thumb-item");
          $thumbs.removeClass("active");
          const spreadStart = (page % 2 === 0) ? page - 1 : page;
          const $activeThumb = $thumbs.filter(`[data-page="${spreadStart}"]`).addClass("active");

          if (isSoundEnabled) {
            const audio = document.getElementById("audio-flip");
            if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
          }

          if ($activeThumb.length) {
            const scrollPos = $activeThumb.position().left + $track.scrollLeft() - ($track.width() / 2) + ($activeThumb.width() / 2);
            $track.stop().animate({ scrollLeft: scrollPos }, {
              duration: 300,
              step: function() {
                const currentPercent = $track.scrollLeft() / ($track[0].scrollWidth - $track[0].clientWidth);
                const barLeft = currentPercent * ($scrollContainer.width() - $scrollbar.width());
                $scrollbar.css("left", barLeft + "px");
              }
            });
          }
          const currentDuration = isAnimEnabled ? (cfg.flip.duration || 800) : 180;
          $book.turn("options", { duration: currentDuration });
        }
      }
    });
    $book.data("done", true);
    $("#loading-overlay").fadeOut(400);
    loadPageImage(1);
    buildThumbnails();
  };

  // --- 3. UI 및 컨트롤 핸들러 ---

  $("#thumb-toggle").on("click", function(e) {
    e.preventDefault(); e.stopPropagation();
    $("#thumb-panel").toggleClass("open");
  });

  $("#btnPrev").on("click", () => $book.turn("previous"));
  $("#btnNext").on("click", () => $book.turn("next"));
  $("#btnSound").on("click", function(e) { 
    e.stopPropagation();
    isSoundEnabled = !isSoundEnabled; 
    $(this).text(isSoundEnabled ? "🔊" : "🔇"); 
  });

  $("#btnAnim").on("click", function(e) { 
    e.preventDefault(); e.stopPropagation(); 
    isAnimEnabled = !isAnimEnabled; 
    const targetDuration = isAnimEnabled ? (cfg.flip.duration || 800) : 180;
    $book.turn("options", { duration: targetDuration, gradients: isAnimEnabled }); 
    $(this).text(isAnimEnabled ? "✨" : "⚡");
  });

  $("#btnFullscreen").on("click", function() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      $(this).text("🔲");
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        $(this).text("🔳");
      }
    }
  });
// 도움말 모달 열기
$("#btnHelp").on("click", function(e) {
  e.preventDefault();
  e.stopPropagation();
  $("#help-modal").addClass("open"); // 도움말 창 열기
});

// 도움말 모달 닫기 (X 버튼 또는 배경 클릭 시)
$("#btnCloseHelp, #help-modal").on("click", function(e) {
  // 모달 콘텐츠 자체를 클릭했을 때는 닫히지 않도록 방어
  if (e.target !== this && e.target.id !== "btnCloseHelp") return;
  $("#help-modal").removeClass("open");
});
  // --- 4. 탐색 제어 (슬라이더, 휠, 키보드) ---

  $slider.on("input", function() { $("#slider-tooltip").addClass("show"); updateTooltip($(this).val()); });
  $slider.on("change", function() { $book.turn("page", $(this).val()); setTimeout(() => $("#slider-tooltip").removeClass("show"), 1000); });

  $viewport.on("wheel", function(e) {
    if (window.isZoomed && window.isZoomed()) return;
    if (e.originalEvent.deltaY > 0) $book.turn("next");
    else $book.turn("previous");
    e.preventDefault();
  });

  $(document).keydown(function(e) {
    if (window.isZoomed && window.isZoomed()) return;
    switch(e.keyCode) {
      case 37: $book.turn("previous"); break;
      case 39: $book.turn("next"); break;
      case 36: $book.turn("page", 1); break;
      case 35: $book.turn("page", TOTAL_PAGES); break;
    }
  });

  $("#page-input").on("keydown", function(e) {
    if (e.key === "Enter") {
      let page = parseInt($(this).val());
      if (!isNaN(page) && page >= 1 && page <= TOTAL_PAGES) $book.turn("page", page);
      else $(this).val($book.turn("page"));
    }
  });

  // --- 5. 썸네일 스크롤바 드래그 로직 ---

  let isBarDragging = false;
  let barStartX;

  $scrollbar.on("mousedown touchstart", function(e) {
    isBarDragging = true;
    barStartX = (e.pageX || e.originalEvent.touches[0].pageX) - $scrollbar.position().left;
    $scrollbar.addClass("dragging");
    e.preventDefault();
  });

  $(window).on("mousemove touchmove", function(e) {
    if (!isBarDragging) return;
    let moveX = (e.pageX || e.originalEvent.touches[0].pageX) - barStartX;
    const maxLeft = $scrollContainer.width() - $scrollbar.width();
    moveX = Math.max(0, Math.min(maxLeft, moveX));
    $scrollbar.css("left", moveX + "px");
    const scrollPercent = moveX / maxLeft;
    const targetScroll = scrollPercent * ($track[0].scrollWidth - $track[0].clientWidth);
    $track.scrollLeft(targetScroll);
  });

  $(window).on("mouseup touchend", function() {
    isBarDragging = false;
    $scrollbar.removeClass("dragging");
  });

  // --- 6. 기타 방어 로직 및 리사이즈 ---

  const preventTargets = "#ui-footer, #ui-footer *, #thumb-toggle, #thumb-panel, #help-modal";
  $(preventTargets).on("dblclick dbltap", function(e) {
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    return false;
  });

  const hardPrevent = (e) => { if (e.detail > 1) { e.preventDefault(); e.stopImmediatePropagation(); } };
  const footer = document.getElementById("ui-footer");
  const thumbToggle = document.getElementById("thumb-toggle");
  if (footer) footer.addEventListener("click", hardPrevent, true);
  if (thumbToggle) thumbToggle.addEventListener("click", hardPrevent, true);

  $("#ui-footer").on("click mousedown touchstart dblclick", function(e) {
    if (window.isZoomed && window.isZoomed()) {
      if (typeof zoomLevel !== 'undefined' && zoomLevel !== 1) {
        zoomLevel = 1; offsetX = 0; offsetY = 0;
        if (typeof applyTransform === 'function') applyTransform();
      }
    }
    if (e.type === 'dblclick' || (e.type === 'click' && e.detail > 1)) {
      e.preventDefault(); e.stopImmediatePropagation();
    }
    e.stopPropagation();
  });

  $(window).on("resize", function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateBookSize, 200);
  });
});