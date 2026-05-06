const API_BASE = "/api/search";

let player;
let currentVideo = "";
let currentSong = null;
let isPlaying = false;
let searchTimer = null;
let currentQueue = [];
let currentIndex = -1;
let loopOn = false;
let autoplayOn = true;

let likedSongs = JSON.parse(localStorage.getItem("likedSongs")) || [];
let historySongs = JSON.parse(localStorage.getItem("historySongs")) || [];
let searchHistory = JSON.parse(localStorage.getItem("searchHistory")) || [];
let cachedSongs = JSON.parse(localStorage.getItem("cachedSongs")) || [];

function onYouTubeIframeAPIReady() {
  player = new YT.Player("ytPlayer", {
    height: "1",
    width: "1",
    videoId: "",
    playerVars: {
      autoplay: 0,
      controls: 0,
      playsinline: 1,
      rel: 0
    },
    events: {
      onStateChange: onPlayerStateChange
    }
  });
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) isPlaying = true;
  if (event.data === YT.PlayerState.PAUSED) isPlaying = false;

  if (event.data === YT.PlayerState.ENDED) {
    if (loopOn) {
      player.seekTo(0, true);
      player.playVideo();
    } else if (autoplayOn) {
      nextSong();
    } else {
      isPlaying = false;
    }
  }

  updateButtons();
}

function showMainPage(pageId, btn) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");

  document.querySelectorAll(".bottom-nav button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  if (pageId === "searchPage") {
    document.getElementById("searchHistoryBox").innerHTML = "";
    setTimeout(() => document.getElementById("searchInput").focus(), 100);
  }
}

function backToLibrary() {
  showMainPage("libraryPage", document.querySelectorAll(".bottom-nav button")[2]);
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
  showMainPage("searchPage", document.querySelectorAll(".bottom-nav button")[1]);
  document.getElementById("searchInput").value = query;
  await searchSongs(true);
}

