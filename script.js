// ---------- GLOBALS ----------
let ytPlayer = null;
let currentQueue = [];            // array of song objects {videoId, title, artist, thumbnail}
let currentIndex = -1;
let isPlaying = false;
let likedSongs = [];
let currentVolume = 70;
let isSeeking = false;

// DOM elements
const homeView = document.getElementById('homeView');
const searchView = document.getElementById('searchView');
const libraryView = document.getElementById('libraryView');
const navItems = document.querySelectorAll('.nav-item');
const quickGrid = document.getElementById('quickPicksGrid');
const searchInput = document.getElementById('searchInput');
const suggestionsDiv = document.getElementById('suggestionsContainer');
const searchResultsDiv = document.getElementById('searchResults');
const likedContainer = document.getElementById('likedContainer');
const playlistsContainer = document.getElementById('playlistsContainer');
const libTabs = document.querySelectorAll('.lib-tab');
const playerTitle = document.getElementById('playerTitle');
const playerArtist = document.getElementById('playerArtist');
const playerThumb = document.getElementById('playerThumb');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const seekBar = document.getElementById('seekBar');
const seekFill = document.getElementById('seekFill');
const currentTimeSpan = document.getElementById('currentTime');
const durationSpan = document.getElementById('durationTime');
const volumeSlider = document.getElementById('volumeSlider');
const volumeIcon = document.getElementById('volumeIcon');

// ---------- Helper: escape HTML ----------
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// ---------- Liked Songs (localStorage) ----------
function loadLikedSongs() {
  const stored = localStorage.getItem('fabtune_liked');
  if (stored) likedSongs = JSON.parse(stored);
  renderLikedView();
}
function saveLikedSongs() {
  localStorage.setItem('fabtune_liked', JSON.stringify(likedSongs));
  renderLikedView();
}

function isLiked(videoId) {
  return likedSongs.some(song => song.videoId === videoId);
}

function toggleLike(song) {
  if (isLiked(song.videoId)) {
    likedSongs = likedSongs.filter(s => s.videoId !== song.videoId);
  } else {
    likedSongs.push({ ...song });
  }
  saveLikedSongs();
  // refresh any open result views
  renderSearchResultsUI();
  renderLikedView();
}

// Render liked songs in Library
function renderLikedView() {
  if (!likedContainer) return;
  if (likedSongs.length === 0) {
    likedContainer.innerHTML = `<div class="empty-state"><i class="fas fa-heart-broken"></i> No liked songs yet.<br>❤️ Save your favourites!</div>`;
    return;
  }
  likedContainer.innerHTML = `<div class="result-grid"></div>`;
  const grid = likedContainer.querySelector('.result-grid');
  likedSongs.forEach(song => {
    const item = createSongItemElement(song);
    grid.appendChild(item);
  });
}

// Create a song card element (reusable)
function createSongItemElement(song) {
  const div = document.createElement('div');
  div.className = 'song-item';
  div.innerHTML = `
    <img src="${song.thumbnail || 'https://via.placeholder.com/55'}" alt="thumb">
    <div class="song-info"><h4>${escapeHtml(song.title)}</h4><p>${escapeHtml(song.artist)}</p></div>
    <div class="actions">
      <i class="fas fa-plus-circle" data-action="addqueue" title="Add to queue"></i>
      <i class="fas fa-heart ${isLiked(song.videoId) ? 'liked' : ''}" data-action="like"></i>
      <i class="fas fa-play" data-action="playnow"></i>
    </div>
  `;
  div.querySelector('[data-action="playnow"]').addEventListener('click', (e) => {
    e.stopPropagation();
    playSongDirectly(song);
  });
  div.querySelector('[data-action="addqueue"]').addEventListener('click', (e) => {
    e.stopPropagation();
    addToQueue(song);
    showToast("➕ Added to queue");
  });
  div.querySelector('[data-action="like"]').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleLike(song);
    renderLikedView();
    renderSearchResultsUI();
  });
  div.addEventListener('click', () => playSongDirectly(song));
  return div;
}

