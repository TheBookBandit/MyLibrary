(function(){
  const query = new URLSearchParams(window.location.search).get('query');
  if (!query) return;  // No query? Skip indexing/search

  const idx = lunr(function(){
    this.ref('url');
    this.field('title', { boost: 10 });
    this.field('genre', { boost: 5 });

    for (const key in window.store) {
      const doc = window.store[key];
      this.add({
        url: key,
        title: doc.title,
        genre: doc.genre
      });
    }
  });

  const results = idx.search(query);
  const container = document.getElementById('search-results');
  if (results.length) {
    results.forEach(r => {
      const item = window.store[r.ref];
      const li = document.createElement('li');
      li.innerHTML = `<a href="${item.url}">${item.title}</a> <em>(${item.genre})</em>`;
      container.appendChild(li);
    });
  } else {
    container.innerHTML = '<li>No results found.</li>';
  }
})();
