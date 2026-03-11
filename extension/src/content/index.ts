chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "SCAN_JOB") return;

  const title =
    document.querySelector("h1.t-24.t-bold")?.textContent?.trim() ||
    document.querySelector(".job-details-jobs-unified-top-card__job-title h1")?.textContent?.trim() ||
    document.querySelector("h1")?.textContent?.trim() ||
    "";

  const company =
    document.querySelector(".job-details-jobs-unified-top-card__company-name a")?.textContent?.trim() ||
    document.querySelector("[data-test-employer-name]")?.textContent?.trim() ||
    document.querySelector(".jobs-unified-top-card__company-name")?.textContent?.trim() ||
    "";

  const location =
    document.querySelector(".job-details-jobs-unified-top-card__primary-description-without-tagline span")?.textContent?.trim() ||
    document.querySelector(".jobs-unified-top-card__bullet")?.textContent?.trim() ||
    "";

  const description =
    document.querySelector(".jobs-description__content .jobs-description-content__text")?.textContent?.trim() ||
    document.querySelector("#job-details")?.textContent?.trim() ||
    document.querySelector(".jobs-box__html-content")?.textContent?.trim() ||
    "";

  const url = window.location.href;

  if (!title && !company) {
    sendResponse({ error: "No job found on this page." });
    return;
  }

  sendResponse({ job: { title, company, location, description, url } });
});
