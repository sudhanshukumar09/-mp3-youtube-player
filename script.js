const API_BASE = "/api/search";

let currentVideo = "";

async function searchSongs() {
  const query = document.getElementById("searchInput").value;

  const res = await fetch(`${API_BASE}?q=${query}`);
  const data = await res.json();

  const results = document.getElementById("results");
  results.innerHTML = "";

  data.items.forEach(item => {
    const videoId = item.id.videoId;
    const title = item.snippet.title;
    const image = item.snippet.thumbnails.medium.url;

    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <img src="${image}" width="100">
      <p>${title}</p>
      <button onclick="loadSong('${videoId}', '${title}', '${image}')">
        Select
      </button>
    `;

    results.appendChild(div);
  });
}

function loadSong(videoId, title, image) {
  currentVideo = videoId;

  document.getElementById("cover").src = image;
  document.getElementById("title").innerText = title;
}

function playSong() {
  document.getElementById("player").src =
    `https://www.youtube.com/embed/${currentVideo}?autoplay=1`;
}

function stopSong() {
  document.getElementById("player").src = "";
}
