const root = document.documentElement;
const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileMenu = document.querySelector("[data-mobile-menu]");

root.classList.add("motion-ready");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const createClickBurst = (event) => {
  if (prefersReducedMotion.matches || event.button !== 0) return;

  const burst = document.createElement("span");
  burst.className = "click-burst";
  burst.setAttribute("aria-hidden", "true");
  burst.dataset.pointer = event.pointerType || "mouse";
  burst.style.left = `${event.clientX}px`;
  burst.style.top = `${event.clientY}px`;

  const sparkCount = event.pointerType === "touch" ? 4 : 8;
  for (let index = 0; index < sparkCount; index += 1) {
    const spark = document.createElement("i");
    spark.className = "click-spark";
    spark.style.setProperty("--angle", `${index * (360 / sparkCount)}deg`);
    burst.appendChild(spark);
  }

  document.body.appendChild(burst);
  window.setTimeout(() => burst.remove(), 700);
};

document.addEventListener("pointerdown", createClickBurst, { passive: true });

let activeTouchPointer = null;
let lastTouchTrail = { x: 0, y: 0, time: 0 };

const createTouchTrail = (x, y) => {
  const trail = document.createElement("span");
  trail.className = "gesture-trail";
  trail.setAttribute("aria-hidden", "true");
  trail.style.left = `${x}px`;
  trail.style.top = `${y}px`;
  document.body.appendChild(trail);

  if (typeof trail.animate !== "function") {
    window.setTimeout(() => trail.remove(), 420);
    return;
  }

  const animation = trail.animate(
    [
      { transform: "translate(-50%, -50%) scale(.35)", opacity: .9 },
      { transform: "translate(-50%, -50%) scale(1.8)", opacity: 0 },
    ],
    { duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
  );
  animation.finished.finally(() => trail.remove());
};

document.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "touch" || activeTouchPointer !== null) return;
  activeTouchPointer = event.pointerId;
  lastTouchTrail = { x: event.clientX, y: event.clientY, time: performance.now() };
}, { passive: true });

document.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "touch" || event.pointerId !== activeTouchPointer || prefersReducedMotion.matches) return;
  const now = performance.now();
  const distance = Math.hypot(event.clientX - lastTouchTrail.x, event.clientY - lastTouchTrail.y);
  if (distance < 12 || now - lastTouchTrail.time < 24) return;
  createTouchTrail(event.clientX, event.clientY);
  lastTouchTrail = { x: event.clientX, y: event.clientY, time: now };
}, { passive: true });

const endTouchTrail = (event) => {
  if (event.pointerId === activeTouchPointer) activeTouchPointer = null;
};

document.addEventListener("pointerup", endTouchTrail, { passive: true });
document.addEventListener("pointercancel", endTouchTrail, { passive: true });

const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  },
  { rootMargin: "0px 0px -10% 0px", threshold: 0.06 },
);

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

const updateHeader = () => header.classList.toggle("scrolled", window.scrollY > 28);
updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const setMenu = (open) => {
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.textContent = open ? "关闭" : "菜单";
  mobileMenu.hidden = !open;
  document.body.classList.toggle("menu-open", open);
};

menuToggle.addEventListener("click", () => setMenu(menuToggle.getAttribute("aria-expanded") !== "true"));
mobileMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenu(false)));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
    setMenu(false);
    menuToggle.focus();
  }
});

// 对比滑块：拖动分割线比较产品资产与生成镜头
document.querySelectorAll("[data-comparison]").forEach((comparison) => {
  const range = comparison.querySelector("[data-comparison-range]");
  const sync = () => comparison.style.setProperty("--position", `${range.value}%`);
  range.addEventListener("input", sync);
  range.addEventListener("change", sync);
  sync();
});

const navLinks = [...document.querySelectorAll(".desktop-nav a")];
const navTargets = navLinks
  .map((link) => ({ link, section: document.querySelector(link.getAttribute("href")) }))
  .filter(({ section }) => section);

const navObserver = new IntersectionObserver(
  (entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    navTargets.forEach(({ link, section }) => link.classList.toggle("is-active", section === visible.target));
  },
  { rootMargin: "-28% 0px -58% 0px", threshold: [0, 0.08, 0.3] },
);

navTargets.forEach(({ section }) => navObserver.observe(section));

// 离开视口的视频暂停，回到视口不自动播放（保留用户的播放意图）
const mediaObserver = new IntersectionObserver(
  (entries) =>
    entries.forEach((entry) => {
      const video = entry.target;
      if (!entry.isIntersecting && !video.paused) video.pause();
    }),
  { threshold: 0.08 },
);

document.querySelectorAll(".project-card video, .featured-card video").forEach((video) => mediaObserver.observe(video));

// 首屏背景视频：尊重减少动态偏好，并在移动端省流
const heroVideo = document.querySelector(".hero-video");

const syncHeroPlayback = () => {
  if (!heroVideo) return;
  const allowMotion = !prefersReducedMotion.matches;
  if (!allowMotion) {
    heroVideo.pause();
    heroVideo.removeAttribute("autoplay");
    return;
  }
  const attempt = heroVideo.play();
  if (attempt && typeof attempt.catch === "function") attempt.catch(() => {});
};

syncHeroPlayback();
prefersReducedMotion.addEventListener("change", syncHeroPlayback);

// 页面重新可见时恢复首屏播放
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (heroVideo) heroVideo.pause();
  } else {
    syncHeroPlayback();
  }
});
