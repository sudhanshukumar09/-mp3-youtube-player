async function searchSongs() {
  const query = document.getElementById("searchInput").value;

  const res = await fetch(`/api/search?q=${query}`);
  const data = await res.json();

  const results = document.getElementById("results");
  results.innerHTML = "";

  data.forEach(song => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <img src="${song.image}" width="100">
      <p>${song.title}</p>
      <button onclick="playSong('${song.audio}', '${song.image}', '${song.title}')">
        Play
      </button>
    `;

    results.appendChild(div);
  });
}

function playSong(audio, image, title) {
  document.getElementById("audio").src = audio;
  document.getElementById("cover").src = image;
  document.getElementById("title").innerText = title;
}
