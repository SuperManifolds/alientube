#!/bin/bash

sass res/style.scss res/style.css


if [ "$1" == "--init" ]; then
    mkdir -p Chrome/res
    mkdir -p Chrome/js
    mkdir -p Safari.safariextension/res
    mkdir -p Safari.safariextension/js
    mkdir -p Firefox/data

    cp -fr res/redditbroken.svg Chrome/res
    cp -fr res/redditoverload.svg Chrome/res
    cp -fr lib/snuownd.js Chrome/js

    cp -fr res/redditbroken.svg Safari.safariextension/res
    cp -fr res/redditoverload.svg Safari.safariextension/res
    cp -fr lib/snuownd.js Safari.safariextension/js


    cp -fr res/redditbroken.svg Firefox/data
    cp -fr res/redditoverload.svg Firefox/data
    cp -fr lib/snuownd.js Firefox/data
fi

cp res/style.css Chrome/res/style.css
cp res/style.css Safari.safariextension/res/style.css
cp res/style.css Firefox/data/style.css

cp res/templates.html Chrome/res/templates.html
cp res/templates.html Safari.safariextension/res/templates.html
cp res/templates.html Firefox/data/templates.html


tsc --target ES5 --out lib/script.js TypeScript/index.ts --removeComments --declaration --sourcemap

cp lib/script.js Chrome/js/script.js
cp lib/script.js.map Chrome/js/script.js.map

cp lib/script.js Safari.safariextension/js/script.js
cp lib/script.js Safari.safariextension/js/script.js.map

cp lib/script.js Firefox/data/script.js
cp lib/script.js Firefox/data/script.map

cp -fr TypeScript Chrome/
cp -fr TypeScript Safari.safariextension/
cp -fr TypeScript Firefox/data

cp -fr _locales Chrome/
cp -fr _locales Safari.safariextension/
cp -fr _locales Firefox/data/

osascript reloadExtension.scpt
