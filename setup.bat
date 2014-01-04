lfiles=( jquery-1.9.1.min.js mustache.js purl.js snuownd.js underscore-min.js script.js )
rfiles=( style.css error.png overload.png gplus.png duck.png templates.mustache strings.json)

for file in ${lfiles[@]}
do
    mklink /j Chrome\js\$file lib\$file 
    mklink /j Safari.safariextension\js\$file lib\$file
    mklink /j Firefox\data\$file lib\$file
done

for file in ${rfiles[@]}
do
    mklink /j Chrome\res\$file res\$file 
    mklink /j Safari.safariextension\res\$file res\$file
    mklink /j Firefox\data\$file res\$file
done