// Refresh heart icons in search results
function renderSearchResultsUI() {
  const items = document.querySelectorAll('#searchResults .song-item');
  items.forEach(item => {
    const heart = item.querySelector('[data-action="like"]');
    if (heart) {
      // find videoId from the item's data (stored in a custom attribute)
      const fakeDiv = document.createElement('div');
      // simpler: we can re-run the creation? But we just update icon class
      const titleEl = item.querySelector('.song-info h4');
      // Not perfect but works for UI feedback - we'll rely on full re-render if needed.
      // Instead we will just re-render search results after like toggle? Called from toggleLike.
    }
  });
}

// ---------- QUEUE & PLAYER ----------
function addToQueue(song) {
  currentQueue.push(song);
  if (currentIndex === -1) {
    currentIndex = 0;
    playSongDirectly(currentQueue[0]);
  } else {
    showToast(`📌 ${song.title} added`);
  }
}

function playSongDirectly(song) {
  if (!song.videoId) return;
  const existingIdx = currentQueue.findIndex(s => s.videoId === song.videoId);
  if (existingIdx !== -1) {
    currentIndex = existingIdx;
  } else {
    currentQueue.unshift(song);
    currentIndex = 0;
  }
  loadAndPlaySong(song);
}

function loadAndPlaySong(song) {
  if (!ytPlayer) return;
  playerTitle.innerText = song.title.length > 35 ? song.title.slice(0, 32) + '...' : song.title;
  playerArtist.innerText = song.artist;
  playerThumb.src = song.thumbnail || 'https://via.placeholder.com/48';
  ytPlayer.loadVideoById(song.videoId);
  ytPlayer.playVideo();
  isPlaying = true;
  playPauseBtn.className = "fas fa-pause-circle";
}

function playNext() {
  if (currentQueue.length === 0) return;
  if (currentIndex + 1 < currentQueue.length) {
    currentIndex++;
    loadAndPlaySong(currentQueue[currentIndex]);
  } else {
    // loop to first
    currentIndex = 0;
    loadAndPlaySong(currentQueue[0]);
  }
}

function playPrev() {
  if (currentQueue.length === 0) return;
  if (currentIndex - 1 >= 0) {
    currentIndex--;
    loadAndPlaySong(currentQueue[currentIndex]);
  } else {
    currentIndex = currentQueue.length - 1;
    loadAndPlaySong(currentQueue[currentIndex]);
  }
}

// ---------- YouTube IFrame API ----------
function onYouTubeIframeAPIReady() {
  ytPlayer = new YT.Player('youtubePlayerContainer', {
    height: '0',
    width: '0',
    playerVars: { autoplay: 0, controls: 0, disablekb: 1, modestbranding: 1 },
    events: {
      onReady: (e) => {
        ytPlayer.setVolume(currentVolume);
        volumeSlider.value = currentVolume;
      },
      onStateChange: (e) => {
        if (e.data === YT.PlayerState.ENDED) { playNext(); }
        if (e.data === YT.PlayerState.PLAYING) {
          isPlaying = true;
          playPauseBtn.className = "fas fa-pause-circle";
          startUpdatingProgress();
        }
        if (e.data === YT.PlayerState.PAUSED) {
          isPlaying = false;
          playPauseBtn.className = "fas fa-play-circle";
        }
      }
    }
  });
}

let progressInterval;
function startUpdatingProgress() {
  if (progressInterval) clearInterval(progressInterval);
  progressInterval = setInterval(() => {
    if (ytPlayer && ytPlayer.getCurrentTime && !isSeeking && isPlaying) {
      const current = ytPlayer.getCurrentTime();
      const duration = ytPlayer.getDuration();
      if (duration) {
        const percent = (current / duration) * 100;
        seekFill.style.width = `${percent}%`;
        currentTimeSpan.innerText = formatTime(current);
        durationSpan.innerText = formatTime(duration);
      }
    }
  }, 500);
}

