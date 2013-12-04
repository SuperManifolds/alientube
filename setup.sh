#!/bin/bash

files=("jquery-1.9.1.min.js" "purl.js" "raven.min.js" "snuownd.js" "underscore-min.js" "script.js")

for i in "${files[@]}"
do
    ln ./lib/$i ./Chrome/js/$i
    ln ./lib/$i ./Safari.safariextension/js/$i
    ln ./lib/$i ./Firefox/data/$i
done