async function searchSongs(force = false) {
  const input = document.getElementById("searchInput");
  const query = input.value.trim();
  const box = document.getElementById("searchResults");

  if (!query) return;

  input.blur();
  saveSearchQuery(query);
  box.innerHTML = `<p>Searching...</p>`;

  try {
    const res = await fetch(`${API_BASE}?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    const songs = normalizeSongs(data.items || []);
    currentQueue = songs;
    currentIndex = -1;

    box.innerHTML = "";
    renderSongs(songs, box);
    renderSearchHistory();
  } catch {
    box.innerHTML = `<p>Search failed</p>`;
  }
}

function normalizeSongs(items) {
  return items
    .filter(item => item.id && item.id.videoId && item.snippet)
    .map(item => ({
      videoId: item.id.videoId,
      title: cleanTitle(item.snippet.title),
      channel: cleanText(item.snippet.channelTitle),
      image:
        item.snippet.thumbnails.high?.url ||
        item.snippet.thumbnails.medium?.url ||
        item.snippet.thumbnails.default?.url
    }));
}

function renderSongs(songs, container) {
  if (!songs.length) {
    container.innerHTML = `<p>No songs found</p>`;
    return;
  }

  songs.forEach((song, index) => {
    const card = createSongCard(song, index);
    container.appendChild(card);
  });
}

function createSongCard(song, index = -1) {
  const card = document.createElement("div");
  card.className = "song-card";

  card.innerHTML = `
    <img src="${song.image}" alt="cover">
    <div class="song-info">
      <h3>${song.title}</h3>
      <p>${song.channel}</p>
    </div>
    <button aria-label="Play">
      <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5Z"/></svg>
    </button>
  `;

  card.addEventListener("click", () => {
    if (index >= 0) currentIndex = index;
    selectSong(song);
    openFullPlayer();
  });

  card.querySelector("button").addEventListener("click", (e) => {
    e.stopPropagation();
    if (index >= 0) currentIndex = index;
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
  addCached(song);

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

function nextSong() {
  if (!currentQueue.length) return;
  currentIndex = currentIndex + 1;
  if (currentIndex >= currentQueue.length) currentIndex = 0;
  selectSong(currentQueue[currentIndex]);
}

function previousSong() {
  if (!currentQueue.length) return;
  currentIndex = currentIndex - 1;
  if (currentIndex < 0) currentIndex = currentQueue.length - 1;
  selectSong(currentQueue[currentIndex]);
}

function updateButtons() {
  const playSvg = `<svg class="play-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5Z"/></svg>`;
  const pauseSvg = `<svg class="pause-icon" viewBox="0 0 24 24"><path d="M7 5h4v14H7V5Zm6 0h4v14h-4V5Z"/></svg>`;
  const icon = isPlaying ? pauseSvg : playSvg;

  document.getElementById("miniPlayBtn").innerHTML = icon;
  document.getElementById("mainPlayBtn").innerHTML = icon;
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

setInterval(updateProgress, 300);

const timeline = document.getElementById("timeline");

function seekFromPointer(clientX) {
  if (!player || !player.getDuration) return;
  const rect = timeline.getBoundingClientRect();
  let percent = (clientX - rect.left) / rect.width;
  percent = Math.max(0, Math.min(1, percent));
  const duration = player.getDuration() || 0;
  player.seekTo(duration * percent, true);
  document.getElementById("progressFill").style.width = `${percent * 100}%`;
}

timeline.addEventListener("click", e => seekFromPointer(e.clientX));
timeline.addEventListener("pointerdown", e => {
  seekFromPointer(e.clientX);
  timeline.setPointerCapture(e.pointerId);
});
timeline.addEventListener("pointermove", e => {
  if (e.buttons === 1) seekFromPointer(e.clientX);
});

document.getElementById("searchInput").addEventListener("input", function() {
  clearTimeout(searchTimer);
});

document.getElementById("searchInput").addEventListener("focus", function() {
  if (this.value === "") renderSearchHistory();
});

document.getElementById("searchInput").addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    searchSongs(true);
    this.blur();
  }
});

function saveSearchQuery(query) {
  searchHistory = searchHistory.filter(q => q.toLowerCase() !== query.toLowerCase());
  searchHistory.unshift(query);
  searchHistory = searchHistory.slice(0, 10);
  localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
}

function renderSearchHistory() {
  const box = document.getElementById("searchHistoryBox");
  box.innerHTML = "";

  if (!searchHistory.length) return;

  searchHistory.forEach(query => {
    const row = document.createElement("div");
    row.className = "history-row";

    row.innerHTML = `
      <span>${query}</span>
      <button title="Search again">↗</button>
      <button title="Remove">×</button>
    `;

    row.children[1].addEventListener("click", () => {
      document.getElementById("searchInput").value = query;
      searchSongs(true);
    });

    row.children[2].addEventListener("click", () => {
      searchHistory = searchHistory.filter(q => q !== query);
      localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
      renderSearchHistory();
    });

    box.appendChild(row);
  });
}

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
  const btn = document.getElementById("likeBtn");
  if (!currentSong) return;

  const liked = likedSongs.some(s => s.videoId === currentSong.videoId);
  btn.classList.toggle("active", liked);
}

function addHistory(song) {
  historySongs = historySongs.filter(s => s.videoId !== song.videoId);
  historySongs.unshift(song);
  historySongs = historySongs.slice(0, 50);
  localStorage.setItem("historySongs", JSON.stringify(historySongs));
}

function addCached(song) {
  cachedSongs = cachedSongs.filter(s => s.videoId !== song.videoId);
  cachedSongs.unshift(song);
  cachedSongs = cachedSongs.slice(0, 20);
  localStorage.setItem("cachedSongs", JSON.stringify(cachedSongs));
}

function openLibraryPage(type) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("libraryDetailPage").classList.add("active");

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
    list.innerHTML = `<p>No song downloaded.</p>`;
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

  currentQueue = songs;
  songs.forEach((song, index) => {
    list.appendChild(createSongCard(song, index));
  });
}

function clearHistory() {
  historySongs = [];
  localStorage.setItem("historySongs", JSON.stringify(historySongs));
  openLibraryPage("history");
}

function toggleLoop() {
  loopOn = !loopOn;
  document.getElementById("loopBtn").classList.toggle("active", loopOn);
}

function toggleAutoplay() {
  autoplayOn = !autoplayOn;
  document.getElementById("autoBtn").classList.toggle("active", autoplayOn);
}

function formatTime(sec) {
  sec = Math.floor(sec);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function cleanText(text) {
  const div = document.createElement("div");
  div.innerHTML = text;
  return div.textContent || div.innerText || "";
}

function cleanTitle(text) {
  let title = cleanText(text);
  title = title.replace(/#[\w\d_-]+/g, "");
  title = title.replace(/\s+/g, " ").trim();
  return title;
}

window.addEventListener("load", () => {
  const theme = localStorage.getItem("theme");
  if (theme === "light") document.body.classList.add("light");

  const loginName = localStorage.getItem("loginName");
  if (loginName) {
    document.getElementById("loginStatus").innerText = `Logged in as ${loginName}`;
  }

  document.getElementById("autoBtn").classList.add("active");
  renderSearchHistory();

  quickSearch("bollywood songs");
  setTimeout(() => {
    document.getElementById("searchInput").value = "";
  }, 700);
});
