const API_BASE = "/api/search";

let player;
let currentVideo = "";
let isPlaying = false;
let searchTimer = null;
let recentSongs = [];

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
  if (event.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
  } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
    isPlaying = false;
  }
  updateButtons();
}

function showPage(pageId, btn) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");

  document.querySelectorAll(".bottom-nav button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

async function quickSearch(query) {
  showPage("searchPage", document.querySelectorAll(".bottom-nav button")[1]);
  document.getElementById("searchInput").value = query;
  await searchSongs();
}

async function searchSongs() {
  const query = document.getElementById("searchInput").value.trim();
  const box = document.getElementById("searchResults");

  if (!query) return;

  box.innerHTML = `<p>Searching...</p>`;

  try {
    const res = await fetch(`${API_BASE}?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    box.innerHTML = "";
    renderSongs(data.items || [], box);
  } catch {
    box.innerHTML = `<p>Search failed</p>`;
  }
}

function renderSongs(items, container) {
  if (!items.length) {
    container.innerHTML = `<p>No songs found</p>`;
    return;
  }

  items.forEach(item => {
    const videoId = item.id.videoId;
    const title = cleanText(item.snippet.title);
    const channel = cleanText(item.snippet.channelTitle);
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
      <button>▶</button>
    `;

    card.querySelector("button").addEventListener("click", () => {
      selectSong(videoId, title, channel, image);
    });

    container.appendChild(card);
  });
}

function selectSong(videoId, title, channel, image) {
  currentVideo = videoId;

  document.getElementById("miniCover").src = image;
  document.getElementById("miniTitle").innerText = title;
  document.getElementById("miniChannel").innerText = channel;

  document.getElementById("bigCover").src = image;
  document.getElementById("bigTitle").innerText = title;
  document.getElementById("bigChannel").innerText = channel;

  addRecent(videoId, title, channel, image);

  if (player && player.loadVideoById) {
    player.loadVideoById(videoId);
    isPlaying = true;
    updateButtons();
  }
}

function togglePlay() {
  if (!currentVideo) {
    alert("Please select a song first");
    return;
  }

  if (!player) return;

  if (isPlaying) {
    player.pauseVideo();
    isPlaying = false;
  } else {
    player.playVideo();
    isPlaying = true;
  }

  updateButtons();
}

function seekBy(seconds) {
  if (!player || !player.getCurrentTime) return;
  const current = player.getCurrentTime();
  player.seekTo(current + seconds, true);
}

function updateButtons() {
  const icon = isPlaying ? "⏸" : "▶";
  document.getElementById("miniPlayBtn").innerText = icon;
  document.getElementById("mainPlayBtn").innerText = icon;
}

function updateProgress() {
  if (player && player.getDuration && player.getCurrentTime) {
    const duration = player.getDuration() || 0;
    const current = player.getCurrentTime() || 0;

    if (duration > 0) {
      const percent = (current / duration) * 100;
      document.getElementById("progressFill").style.width = `${percent}%`;
      document.getElementById("currentTime").innerText = formatTime(current);
      document.getElementById("durationTime").innerText = formatTime(duration);
    }
  }
}

setInterval(updateProgress, 500);

document.getElementById("timeline").addEventListener("click", function(e) {
  if (!player || !player.getDuration) return;

  const rect = this.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const percent = clickX / rect.width;
  const duration = player.getDuration();

  player.seekTo(duration * percent, true);
});

document.getElementById("searchInput").addEventListener("input", function() {
  clearTimeout(searchTimer);

  searchTimer = setTimeout(() => {
    if (this.value.trim().length >= 2) {
      searchSongs();
    }
  }, 450);
});

function openFullPlayer() {
  document.getElementById("fullPlayer").classList.add("active");
}

function closeFullPlayer() {
  document.getElementById("fullPlayer").classList.remove("active");
}

function addRecent(videoId, title, channel, image) {
  recentSongs = recentSongs.filter(s => s.videoId !== videoId);
  recentSongs.unshift({ videoId, title, channel, image });
  recentSongs = recentSongs.slice(0, 8);

  const recentBox = document.getElementById("recentList");
  recentBox.innerHTML = "";

  recentSongs.forEach(song => {
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

    card.querySelector("button").addEventListener("click", () => {
      selectSong(song.videoId, song.title, song.channel, song.image);
    });

    recentBox.appendChild(card);
  });
}

function formatTime(sec) {
  sec = Math.floor(sec);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function cleanText(text) {
  return text.replace(/[`"'\\]/g, "");
}

window.addEventListener("load", () => {
  quickSearch("bollywood songs");
});
