---
layout: default
title: Debug Static Files
---

# Debug: Static Files in This Site

{% for f in site.static_files %}
* `{{ f.path }}` – `{{ f.extname }}`
{% endfor %}
