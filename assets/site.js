const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const root = document.documentElement;
const header = document.querySelector("[data-header]");
const hero = document.querySelector("[data-hero]");
const morph = document.querySelector("[data-morphology]");
const progressBar = document.querySelector("[data-progress-bar]");
const heroContent = document.querySelector("[data-hero-content]");
const navToggle = document.querySelector(".nav-toggle");
const primaryNav = document.querySelector("#primary-nav");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let ticking = false;

const easeInOut = (progress) => (
  progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2
);

const sectionProgress = (section) => {
  const rect = section.getBoundingClientRect();
  const travel = Math.max(1, rect.height - window.innerHeight);
  return clamp((0 - rect.top) / travel);
};

const updateHero = () => {
  if (!hero) return;

  const progress = sectionProgress(hero);
  const fade = clamp(progress * 2.65);
  root.style.setProperty("--hero-shade", String(1 - fade * 0.32));
  root.style.setProperty("--title-y", reduceMotion.matches ? "0px" : `${-progress * 260}px`);
  root.style.setProperty("--title-opacity", String(1 - fade));

  if (heroContent) {
    const hidden = fade > 0.98;
    heroContent.inert = hidden;
    heroContent.setAttribute("aria-hidden", String(hidden));
  }
};

const updateMorph = () => {
  if (!morph) return;

  const progress = sectionProgress(morph);
  const eased = easeInOut(progress);
  const humanoidActive = eased > 0.5;

  root.style.setProperty("--morph-progress", eased.toFixed(4));
  root.style.setProperty("--light-x", `${35 + eased * 42}%`);
  root.style.setProperty("--active-model", humanoidActive ? "1" : "0");
  root.style.setProperty("--dex-pointer", humanoidActive ? "none" : "auto");
  root.style.setProperty("--humanoid-pointer", humanoidActive ? "auto" : "none");
  root.style.setProperty("--dex-z", humanoidActive ? "10" : "20");
  root.style.setProperty("--humanoid-z", humanoidActive ? "20" : "10");

  if (progressBar) {
    progressBar.style.width = `${eased * 100}%`;
  }
};

const updateHeader = () => {
  header?.classList.toggle("is-light", window.scrollY > window.innerHeight * 0.72);
};

const update = () => {
  updateHero();
  updateMorph();
  updateHeader();
  ticking = false;
};

const requestUpdate = () => {
  if (ticking) return;
  ticking = true;
  window.requestAnimationFrame(update);
};

const carouselViewport = document.querySelector("[data-carousel]");
const carousel = document.querySelector("[data-carousel-track]");
const carouselRange = document.querySelector("[data-carousel-range]");

let videoObserver;
let carouselVideoObserver;

const handleVideoVisibility = (entries) => {
  entries.forEach((entry) => {
    const video = entry.target;
    if (entry.isIntersecting) {
      playVisibleVideo(video);
    } else {
      video.pause();
    }
  });
};

const prepareAutoplayVideo = (video) => {
  if (video.dataset.prepared === "true") return;

  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "none";

  if (reduceMotion.matches) {
    video.autoplay = false;
    video.removeAttribute("autoplay");
    video.pause();
    if (!video.closest(".scene-media")) video.controls = true;
    video.dataset.prepared = "true";
    return;
  }

  video.querySelectorAll("source").forEach((source) => {
    source.dataset.src = source.getAttribute("src") || source.dataset.src;
    source.removeAttribute("src");
  });
  video.dataset.prepared = "true";
  video.load();
};

const loadVideo = (video) => {
  if (video.dataset.loaded === "true") return;

  video.querySelectorAll("source").forEach((source) => {
    source.setAttribute("src", source.dataset.src);
  });
  video.dataset.loaded = "true";
  video.load();
};

const playVisibleVideo = (video) => {
  loadVideo(video);
  const playPromise = video.play();
  if (playPromise) {
    playPromise.catch(() => {
      if (!video.closest(".scene-media")) video.controls = true;
    });
  }
};

const observeAutoplayVideo = (video) => {
  prepareAutoplayVideo(video);
  if (reduceMotion.matches) return;

  if (video.closest(".carousel-viewport") && carouselVideoObserver) {
    carouselVideoObserver.observe(video);
  } else if (videoObserver) {
    videoObserver.observe(video);
  } else {
    playVisibleVideo(video);
  }
};

