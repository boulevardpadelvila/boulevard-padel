const menuButton = document.getElementById("menuButton");
const nav = document.getElementById("nav");
const currentYear = document.getElementById("currentYear");

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}

function closeMobileMenu() {
  if (!menuButton || !nav) return;

  nav.classList.remove("nav--open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Abrir menú");
}

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("nav--open");

    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute(
      "aria-label",
      isOpen ? "Cerrar menú" : "Abrir menú",
    );
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMobileMenu);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
      closeMobileMenu();
    }
  });
}

const aboutSiteButton = document.getElementById("aboutSiteButton");
const aboutModal = document.getElementById("aboutModal");
const aboutModalClose = document.getElementById("aboutModalClose");
const aboutModalBackdrop = document.getElementById("aboutModalBackdrop");

function openAboutModal() {
  if (!aboutModal) return;

  aboutModal.classList.add("about-modal--open");
  aboutModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  if (aboutModalClose) {
    aboutModalClose.focus();
  }
}

function closeAboutModal() {
  if (!aboutModal) return;

  aboutModal.classList.remove("about-modal--open");
  aboutModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");

  if (aboutSiteButton) {
    aboutSiteButton.focus();
  }
}

if (aboutSiteButton) {
  aboutSiteButton.addEventListener("click", openAboutModal);
}

if (aboutModalClose) {
  aboutModalClose.addEventListener("click", closeAboutModal);
}

if (aboutModalBackdrop) {
  aboutModalBackdrop.addEventListener("click", closeAboutModal);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMobileMenu();

    if (aboutModal?.classList.contains("about-modal--open")) {
      closeAboutModal();
    }
  }
});
