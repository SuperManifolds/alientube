#!/bin/bash

sass res/style.scss res/style.css

cp res/style.css Chrome/res/style.css
cp res/style.css Safari.safariextension/res/style.css
cp res/style.css Firefox/data/style.css

cp res/templates.html Chrome/res/templates.html

tsc --out lib/script.js TypeScript/index.ts --removeComments --declaration --sourcemap
cp js/script.js Chrome/js/script.js
cp lib/script.js.map Chrome/js/script.js.map
cp lib/script.js Safari.safariextension/js/script.js
cp lib/script.js Firefox/data/script.js

cp -fr TypeScript Chrome/

afplay /System/Library/Sounds/Glass.aiff
