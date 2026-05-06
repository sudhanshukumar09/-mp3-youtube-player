const API_BASE = "/api/search";

let player;
let currentVideo = "";
let currentSong = null;
let isPlaying = false;

let likedSongs = JSON.parse(localStorage.getItem("likedSongs")) || [];
let historySongs = JSON.parse(localStorage.getItem("historySongs")) || [];
let searchHistory = JSON.parse(localStorage.getItem("searchHistory")) || [];

function onYouTubeIframeAPIReady() {
  player = new YT.Player("ytPlayer", {
    height: "1",
    width: "1",
    videoId: "",
    playerVars: {
      autoplay: 0,
      controls: 0,
      playsinline: 1
    },
    events: {
      onStateChange: onPlayerStateChange
    }
  });
}

function onPlayerStateChange(event) {
  isPlaying = event.data === YT.PlayerState.PLAYING;
  updateButtons();
}

// ---------------- SEARCH ---------------- //

async function searchSongs() {
  const input = document.getElementById("searchInput");
  const query = input.value.trim();
  const box = document.getElementById("searchResults");

  if (!query) return;

  input.blur();
  saveSearchQuery(query);

  // 🔥 Hide history immediately
  const historyBox = document.getElementById("searchHistoryBox");
  historyBox.style.display = "none";
  historyBox.innerHTML = "";

  box.innerHTML = "Searching...";

  try {
    const res = await fetch(`${API_BASE}?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    const songs = normalizeSongs(data.items || []);

    box.innerHTML = "";
    renderSongs(songs, box);

  } catch {
    box.innerHTML = "Search failed";
  }
}

function normalizeSongs(items) {
  return items.map(item => ({
    videoId: item.id.videoId,
    title: cleanTitle(item.snippet.title),
    channel: cleanText(item.snippet.channelTitle),
    image:
      item.snippet.thumbnails.high?.url ||
      item.snippet.thumbnails.medium?.url
  }));
}

function renderSongs(songs, container) {
  if (!songs.length) {
    container.innerHTML = "No songs found";
    return;
  }

  songs.forEach(song => {
    const card = document.createElement("div");
    card.className = "song-card";

    card.innerHTML = `
      <img src="${song.image}">
      <div class="song-info">
        <h3>${song.title}</h3>
        <p>${song.channel}</p>
      </div>
      <button>▶</button>
    `;

    card.addEventListener("click", () => {
      selectSong(song);
    });

    card.querySelector("button").addEventListener("click", (e) => {
      e.stopPropagation();
      selectSong(song);
    });

    container.appendChild(card);
  });
}

// ---------------- PLAYER ---------------- //

function selectSong(song) {
  currentSong = song;
  currentVideo = song.videoId;

  document.getElementById("miniCover").src = song.image;
  document.getElementById("miniTitle").innerText = song.title;
  document.getElementById("miniChannel").innerText = song.channel;

  if (player) {
    player.loadVideoById(song.videoId);
    isPlaying = true;
    updateButtons();
  }

  addHistory(song);
}

function togglePlay() {
  if (!currentVideo) return;

  if (isPlaying) {
    player.pauseVideo();
  } else {
    player.playVideo();
  }
}

function updateButtons() {
  const icon = isPlaying ? "⏸" : "▶";
  document.getElementById("miniPlayBtn").innerText = icon;
}

// ---------------- SEARCH HISTORY ---------------- //

function saveSearchQuery(query) {
  searchHistory = searchHistory.filter(q => q !== query);
  searchHistory.unshift(query);
  searchHistory = searchHistory.slice(0, 10);
  localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
}

function renderSearchHistory() {
  const box = document.getElementById("searchHistoryBox");
  box.innerHTML = "";

  if (!searchHistory.length) return;

  box.style.display = "grid";

  searchHistory.forEach(query => {
    const row = document.createElement("div");
    row.className = "history-row";

    row.innerHTML = `
      <span>${query}</span>
      <button>↗</button>
      <button>×</button>
    `;

    row.children[1].onclick = () => {
      document.getElementById("searchInput").value = query;
      searchSongs();
    };

    row.children[2].onclick = () => {
      searchHistory = searchHistory.filter(q => q !== query);
      localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
      renderSearchHistory();
    };

    box.appendChild(row);
  });
}

// ---------------- EVENTS ---------------- //

document.getElementById("searchInput").addEventListener("focus", function () {
  if (this.value.trim() === "") {
    renderSearchHistory();
  }
});

document.getElementById("searchInput").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    searchSongs();
  }
});

// ---------------- HELPERS ---------------- //

function cleanText(text) {
  const div = document.createElement("div");
  div.innerHTML = text;
  return div.textContent || div.innerText || "";
}

function cleanTitle(text) {
  let t = cleanText(text);
  return t.replace(/#[\w\d_-]+/g, "").trim();
}

function addHistory(song) {
  historySongs.unshift(song);
  historySongs = historySongs.slice(0, 20);
  localStorage.setItem("historySongs", JSON.stringify(historySongs));
}
