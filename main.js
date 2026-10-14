// Shared JavaScript for every page of Cloud Prep Hub

// 1. Put the current year in the footer
const yearSpan = document.getElementById("year");
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}

// 2. Highlight the nav link for the page you're on
const currentPage = window.location.pathname.split("/").pop() || "index.html";
document.querySelectorAll("nav a").forEach(function (link) {
  if (link.getAttribute("href") === currentPage) {
    link.classList.add("active");
  }
});
