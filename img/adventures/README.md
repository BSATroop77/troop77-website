# Adventure photos

The Adventures page reads `data/adventures.json`. Each entry is `{ "name", "image", "description"? }`. `description` is optional and stays hidden until you add one.

To use a real photo, save it at the `image` path already listed for that adventure, for example `img/adventures/kayaking.jpg`. The page shows a navy and gold placeholder until that file exists. Replacing the file is enough; you do not need to change the page.

To add an adventure, append an object to the `adventures` array. The page shows entries in that order. Name the photo after the adventure, using lowercase words separated by hyphens, and point `image` at `img/adventures/<that-name>.jpg`.
