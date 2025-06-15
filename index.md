---
layout: default
title: "My Digital Library"
---

<nav>
  <a href="/search.md">Search Books</a>
</nav>

# 📚 My Digital Library

Explore by genre:

{% comment %}
  Grab all PDF static files from any folder.
{% endcomment %}
{% assign pdfs = site.static_files | where: "extname", ".pdf" %}

{% comment %}
  Extract genres (folder names under /Books/GENRE/...)
{% endcomment %}
{% assign genre_paths = pdfs | map: "path" %}
{% assign genres = "" | split: "#" %}
{% for p in genre_paths %}
  {% assign parts = p | split: "/" %}
  {% if parts[1] == "Books" %}
    {% assign genres = genres | push: parts[2] %}
  {% endif %}
{% endfor %}
{% assign genres = genres | uniq | sort %}

<ul>
{% for genre in genres %}
  <li><strong>{{ genre }}</strong>
    <ul>
      {% for f in pdfs %}
        {% assign parts = f.path | split: "/" %}
        {% if parts[1] == "Books" and parts[2] == genre %}
          <li><a href="{{ f.path | relative_url }}">{{ f.basename }}</a></li>
        {% endif %}
      {% endfor %}
    </ul>
  </li>
{% endfor %}
</ul>