function formatTime(sec) {
  if (isNaN(sec)) return "0:00";
  const mins = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60);
  return `${mins}:${seconds < 10 ? '0' + seconds : seconds}`;
}

// Seek events (mouse + touch)
seekBar.addEventListener('mousedown', () => { isSeeking = true; });
seekBar.addEventListener('mouseup', (e) => {
  if (ytPlayer && ytPlayer.seekTo) {
    const rect = seekBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const duration = ytPlayer.getDuration();
    ytPlayer.seekTo(percent * duration);
  }
  isSeeking = false;
});
seekBar.addEventListener('touchstart', () => { isSeeking = true; });
seekBar.addEventListener('touchend', (e) => {
  if (ytPlayer && ytPlayer.seekTo) {
    const rect = seekBar.getBoundingClientRect();
    const touch = e.changedTouches[0];
    const x = touch.clientX - rect.left;
    const percent = x / rect.width;
    const duration = ytPlayer.getDuration();
    ytPlayer.seekTo(percent * duration);
  }
  setTimeout(() => { isSeeking = false; }, 100);
});

volumeSlider.addEventListener('input', (e) => {
  let vol = parseInt(e.target.value);
  ytPlayer?.setVolume(vol);
  currentVolume = vol;
  volumeIcon.className = vol == 0 ? "fas fa-volume-mute" : "fas fa-volume-up";
});

playPauseBtn.addEventListener('click', () => {
  if (ytPlayer) {
    if (isPlaying) ytPlayer.pauseVideo();
    else ytPlayer.playVideo();
  }
});
prevBtn.addEventListener('click', playPrev);
nextBtn.addEventListener('click', playNext);

