#!/bin/bash
echo Removing old files
rm -rf Chrome/TypeScript
rm -rf Safari.safariextension/TypeScript
rm -rf Firefox/data/TypeScript

rm -f Chrome/js/script.js.map
rm -f Safari.safariextension/js/script.js.map
rm -f Firefox/data/script.js.map

rm -f Chrome/js/options.js.map
rm -f Safari.safariextension/js/options.js.map
rm -f Firefox/data/options.js.map

rm -f lib/script.js.map
rm -f lib/options.js.map

rm -f Chrome/res/style.css.map
rm -f Safari.safariextension/res/style.css.map
rm -f Firefox/data/style.css.map
echo
echo

echo Compiling SASS style files.
sass res/style.scss res/style.css
sass res/options.scss res/options.css
echo
echo


echo Copying Chrome Resources
mkdir -p Chrome/res
mkdir -p Chrome/js
cp -fr res/redditbroken.svg Chrome/res
cp -fr res/redditoverload.svg Chrome/res
cp -fr res/redditblocked.svg Chrome/res
cp -fr res/icon128.png Chrome/res
cp -fr res/options.css Chrome/res
cp -fr lib/snuownd.js Chrome/js

echo Copying Safari Resources
mkdir -p Safari.safariextension/res
mkdir -p Safari.safariextension/js
cp -fr res/redditbroken.svg Safari.safariextension/res
cp -fr res/redditoverload.svg Safari.safariextension/res
cp -fr res/redditblocked.svg Safari.safariextension/res
cp -fr res/icon128.png Safari.safariextension/res
cp -fr res/options.css Safari.safariextension/res
cp -fr lib/snuownd.js Safari.safariextension/js

echo Copying Firefox Resources
mkdir -p Firefox/data
cp -fr res/redditbroken.svg Firefox/data
cp -fr res/redditoverload.svg Firefox/data
cp -fr res/redditblocked.svg Firefox/data
cp -fr res/icon128.png Firefox/data
cp -fr res/options.css Firefox/data
cp -fr lib/snuownd.js Firefox/data
cp -fr lib/handlebars-v3.0.0.js Firefox/data
echo

echo Updating Options HTML Page
cp options.html Chrome/res/options.html
cp options.html Firefox/data/options.html
cp options.html Safari.safariextension/res/options.html
echo


echo Compiling TypeScript Files.
if [ "$1" == "--debug" ]; then
    tsc --target ES5 --out lib/options.js TypeScript/Options/Options.ts --removeComments --sourcemap
    tsc --target ES5 --out lib/script.js TypeScript/index.ts --removeComments --sourcemap
else
    tsc --target ES5 --out lib/options.js TypeScript/Options/Options.ts
    tsc --target ES5 --out lib/script.js TypeScript/index.ts
fi

echo
echo
    
echo Copying TypeScript Files
cp lib/options.js Chrome/res/options.js
cp lib/options.js Firefox/data/options.js
cp lib/options.js Safari.safariextension/res/options.js
cp lib/script.js Chrome/js/script.js
cp lib/script.js Safari.safariextension/js/script.js
cp lib/script.js Firefox/data/script.js
echo
echo

echo Copying Chrome Style Files
cp res/style.css Chrome/res/style.css
echo Copying Safari Style Files
cp res/style.css Safari.safariextension/res/style.css
echo Copying Firefox Style Files
cp res/style.css Firefox/data/style.css
echo

echo Copying Chrome Template Files
cp res/templates.html Chrome/res/templates.html
echo Copying Safari Template Files
cp res/templates.html Safari.safariextension/res/templates.html
echo Copying Firefox Template Files
cp res/templates.html Firefox/data/templates.html
echo
echo

if [ "$1" == "--debug" ]; then
    echo Copying Development Sourcemaps
    cp lib/script.js.map Chrome/js/script.js.map
    cp lib/options.js.map Chrome/js/options.js.map
    cp lib/script.js.map Safari.safariextension/js/script.js.map
    cp lib/options.js.map Safari.safariextension/js/options.js.map
    cp lib/script.js.map Firefox/data/script.js.map
    cp lib/options.js.map Firefox/data/options.js.map
    
    cp res/style.css.map Chrome/res/style.css.map
    cp res/style.css.map Safari.safariextension/res/style.css.map
    cp res/style.css.map Firefox/data/style.css.map
    
    cp -fr TypeScript Chrome/
    cp -fr TypeScript Safari.safariextension/
    cp -fr TypeScript Firefox/data/TypeScript
    echo
    echo
fi

echo Copying Localisation Files
cp -fr _locales Chrome/
cp -fr _locales Safari.safariextension/
cp -fr _locales Firefox/data/
echo
