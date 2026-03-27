  // Function to transition to a new page
  function transitionToPage(href) {
    document.body.classList.remove('fade-in');
    document.body.classList.add('fade-out');
    setTimeout(function() {
      window.location.href = href;
    }, 500); // Must match the CSS transition duration
  }

  // Fade in the body content when the page loads
  document.addEventListener('DOMContentLoaded', function(event) {
    document.body.classList.remove('fade-out');
    document.body.classList.add('fade-in');
  });