if ("IntersectionObserver" in window) {
  videoObserver = new IntersectionObserver(handleVideoVisibility, {
    threshold: 0.18,
    rootMargin: "420px 0px"
  });
  carouselVideoObserver = new IntersectionObserver(handleVideoVisibility, {
    threshold: 0.72,
    rootMargin: "0px"
  });
}

document.querySelectorAll("video").forEach(observeAutoplayVideo);

const getVideoSource = (card) => {
  const source = card.querySelector("source");
  return source?.dataset.src || source?.getAttribute("src") || "";
};

const createVideoModal = () => {
  const modal = document.createElement("div");
  modal.className = "video-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="video-modal-frame" role="dialog" aria-modal="true" aria-label="Demo video preview">
      <video controls loop playsinline></video>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
};

const videoModal = createVideoModal();
const modalVideo = videoModal.querySelector("video");
const modalFrame = videoModal.querySelector(".video-modal-frame");
let modalTrigger = null;

modalFrame.tabIndex = -1;

modalVideo.addEventListener("loadedmetadata", () => {
  const ratio = modalVideo.videoWidth / Math.max(1, modalVideo.videoHeight);
  modalFrame.style.setProperty("--modal-ratio", String(ratio));
  modalFrame.style.setProperty("--modal-max-width", ratio >= 1 ? "960px" : "560px");
});

const closeVideoModal = () => {
  videoModal.classList.remove("is-open");
  videoModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  modalVideo.pause();
  modalVideo.removeAttribute("src");
  modalVideo.removeAttribute("poster");
  modalVideo.load();
  modalTrigger?.focus();
  modalTrigger = null;
};

const openVideoModal = (card) => {
  const src = getVideoSource(card);
  if (!src) return;

  const cardVideo = card.querySelector("video");
  modalTrigger = card;
  modalFrame.style.setProperty("--modal-ratio", "0.5625");
  modalFrame.style.setProperty("--modal-max-width", "560px");
  modalVideo.src = src;
  modalVideo.poster = cardVideo?.getAttribute("poster") || "";
  modalVideo.muted = true;
  modalVideo.currentTime = 0;
  videoModal.classList.add("is-open");
  videoModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  modalFrame.focus();
  const playPromise = modalVideo.play();
  if (playPromise) {
    playPromise.catch(() => {});
  }
};

videoModal.addEventListener("click", (event) => {
  if (event.target === videoModal) {
    closeVideoModal();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && videoModal.classList.contains("is-open")) {
    closeVideoModal();
  }
});

