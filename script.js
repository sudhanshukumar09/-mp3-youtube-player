const API_BASE = "/api/search";

async function searchSongs() {
  const input = document.getElementById("searchInput");
  const resultsDiv = document.getElementById("results");
  const query = input.value.trim();

  if (!query) {
    alert("Please enter a song name");
    return;
  }

  resultsDiv.innerHTML = `<p class="loading">Searching...</p>`;

  try {
    const response = await fetch(`${API_BASE}?q=${encodeURIComponent(query)}`);
    const data = await response.json();

    resultsDiv.innerHTML = "";

    if (!data.items || data.items.length === 0) {
      resultsDiv.innerHTML = "<p>No results found.</p>";
      return;
    }

    data.items.forEach(item => {
      const videoId = item.id.videoId;
      const title = item.snippet.title;
      const channel = item.snippet.channelTitle;
      const thumbnail =
        item.snippet.thumbnails.high?.url ||
        item.snippet.thumbnails.medium?.url ||
        item.snippet.thumbnails.default?.url;

      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <img src="${thumbnail}" alt="${title}">
        <div class="card-content">
          <h3>${title}</h3>
          <p>${channel}</p>
          <button onclick="playVideo('${videoId}')">Play Now</button>
        </div>
      `;

      resultsDiv.appendChild(card);
    });

  } catch (error) {
    resultsDiv.innerHTML = "<p>Something went wrong. Please try again.</p>";
    console.error(error);
  }
}

function playVideo(videoId) {
  const player = document.getElementById("player");
  player.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
}

document.getElementById("searchInput").addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    searchSongs();
  }
});
