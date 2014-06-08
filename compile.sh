#!/bin/bash

sass res/style.scss res/style.css

cp res/style.css Chrome/res/style.css
cp res/style.css Safari.safariextension/res/style.css
cp res/style.css Firefox/data/style.css

tsc --out js/script.js TypeScript/Main.ts
cp js/script.js Chrome/js/script.js
cp js/script.js Safari.safariextension/js/script.js
cp js/script.js Firefox/data/script.js
afplay /System/Library/Sounds/Glass.aiff