if (carousel && carouselViewport && carouselRange) {
  const cards = [...carousel.querySelectorAll(".portrait-demo")];
  let carouselLastFrame = performance.now();
  let carouselHover = false;
  let carouselDragging = false;
  let carouselMoved = false;
  let carouselUserPaused = false;
  let carouselVisible = true;
  let suppressCardClick = false;
  let carouselStartX = 0;
  let carouselStartScroll = 0;
  const carouselSpeed = 48;
  const dragThreshold = 6;

  const prepareCarouselCard = (card) => {
    const title = card.querySelector("h3")?.textContent?.trim() || "demo";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Open ${title} video`);
  };

  cards.forEach((card) => prepareCarouselCard(card));

  const carouselMaxScroll = () => Math.max(0, carouselViewport.scrollWidth - carouselViewport.clientWidth);

  const updateCarouselRange = () => {
    const maxScroll = carouselMaxScroll();
    const control = carouselRange.closest(".carousel-control");
    const canScroll = maxScroll > 1;
    carouselRange.disabled = !canScroll;
    if (control) control.hidden = !canScroll;
    carouselRange.value = canScroll
      ? String((carouselViewport.scrollLeft / maxScroll) * 100)
      : "0";
  };

  const suppressNextCardClick = () => {
    suppressCardClick = true;
    window.setTimeout(() => {
      suppressCardClick = false;
    }, 0);
  };

  const animateCarousel = (time) => {
    const deltaSeconds = Math.min(0.05, (time - carouselLastFrame) / 1000);
    carouselLastFrame = time;

    if (
      carouselVisible &&
      !document.hidden &&
      !reduceMotion.matches &&
      !carouselHover &&
      !carouselDragging &&
      !carouselUserPaused
    ) {
      const maxScroll = carouselMaxScroll();
      if (maxScroll > 1) {
        const nextScroll = carouselViewport.scrollLeft + deltaSeconds * carouselSpeed;
        carouselViewport.scrollLeft = nextScroll >= maxScroll ? 0 : nextScroll;
        updateCarouselRange();
      }
    }

    window.requestAnimationFrame(animateCarousel);
  };

  carouselViewport.addEventListener("pointerenter", () => {
    carouselHover = true;
  });

  carouselViewport.addEventListener("pointerleave", () => {
    carouselHover = false;
  });

  carouselViewport.addEventListener("pointerdown", (event) => {
    carouselUserPaused = true;
    if (!event.isPrimary || event.pointerType !== "mouse" || event.button !== 0) return;

    carouselDragging = true;
    carouselMoved = false;
    carouselStartX = event.clientX;
    carouselStartScroll = carouselViewport.scrollLeft;
    carouselViewport.classList.add("is-dragging");
    carouselViewport.setPointerCapture(event.pointerId);
  });

  carouselViewport.addEventListener("pointermove", (event) => {
    if (!carouselDragging) return;

    const deltaX = event.clientX - carouselStartX;
    if (Math.abs(deltaX) > dragThreshold) {
      carouselMoved = true;
    }
    carouselViewport.scrollLeft = carouselStartScroll - deltaX;
    updateCarouselRange();
  });

  const stopCarouselDrag = (event, cancelled = false) => {
    if (!carouselDragging) return;

    carouselDragging = false;
    carouselViewport.classList.remove("is-dragging");
    if (carouselViewport.hasPointerCapture(event.pointerId)) {
      carouselViewport.releasePointerCapture(event.pointerId);
    }

    if (!cancelled && carouselMoved) {
      suppressNextCardClick();
    }
  };

  carouselViewport.addEventListener("pointerup", stopCarouselDrag);
  carouselViewport.addEventListener("pointercancel", (event) => stopCarouselDrag(event, true));

  carouselRange.addEventListener("input", () => {
    carouselUserPaused = true;
    carouselViewport.scrollLeft = (Number(carouselRange.value) / 100) * carouselMaxScroll();
  });

  carouselRange.addEventListener("pointerdown", () => {
    carouselUserPaused = true;
  });

  carouselRange.addEventListener("focus", () => {
    carouselUserPaused = true;
  });

  carouselViewport.addEventListener("scroll", updateCarouselRange, { passive: true });
  window.addEventListener("resize", updateCarouselRange);

  if ("IntersectionObserver" in window) {
    const carouselObserver = new IntersectionObserver(([entry]) => {
      carouselVisible = entry.isIntersecting;
    }, { threshold: 0.02 });
    carouselObserver.observe(carouselViewport);
  }

  carousel.addEventListener("click", (event) => {
    if (suppressCardClick) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const card = event.target.closest(".portrait-demo");
    if (card) {
      openVideoModal(card);
    }
  });

  carousel.addEventListener("keydown", (event) => {
    const card = event.target.closest(".portrait-demo");
    if (card && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openVideoModal(card);
    }
  });

  updateCarouselRange();
  window.requestAnimationFrame(animateCarousel);
}

const setNavigationOpen = (open) => {
  if (!header || !navToggle) return;
  header.classList.toggle("is-nav-open", open);
  navToggle.setAttribute("aria-expanded", String(open));
  navToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  const icon = navToggle.querySelector("[data-nav-icon]");
  if (icon) icon.textContent = open ? "\u00d7" : "\u2630";
};

navToggle?.addEventListener("click", () => {
  setNavigationOpen(navToggle.getAttribute("aria-expanded") !== "true");
});

primaryNav?.addEventListener("click", (event) => {
  if (event.target.closest("a")) setNavigationOpen(false);
});

const mobileNavigation = window.matchMedia("(max-width: 720px)");
const handleNavigationBreakpoint = (event) => {
  if (!event.matches) setNavigationOpen(false);
};

if (mobileNavigation.addEventListener) {
  mobileNavigation.addEventListener("change", handleNavigationBreakpoint);
} else {
  mobileNavigation.addListener(handleNavigationBreakpoint);
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navToggle?.getAttribute("aria-expanded") === "true") {
    setNavigationOpen(false);
    navToggle.focus();
  }
});

window.addEventListener("scroll", requestUpdate, { passive: true });
window.addEventListener("resize", requestUpdate);
window.addEventListener("load", update);
update();
