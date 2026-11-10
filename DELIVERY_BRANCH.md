# Split delivery experiment

This branch serves v1.9.82-split through GitHub Pages: one index.html with same-origin, content-addressed data and image resources. Clinical content, application packet, cat renderer and Q92 images match main v1.9.82.

The main branch retains the complete standalone HTML delivery. Repository default branch stays main; Pages source is codex/split-assets at /.

The entry is 194,597 bytes (about 49 KB with HTTP gzip). Fully downloading all offline resources still takes about 2.5 MB. Resource integrity is checked, failed foreground downloads can retry, and offline updates retain the previous working cache until every resource is verified.

Build from the verified standalone artifact with the author-source optional command python work/split_delivery.py. Do not overwrite the normal standalone build pipeline.

To roll back hosting, switch GitHub Settings > Pages > Branch to main at /. No merge or force push is required.
