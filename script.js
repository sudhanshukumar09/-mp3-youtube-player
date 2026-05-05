const API_BASE = "/api/search";

let player;
let currentVideo = "";
let currentSong = null;
let isPlaying = false;
let searchTimer = null;

let likedSongs = JSON.parse(localStorage.getItem("likedSongs")) || [];
let historySongs = JSON.parse(localStorage.getItem("historySongs")) || [];

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

function showPage(pageId, btn) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");

  document.querySelectorAll(".bottom-nav button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  if (pageId === "libraryPage") openLibrarySection("history");
}

function openSettings() {
  document.getElementById("settingsPage").classList.add("active");
}

function closeSettings() {
  document.getElementById("settingsPage").classList.remove("active");
}

function setTheme(theme) {
  if (theme === "light") document.body.classList.add("light");
  else document.body.classList.remove("light");

  localStorage.setItem("theme", theme);
}

function saveLogin() {
  const name = document.getElementById("loginName").value.trim();
  if (!name) return;

  localStorage.setItem("loginName", name);
  document.getElementById("loginStatus").innerText = `Logged in as ${name}`;
}

async function quickSearch(query) {
  showPage("searchPage", document.querySelectorAll(".bottom-nav button")[1]);
  document.getElementById("searchInput").value = query;
  await searchSongs();
}

async function searchSongs() {
  const input = document.getElementById("searchInput");
  const query = input.value.trim();
  const box = document.getElementById("searchResults");

  if (!query) return;

  input.blur();
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
    const song = {
      videoId: item.id.videoId,
      title: cleanText(item.snippet.title),
      channel: cleanText(item.snippet.channelTitle),
      image:
        item.snippet.thumbnails.high?.url ||
        item.snippet.thumbnails.medium?.url ||
        item.snippet.thumbnails.default?.url
    };

    const card = createSongCard(song);
    container.appendChild(card);
  });
}

function createSongCard(song) {
  const card = document.createElement("div");
  card.className = "song-card";

  card.innerHTML = `
    <img src="${song.image}" alt="cover">
    <div class="song-info">
      <h3>${song.title}</h3>
      <p>${song.channel}</p>
    </div>
    <button>▶</button>
  `;

  card.addEventListener("click", () => {
    selectSong(song);
    openFullPlayer();
  });

  card.querySelector("button").addEventListener("click", (e) => {
    e.stopPropagation();
    selectSong(song);
  });

  return card;
}

function selectSong(song) {
  currentSong = song;
  currentVideo = song.videoId;

  document.getElementById("miniCover").src = song.image;
  document.getElementById("miniTitle").innerText = song.title;
  document.getElementById("miniChannel").innerText = song.channel;

  document.getElementById("bigCover").src = song.image;
  document.getElementById("bigTitle").innerText = song.title;
  document.getElementById("bigChannel").innerText = song.channel;

  updateLikeButton();
  addHistory(song);

  if (player && player.loadVideoById) {
    player.loadVideoById(song.videoId);
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
  player.seekTo(player.getCurrentTime() + seconds, true);
}

function updateButtons() {
  const icon = isPlaying ? "Ⅱ" : "▶";
  document.getElementById("miniPlayBtn").innerText = icon;
  document.getElementById("mainPlayBtn").innerText = icon;
}

function updateProgress() {
  if (player && player.getDuration && player.getCurrentTime) {
    const duration = player.getDuration() || 0;
    const current = player.getCurrentTime() || 0;

    if (duration > 0) {
      document.getElementById("progressFill").style.width = `${(current / duration) * 100}%`;
      document.getElementById("currentTime").innerText = formatTime(current);
      document.getElementById("durationTime").innerText = formatTime(duration);
    }
  }
}

setInterval(updateProgress, 500);

document.getElementById("timeline").addEventListener("click", function(e) {
  if (!player || !player.getDuration) return;

  const rect = this.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  player.seekTo(player.getDuration() * percent, true);
});

document.getElementById("searchInput").addEventListener("input", function() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    if (this.value.trim().length >= 2) searchSongs();
  }, 500);
});

document.getElementById("searchInput").addEventListener("focus", function() {
  this.select();
});

document.getElementById("searchInput").addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    searchSongs();
    this.blur();
  }
});

function openFullPlayer() {
  document.getElementById("fullPlayer").classList.add("active");
}

function closeFullPlayer() {
  document.getElementById("fullPlayer").classList.remove("active");
}

function toggleLike() {
  if (!currentSong) return;

  const exists = likedSongs.some(s => s.videoId === currentSong.videoId);

  if (exists) {
    likedSongs = likedSongs.filter(s => s.videoId !== currentSong.videoId);
  } else {
    likedSongs.unshift(currentSong);
  }

  localStorage.setItem("likedSongs", JSON.stringify(likedSongs));
  updateLikeButton();
}

function updateLikeButton() {
  if (!currentSong) return;

  const liked = likedSongs.some(s => s.videoId === currentSong.videoId);
  document.getElementById("likeBtn").innerText = liked ? "♥" : "♡";
}

function addHistory(song) {
  historySongs = historySongs.filter(s => s.videoId !== song.videoId);
  historySongs.unshift(song);
  historySongs = historySongs.slice(0, 30);

  localStorage.setItem("historySongs", JSON.stringify(historySongs));
}

function openLibrarySection(type) {
  const list = document.getElementById("libraryList");
  const title = document.getElementById("libraryTitle");
  const clearBtn = document.getElementById("clearHistoryBtn");

  list.innerHTML = "";
  clearBtn.style.display = "none";

  let songs = [];

  if (type === "liked") {
    title.innerText = "Liked Songs";
    songs = likedSongs;
  }

  if (type === "downloaded") {
    title.innerText = "Downloaded";
    list.innerHTML = `<p>No downloaded songs yet.</p>`;
    return;
  }

  if (type === "top") {
    title.innerText = "My Top 50";
    songs = likedSongs;
  }

  if (type === "history") {
    title.innerText = "History";
    songs = historySongs;
    clearBtn.style.display = "block";
  }

  if (!songs.length) {
    list.innerHTML = `<p>No songs found.</p>`;
    return;
  }

  songs.forEach(song => {
    list.appendChild(createSongCard(song));
  });
}

function clearHistory() {
  historySongs = [];
  localStorage.setItem("historySongs", JSON.stringify(historySongs));
  openLibrarySection("history");
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
  const theme = localStorage.getItem("theme");
  if (theme === "light") document.body.classList.add("light");

  const loginName = localStorage.getItem("loginName");
  if (loginName) {
    document.getElementById("loginStatus").innerText = `Logged in as ${loginName}`;
  }

  quickSearch("bollywood songs");
});