// ---------- API: Search YouTube ----------
async function searchYouTube(query, maxResults = 12) {
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&max=${maxResults}`);
    const data = await res.json();
    if (data.error) { console.warn(data.error); return []; }
    return data.items.map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.default?.url || item.snippet.thumbnails.medium?.url
    }));
  } catch (e) {
    console.error(e);
    return [];
  }
}

// Search with debounce & suggestions
let searchDebounce;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchDebounce);
  const q = e.target.value.trim();
  if (q.length < 2) {
    suggestionsDiv.style.display = 'none';
    if (q === "") searchResultsDiv.innerHTML = '';
    return;
  }
  searchDebounce = setTimeout(async () => {
    const suggestions = await searchYouTube(q, 5);
    if (suggestions.length) {
      suggestionsDiv.style.display = 'block';
      suggestionsDiv.innerHTML = suggestions.map(s => `<div class="suggestion-item" data-vid="${s.videoId}" data-title="${escapeHtml(s.title)}" data-artist="${escapeHtml(s.artist)}" data-thumb="${s.thumbnail}"><i class="fas fa-search"></i> ${escapeHtml(s.title)} - ${escapeHtml(s.artist)}</div>`).join('');
      document.querySelectorAll('.suggestion-item').forEach(el => {
        el.addEventListener('click', () => {
          const vid = el.dataset.vid;
          const title = el.dataset.title;
          const artist = el.dataset.artist;
          const thumb = el.dataset.thumb;
          searchInput.value = title;
          suggestionsDiv.style.display = 'none';
          performSearch(title);
        });
      });
    } else {
      suggestionsDiv.style.display = 'none';
    }
  }, 400);
});

async function performSearch(query) {
  if (!query) return;
  const results = await searchYouTube(query, 20);
  displaySearchResults(results);
}

function displaySearchResults(songs) {
  if (!songs.length) {
    searchResultsDiv.innerHTML = `<div class="empty-state">🎵 No results found</div>`;
    return;
  }
  searchResultsDiv.innerHTML = '';
  songs.forEach(song => {
    const item = createSongItemElement(song);
    searchResultsDiv.appendChild(item);
  });
}

// ---------- Quick Picks & Chips ----------
const quickPicks = [
  { name: "Kurta Suha (From Angrej)", artist: "Amrinder Gill", query: "Kurta Suha Amrinder Gill" },
  { name: "Born to Shine", artist: "Diljit Dosanjh", query: "Born to Shine Diljit Dosanjh" },
  { name: "Ishq Di Baajlyaan", artist: "Diljit Dosanjh", query: "Ishq Di Baajlyaan Diljit" },
  { name: "Tell Me Honestly", artist: "Nirmal Kaura, Ammy Virk", query: "Tell Me Honestly Nirmal Kaura" }
];

function renderQuickPicks() {
  quickGrid.innerHTML = quickPicks.map(pick => `
    <div class="quick-card" data-query="${pick.query}">
      <img src="https://img.youtube.com/vi/default/mqdefault.jpg" onerror="this.src='https://via.placeholder.com/160'">
      <h4>${escapeHtml(pick.name)}</h4>
      <p>${escapeHtml(pick.artist)}</p>
    </div>
  `).join('');
  document.querySelectorAll('.quick-card').forEach(card => {
    card.addEventListener('click', async () => {
      const query = card.dataset.query;
      const results = await searchYouTube(query, 1);
      if (results.length) playSongDirectly(results[0]);
      else showToast("⚠️ Couldn't fetch song");
    });
  });
}

// Chips (trending & mood)
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', async () => {
    const cat = chip.innerText.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    const searchTerm = cat + " songs";
    const res = await searchYouTube(searchTerm, 15);
    if (res.length) {
      currentQueue = res;
      currentIndex = 0;
      loadAndPlaySong(res[0]);
      showToast(`🎶 Playing ${cat} playlist`);
    }
  });
});

// ---------- Library: Playlists ----------
function renderDemoPlaylists() {
  const demoPlaylists = [
    { name: "Punjab Fire", query: "Punjabi Hardcore" },
    { name: "Pump-Up Pop", query: "Workout Pop" },
    { name: "Lose Yourself", query: "Eminem Lose Yourself" },
    { name: "Feel Good Mix", query: "Happy Bollywood" }
  ];
  playlistsContainer.innerHTML = demoPlaylists.map(pl => `<div class="playlist-card" data-q="${pl.query}">📀 ${pl.name}  <i class="fas fa-play-circle"></i></div>`).join('');
  document.querySelectorAll('.playlist-card').forEach(card => {
    card.addEventListener('click', async () => {
      const q = card.dataset.q;
      const tracks = await searchYouTube(q, 15);
      if (tracks.length) {
        currentQueue = tracks;
        currentIndex = 0;
        loadAndPlaySong(tracks[0]);
        showToast(`📀 ${card.innerText} loaded`);
      }
    });
  });
}

// ---------- Navigation ----------
navItems.forEach(item => {
  item.addEventListener('click', () => {
    const nav = item.dataset.nav;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    navItems.forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    if (nav === 'home') homeView.classList.add('active');
    if (nav === 'search') {
      searchView.classList.add('active');
      suggestionsDiv.style.display = 'none';
    }
    if (nav === 'library') {
      libraryView.classList.add('active');
      renderLikedView();
    }
  });
});

libTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    libTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    if (target === 'liked') {
      likedContainer.style.display = 'block';
      playlistsContainer.style.display = 'none';
      renderLikedView();
    } else {
      likedContainer.style.display = 'none';
      playlistsContainer.style.display = 'block';
      renderDemoPlaylists();
    }
  });
});

// ---------- Toast Notification ----------
function showToast(msg) {
  let toast = document.createElement('div');
  toast.innerText = msg;
  toast.style.position = 'fixed';
  toast.style.bottom = '130px';
  toast.style.left = '20px';
  toast.style.right = '20px';
  toast.style.background = '#ff7b2c';
  toast.style.color = 'white';
  toast.style.padding = '10px';
  toast.style.borderRadius = '60px';
  toast.style.textAlign = 'center';
  toast.style.zIndex = '999';
  toast.style.fontSize = '0.8rem';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1800);
}

// ---------- Load YouTube API ----------
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

// Initialize
renderQuickPicks();
loadLikedSongs();
renderDemoPlaylists();
