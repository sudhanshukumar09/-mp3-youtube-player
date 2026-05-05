const API_BASE = "/api/search";

let currentVideo = "";
let currentTitle = "";
let currentChannel = "";
let currentImage = "";
let isPlaying = false;

async function searchSongs() {
  const query = document.getElementById("searchInput").value.trim();
  const results = document.getElementById("results");

  if (!query) {
    alert("Please search a song");
    return;
  }

  results.innerHTML = `<p class="hint">Searching...</p>`;

  try {
    const res = await fetch(`${API_BASE}?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    results.innerHTML = "";

    if (!data.items || data.items.length === 0) {
      results.innerHTML = `<p class="hint">No results found</p>`;
      return;
    }

    data.items.forEach(item => {
      const videoId = item.id.videoId;
      const title = item.snippet.title;
      const channel = item.snippet.channelTitle;
      const image =
        item.snippet.thumbnails.high?.url ||
        item.snippet.thumbnails.medium?.url ||
        item.snippet.thumbnails.default?.url;

      const card = document.createElement("div");
      card.className = "song-card";

      card.innerHTML = `
        <img src="${image}" alt="cover">
        <div class="song-info">
          <h3>${title}</h3>
          <p>${channel}</p>
        </div>
        <button onclick="selectSong('${videoId}', \`${escapeText(title)}\`, \`${escapeText(channel)}\`, '${image}')">▶</button>
      `;

      results.appendChild(card);
    });
  } catch (error) {
    results.innerHTML = `<p class="hint">Something went wrong</p>`;
  }
}

function selectSong(videoId, title, channel, image) {
  currentVideo = videoId;
  currentTitle = title;
  currentChannel = channel;
  currentImage = image;

  document.getElementById("miniCover").src = image;
  document.getElementById("miniTitle").innerText = title;
  document.getElementById("miniChannel").innerText = channel;

  document.getElementById("bigCover").src = image;
  document.getElementById("bigTitle").innerText = title;
  document.getElementById("bigChannel").innerText = channel;

  playCurrentSong();
}

function playCurrentSong() {
  if (!currentVideo) return;

  document.getElementById("player").src =
    `https://www.youtube.com/embed/${currentVideo}?autoplay=1&playsinline=1`;

  isPlaying = true;
  updateButtons();
}

function stopCurrentSong() {
  document.getElementById("player").src = "";
  isPlaying = false;
  updateButtons();
}

function togglePlay() {
  if (!currentVideo) {
    alert("Please select a song first");
    return;
  }

  if (isPlaying) {
    stopCurrentSong();
  } else {
    playCurrentSong();
  }
}

function updateButtons() {
  const icon = isPlaying ? "⏸" : "▶";

  document.getElementById("playBtn").innerText = icon;

  const mainBtn = document.querySelector(".main-control");
  if (mainBtn) mainBtn.innerText = icon;
}

function openFullPlayer() {
  document.getElementById("fullPlayer").classList.add("active");
}

function closeFullPlayer() {
  document.getElementById("fullPlayer").classList.remove("active");
}

document.getElementById("miniPlayer").addEventListener("click", function(e) {
  if (e.target.tagName.toLowerCase() === "button") return;
  openFullPlayer();
});

document.getElementById("searchInput").addEventListener("keydown", function(e) {
  if (e.key === "Enter") searchSongs();
});

function escapeText(text) {
  return text
    .replace(/`/g, "")
    .replace(/\\/g, "")
    .replace(/'/g, "");
}
