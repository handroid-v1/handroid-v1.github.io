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
  const fade = clamp(progress * 2.65);
  root.style.setProperty("--hero-shade", String(1 - fade * 0.32));
  root.style.setProperty("--title-y", `${-progress * 260}px`);
  root.style.setProperty("--title-opacity", String(1 - fade));
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
const carouselShell = document.querySelector("[data-carousel-shell]");
const carouselArrows = [...document.querySelectorAll("[data-carousel-arrow]")];

let videoObserver;

const prepareAutoplayVideo = (video) => {
  if (video.dataset.prepared === "true") return;

  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "none";

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
      <button class="video-modal-close" type="button" aria-label="Close video preview"></button>
      <video controls loop playsinline></video>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
};

const videoModal = createVideoModal();
const modalVideo = videoModal.querySelector("video");
const modalClose = videoModal.querySelector(".video-modal-close");

const closeVideoModal = () => {
  videoModal.classList.remove("is-open");
  videoModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  modalVideo.pause();
  modalVideo.removeAttribute("src");
  modalVideo.removeAttribute("poster");
  modalVideo.load();
};

const openVideoModal = (card) => {
  const src = getVideoSource(card);
  if (!src) return;

  const cardVideo = card.querySelector("video");
  modalVideo.src = src;
  modalVideo.poster = cardVideo?.getAttribute("poster") || "";
  modalVideo.muted = true;
  modalVideo.currentTime = 0;
  videoModal.classList.add("is-open");
  videoModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  const playPromise = modalVideo.play();
  if (playPromise) {
    playPromise.catch(() => {});
  }
  modalClose.focus();
};

modalClose.addEventListener("click", closeVideoModal);
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

if (carousel && carouselViewport && carouselShell) {
  const cards = [...carousel.querySelectorAll(".portrait-demo")];

  carouselShell.addEventListener("pointerenter", () => {
    carouselShell.classList.add("is-hovered");
  });

  carouselShell.addEventListener("pointerleave", () => {
    carouselShell.classList.remove("is-hovered");
  });

  const carouselMaxScroll = () => Math.max(0, carouselViewport.scrollWidth - carouselViewport.clientWidth);

  const carouselStep = () => {
    const card = cards[0];
    const cardWidth = card?.getBoundingClientRect().width || 260;
    const gap = parseFloat(window.getComputedStyle(carousel).columnGap) || 18;
    return Math.max(cardWidth + gap, carouselViewport.clientWidth * 0.78);
  };

  const scrollCarousel = (direction) => {
    const maxScroll = carouselMaxScroll();
    if (maxScroll <= 1) return;

    const current = carouselViewport.scrollLeft;
    const step = carouselStep();
    let next = current + direction * step;

    if (direction > 0 && next >= maxScroll - 4) {
      next = 0;
    } else if (direction < 0 && next <= 4) {
      next = maxScroll;
    } else {
      next = clamp(next, 0, maxScroll);
    }

    carouselViewport.scrollTo({ left: next, behavior: "smooth" });
  };

  carouselArrows.forEach((button) => {
    button.addEventListener("click", () => {
      scrollCarousel(button.dataset.carouselArrow === "prev" ? -1 : 1);
    });
  });

  cards.forEach((card) => {
    const title = card.querySelector("h3")?.textContent?.trim() || "demo";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Open ${title} video`);
    card.addEventListener("click", () => openVideoModal(card));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openVideoModal(card);
      }
    });
  });
}

window.addEventListener("scroll", requestUpdate, { passive: true });
window.addEventListener("resize", requestUpdate);
window.addEventListener("load", update);
update();
