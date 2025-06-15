---
layout: default
title: Search
permalink: /search.html
---

<form action="/search.html" method="get" class="search-form">
  <input type="text" name="query" placeholder="Search books..." />
  <button type="submit">Search</button>
</form>

<ul id="search-results"></ul>

<script>
window.store = {
{% assign pdfs = site.static_files | where: "extname", ".pdf" %}
{% for f in pdfs %}
  "{{ f.path }}": {
    "title": "{{ f.basename | xml_escape }}",
    "url": "{{ f.path | relative_url }}",
    "genre": "{{ f.path | split:'/' | slice:2 | first | xml_escape }}",
    "content": ""
  }{% unless forloop.last %},{% endunless %}
{% endfor %}
};
</script>

<script src="https://unpkg.com/lunr/lunr.js"></script>
<script src="/assets/js/search.js"></script>
