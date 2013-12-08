#!/bin/bash

lfiles=("jquery-1.9.1.min.js" "purl.js" "snuownd.js" "underscore-min.js" "script.js")
rfiles=("style.css" "error.png" "strings.json")

mkdir ./Chrome/js/
mkdir ./Safari.safariextension/js/
mkdir ./Firefox/data/
mkdir ./Chrome/res/
mkdir ./Safari.safariextension/res/

for i in "${lfiles[@]}"
do
    ln ./lib/$i ./Chrome/js/$i
    ln ./lib/$i ./Safari.safariextension/js/$i
    ln ./lib/$i ./Firefox/data/$i
done


for i in "${rfiles[@]}"
do
    ln ./res/$i ./Chrome/res/$i
    ln ./res/$i ./Safari.safariextension/res/$i
    ln ./res/$i ./Firefox/data/$i
done