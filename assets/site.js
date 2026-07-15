const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const root = document.documentElement;
const header = document.querySelector("[data-header]");
const hero = document.querySelector("[data-hero]");
const morph = document.querySelector("[data-morphology]");
const progressBar = document.querySelector("[data-progress-bar]");

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
  const fade = clamp(progress * 3.1);
  const shadeFade = clamp(progress * 4.8);
  root.style.setProperty("--hero-shade", String(1 - shadeFade * 0.68));
  root.style.setProperty("--title-y", `${-progress * 420}px`);
  root.style.setProperty("--title-opacity", String(1 - fade));
  root.style.setProperty("--cue-opacity", String(clamp(1 - progress * 3.2)));
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
const replayButton = document.querySelector("[data-replay-button]");
const replayVideo = document.querySelector("[data-replay-video]");

let videoObserver;

const prepareAutoplayVideo = (video) => {
  if (video.dataset.prepared === "true") return;

  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "none";
  video.playbackRate = Number(video.dataset.playbackRate || 1);

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
  video.playbackRate = Number(video.dataset.playbackRate || 1);
  const playPromise = video.play();
  if (playPromise) {
    playPromise.catch(() => {});
  }
};

const observeAutoplayVideo = (video) => {
  prepareAutoplayVideo(video);
  if (videoObserver) {
    videoObserver.observe(video);
  } else {
    playVisibleVideo(video);
  }
};

if ("IntersectionObserver" in window) {
  videoObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      if (entry.isIntersecting) {
        playVisibleVideo(video);
      } else {
        video.pause();
      }
    });
  }, { threshold: 0.18, rootMargin: "420px 0px" });
}

document.querySelectorAll("video").forEach(observeAutoplayVideo);

replayButton?.addEventListener("click", () => {
  if (!replayVideo) return;

  loadVideo(replayVideo);
  replayVideo.currentTime = 0;
  const playPromise = replayVideo.play();
  if (playPromise) {
    playPromise.catch(() => {});
  }
});

if (carousel && carouselViewport && carouselRange) {
  let carouselLastFrame = performance.now();
  let carouselHover = false;
  let carouselDragging = false;
  let carouselStartX = 0;
  let carouselStartScroll = 0;
  const carouselSpeed = 48;

  const carouselMaxScroll = () => Math.max(1, carouselViewport.scrollWidth - carouselViewport.clientWidth);

  const updateCarouselRange = () => {
    carouselRange.value = String((carouselViewport.scrollLeft / carouselMaxScroll()) * 100);
  };

  const animateCarousel = (time) => {
    const deltaSeconds = Math.min(0.05, (time - carouselLastFrame) / 1000);
    carouselLastFrame = time;

    if (!carouselHover && !carouselDragging) {
      const maxScroll = carouselMaxScroll();
      const nextScroll = carouselViewport.scrollLeft + deltaSeconds * carouselSpeed;
      carouselViewport.scrollLeft = nextScroll >= maxScroll ? 0 : nextScroll;
      updateCarouselRange();
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
    carouselDragging = true;
    carouselStartX = event.clientX;
    carouselStartScroll = carouselViewport.scrollLeft;
    carouselViewport.classList.add("is-dragging");
    carouselViewport.setPointerCapture(event.pointerId);
  });

  carouselViewport.addEventListener("pointermove", (event) => {
    if (!carouselDragging) return;
    carouselViewport.scrollLeft = carouselStartScroll - (event.clientX - carouselStartX);
    updateCarouselRange();
  });

  const stopCarouselDrag = (event) => {
    if (!carouselDragging) return;
    carouselDragging = false;
    carouselViewport.classList.remove("is-dragging");
    if (carouselViewport.hasPointerCapture(event.pointerId)) {
      carouselViewport.releasePointerCapture(event.pointerId);
    }
  };

  carouselViewport.addEventListener("pointerup", stopCarouselDrag);
  carouselViewport.addEventListener("pointercancel", stopCarouselDrag);

  carouselRange.addEventListener("input", () => {
    carouselViewport.scrollLeft = (Number(carouselRange.value) / 100) * carouselMaxScroll();
  });

  carouselViewport.addEventListener("scroll", updateCarouselRange, { passive: true });
  window.addEventListener("resize", updateCarouselRange);
  updateCarouselRange();
  window.requestAnimationFrame(animateCarousel);
}

window.addEventListener("scroll", requestUpdate, { passive: true });
window.addEventListener("resize", requestUpdate);
window.addEventListener("load", update);
update();
