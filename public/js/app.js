const searchInput = document.getElementById("filter");
const bookEntries = [...document.querySelectorAll(".book-entry")];
const noMatches = document.getElementById("nomatch");
const siteHeader = document.querySelector(".site-header");

if (siteHeader) {
  const updateHeaderShadow = () => siteHeader.classList.toggle("is-scrolled", window.scrollY > 8);
  updateHeaderShadow();
  window.addEventListener("scroll", updateHeaderShadow, { passive: true });
}

if (searchInput && bookEntries.length) {
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLocaleLowerCase();
    let visibleCount = 0;

    bookEntries.forEach((entry) => {
      const matches = entry.dataset.search.includes(query);
      entry.hidden = !matches;
      if (matches) visibleCount += 1;
    });

    if (noMatches) noMatches.hidden = visibleCount > 0;
  });
}

document.getElementById("sort-books")?.addEventListener("change", (event) => {
  window.location.href = `/?sort=${encodeURIComponent(event.currentTarget.value)}`;
});

document.querySelectorAll(".notes").forEach((notes) => {
  if (notes.scrollHeight <= notes.clientHeight + 1) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "more";
  button.textContent = "Read full note";
  button.setAttribute("aria-expanded", "false");
  button.addEventListener("click", () => {
    const expanded = notes.classList.toggle("open");
    button.textContent = expanded ? "Show less" : "Read full note";
    button.setAttribute("aria-expanded", String(expanded));
  });
  notes.after(button);
});

const revealItems = [...document.querySelectorAll("[data-reveal]")];
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (revealItems.length && !prefersReducedMotion && "IntersectionObserver" in window) {
  document.documentElement.classList.add("js");
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -35px 0px" });

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const heroArt = document.getElementById("hero-art");
const bookToggle = document.getElementById("sample-book-toggle");
const noteToggle = document.getElementById("note-toggle");
const samplePage = document.getElementById("sample-book-page");
const noteToggleLabel = document.getElementById("note-toggle-label");
const noteToggleOpenIcon = document.getElementById("note-toggle-open");
const noteToggleCloseIcon = document.getElementById("note-toggle-close");

if (heroArt && bookToggle && noteToggle && samplePage) {
  const setBookOpen = (open) => {
    heroArt.classList.toggle("is-open", open);
    bookToggle.setAttribute("aria-expanded", String(open));
    bookToggle.setAttribute("aria-label", open ? "Close the sample book" : "Open the sample book");
    samplePage.setAttribute("aria-hidden", String(!open));
    noteToggle.setAttribute("aria-label", open ? "Close the sample book" : "Open the sample book");
    if (noteToggleLabel) noteToggleLabel.textContent = open ? "Close this book" : "Open this book";
    if (noteToggleOpenIcon) noteToggleOpenIcon.hidden = open;
    if (noteToggleCloseIcon) noteToggleCloseIcon.hidden = !open;
  };

  bookToggle.addEventListener("click", () => {
    const open = bookToggle.getAttribute("aria-expanded") !== "true";
    setBookOpen(open);
    if (open) noteToggle.focus({ preventScroll: true });
  });
  noteToggle.addEventListener("click", () => {
    setBookOpen(bookToggle.getAttribute("aria-expanded") !== "true");
  });
  heroArt.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || bookToggle.getAttribute("aria-expanded") !== "true") return;
    setBookOpen(false);
    bookToggle.focus({ preventScroll: true });
  });

  const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (supportsHover && !prefersReducedMotion) {
    heroArt.addEventListener("pointermove", (event) => {
      const bounds = heroArt.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 4;
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * -3;
      heroArt.style.setProperty("--tilt-x", `${x.toFixed(2)}deg`);
      heroArt.style.setProperty("--tilt-y", `${y.toFixed(2)}deg`);
    });

    heroArt.addEventListener("pointerleave", () => {
      heroArt.style.setProperty("--tilt-x", "0deg");
      heroArt.style.setProperty("--tilt-y", "0deg");
    });
  }
}
